from fastapi import APIRouter, HTTPException, Depends, Security
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.db.session import get_db
from app.models.document import Document
from app.models.section import Section
from app.models.text_chunk import TextChunk
from app.core.security import get_api_key
from app.core.s3 import S3Client
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentResponse,
    DocumentStatusUpdate,
    DocumentStats
)

router = APIRouter()
s3_client = S3Client()

# Pydantic model for document creation
class DocumentCreate(BaseModel):
    title: str
    authors: Optional[str] = None
    doi: Optional[str] = None
    pdf_s3_url: Optional[str] = None
    status_id: int = 1  # Default status

@router.get("/", response_model=List[dict])
async def get_documents(
    skip: int = 0,
    limit: int = 10,
    status_id: Optional[int] = None,
    db: Session = Depends(get_db),
    api_key: str = Security(get_api_key)
):
    """Get a list of documents with pagination"""
    query = db.query(Document)
    
    if status_id:
        query = query.filter(Document.status_id == status_id)
    
    if limit > 100:
        limit = 100
    
    documents = query.order_by(desc(Document.created_at)).offset(skip).limit(limit).all()
    
    return [{
        "id": doc.id,
        "title": doc.title,
        "authors": doc.authors,
        "doi": doc.doi,
        "status_id": doc.status_id,
        "created_at": doc.created_at.isoformat() if doc.created_at else None
    } for doc in documents]

@router.get("/{document_id}")
async def get_document(document_id: int, db: Session = Depends(get_db)):
    """Get a specific document by ID"""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document.id,
        "title": document.title,
        "authors": document.authors,
        "doi": document.doi,
        "pdf_s3_url": document.pdf_s3_url,
        "status_id": document.status_id,
        "created_at": document.created_at.isoformat() if document.created_at else None,
        "updated_at": document.updated_at.isoformat() if document.updated_at else None
    }

@router.get("/documents/search/")
async def search_documents(
    query: str,
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Search documents by title or DOI"""
    documents = db.query(Document).filter(
        (Document.title.ilike(f"%{query}%")) |
        (Document.doi.ilike(f"%{query}%"))
    ).limit(limit).all()
    
    return [{
        "id": doc.id,
        "title": doc.title,
        "authors": doc.authors,
        "doi": doc.doi,
        "status_id": doc.status_id
    } for doc in documents]

@router.get("/{document_id}/sections")
async def get_document_sections(document_id: int, db: Session = Depends(get_db)):
    """Get all sections for a specific document"""
    sections = db.query(Section).filter(Section.document_id == document_id).all()
    
    return [{
        "id": section.id,
        "section_type_id": section.section_type_id,
        "text": section.text,
        "page_num": section.page_num,
        "coordinates": section.coordinates,
        "rect": section.rect
    } for section in sections]

@router.get("/{document_id}/text_chunks")
async def get_document_text_chunks(
    document_id: int,
    limit: int = 10,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """Get text chunks for a specific document"""
    chunks = db.query(TextChunk).filter(
        TextChunk.document_id == document_id
    ).offset(skip).limit(limit).all()
    
    return [{
        "id": chunk.id,
        "chunk_text": chunk.chunk_text,
        "chunk_metadata": chunk.chunk_metadata,
        "created_at": chunk.created_at.isoformat() if chunk.created_at else None
    } for chunk in chunks]

# Add document endpoint
@router.post("/", response_model=dict)
async def create_document(
    document: DocumentCreate,
    db: Session = Depends(get_db),
    api_key: str = Security(get_api_key)
):
    """Create a new document"""
    try:
        # Check if document with same DOI exists
        if document.doi:
            existing_doc = db.query(Document).filter(
                Document.doi == document.doi
            ).first()
            
            if existing_doc:
                raise HTTPException(
                    status_code=400,
                    detail="Document with this DOI already exists"
                )
        
        # Create new document
        db_document = Document(
            title=document.title,
            authors=document.authors,
            doi=document.doi,
            pdf_s3_url=document.pdf_s3_url,
            status_id=document.status_id,
            created_at=datetime.utcnow()
        )
        
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        return {
            "id": db_document.id,
            "title": db_document.title,
            "authors": db_document.authors,
            "doi": db_document.doi,
            "status_id": db_document.status_id,
            "created_at": db_document.created_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating document: {str(e)}"
        )

# Delete document endpoint
@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    api_key: str = Security(get_api_key)
):
    """Delete a document and its associated files"""
    try:
        # Find the document
        document = db.query(Document).filter(
            Document.id == document_id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )
        
        # Delete associated PDF from S3 if it exists
        if document.pdf_s3_url:
            try:
                # Extract S3 key from URL
                s3_key = document.pdf_s3_url.split('/')[-1]
                await s3_client.delete_pdf(s3_key)
            except Exception as e:
                logger.warning(f"Error deleting PDF from S3: {str(e)}")
        
        # Delete associated sections and text chunks (if cascade is not set up)
        for section in document.sections:
            db.delete(section)
        
        for chunk in document.text_chunks:
            db.delete(chunk)
        
        # Delete the document
        db.delete(document)
        db.commit()
        
        return {
            "message": f"Document {document_id} and all associated data successfully deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting document: {str(e)}"
        ) 

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document: DocumentUpdate,
    db: Session = Depends(get_db)
):
    """Update document metadata"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    for field, value in document.dict(exclude_unset=True).items():
        setattr(db_document, field, value)
    
    db.commit()
    db.refresh(db_document)
    return db_document

@router.patch("/{document_id}/status", response_model=DocumentResponse)
async def update_document_status(
    document_id: int,
    status: DocumentStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update document status"""
    db_document = db.query(Document).filter(Document.id == document_id).first()
    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db_document.status_id = status.status_id
    db.commit()
    db.refresh(db_document)
    return db_document

@router.get("/stats", response_model=DocumentStats)
async def get_document_stats(db: Session = Depends(get_db)):
    """Get processing statistics"""
    total = db.query(Document).count()
    processed = db.query(Document).filter(Document.status_id == 2).count()
    failed = db.query(Document).filter(Document.status_id == 3).count()
    
    return {
        "total_documents": total,
        "processed_documents": processed,
        "failed_documents": failed,
        "success_rate": (processed / total * 100) if total > 0 else 0
    }

@router.post("/batch", response_model=List[DocumentResponse])
async def create_documents_batch(
    documents: List[DocumentCreate],
    db: Session = Depends(get_db)
):
    """Batch document creation"""
    db_documents = []
    for doc in documents:
        db_document = Document(**doc.dict())
        db.add(db_document)
        db_documents.append(db_document)
    
    try:
        db.commit()
        for doc in db_documents:
            db.refresh(doc)
        return db_documents
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) 