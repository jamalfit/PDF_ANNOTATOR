from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.db.session import get_db
from app.models.document import Document
from app.models.section import Section
from app.models.text_chunk import TextChunk

router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_documents(
    skip: int = 0,
    limit: int = 10,
    status_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get a list of documents with pagination"""
    query = db.query(Document)
    
    if status_id:
        query = query.filter(Document.status_id == status_id)
    
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