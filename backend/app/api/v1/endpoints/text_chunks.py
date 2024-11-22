from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db
from app.schemas.text_chunk import TextChunkCreate, TextChunkUpdate, TextChunkResponse
from app.models.text_chunk import TextChunk

router = APIRouter()

@router.put("/{chunk_id}", response_model=TextChunkResponse)
async def update_chunk(
    chunk_id: int,
    chunk: TextChunkUpdate,
    db: Session = Depends(get_db)
):
    """Update chunk content"""
    db_chunk = db.query(TextChunk).filter(TextChunk.id == chunk_id).first()
    if not db_chunk:
        raise HTTPException(status_code=404, detail="Text chunk not found")
    
    for field, value in chunk.dict(exclude_unset=True).items():
        setattr(db_chunk, field, value)
    
    db.commit()
    db.refresh(db_chunk)
    return db_chunk

@router.get("/search")
async def search_chunks(
    query: str,
    db: Session = Depends(get_db)
):
    """Search through chunks"""
    chunks = db.query(TextChunk).filter(TextChunk.content.ilike(f"%{query}%")).all()
    return chunks

@router.delete("/{chunk_id}")
async def delete_chunk(
    chunk_id: int,
    db: Session = Depends(get_db)
):
    """Delete specific chunk"""
    db_chunk = db.query(TextChunk).filter(TextChunk.id == chunk_id).first()
    if not db_chunk:
        raise HTTPException(status_code=404, detail="Text chunk not found")
    
    db.delete(db_chunk)
    db.commit()
    return {"message": "Text chunk deleted successfully"} 