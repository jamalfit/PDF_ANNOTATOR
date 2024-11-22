from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db
from app.models.article_queue import ArticleQueue
from app.schemas.article_queue import (
    ArticleBase,
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse
)

router = APIRouter()

@router.get("/", response_model=List[ArticleResponse])
async def get_articles(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get all articles"""
    articles = db.query(ArticleQueue).offset(skip).limit(limit).all()
    return articles

@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Get a single article by ID"""
    article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.post("/test-data")
async def add_test_data(db: Session = Depends(get_db)):
    """Add a single test article"""
    try:
        test_article = ArticleQueue(
            doi="10.1234/test1",
            title="Test Article 1",
            authors="Test Author",
            journal="Test Journal",
            status="pending"
        )
        
        db.add(test_article)
        db.commit()
        
        return {"message": "Added test article successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding test data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error adding test data: {str(e)}"
        )

@router.put("/{article_id}/annotations")
def update_annotations(
    article_id: int, 
    annotation_data: dict,
    db: Session = Depends(get_db)
):
    """Update article annotations"""
    article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    try:
        article.annotation_data = annotation_data
        db.commit()
        return {"message": "Annotations updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))