from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.core.deps import get_db
from app.schemas.article_queue import (
    ArticleCreate, 
    ArticleUpdate, 
    ArticleResponse, 
    ArticleQueueStats,
    ArticlePriorityUpdate
)
from app.models.article_queue import ArticleQueue

router = APIRouter()

@router.get("/", response_model=List[ArticleResponse])
async def get_articles(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all articles with optional filtering"""
    query = db.query(ArticleQueue)
    if status:
        query = query.filter(ArticleQueue.status == status)
    return query.offset(skip).limit(limit).all()

@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Get specific article by ID"""
    article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article

@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    article: ArticleUpdate,
    db: Session = Depends(get_db)
):
    """Update article details"""
    db_article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    for field, value in article.dict(exclude_unset=True).items():
        setattr(db_article, field, value)
    
    db_article.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_article)
    return db_article

@router.delete("/{article_id}")
async def delete_article(
    article_id: int,
    db: Session = Depends(get_db)
):
    """Delete article from queue"""
    db_article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db.delete(db_article)
    db.commit()
    return {"message": "Article deleted successfully"}

@router.get("/queue/next", response_model=ArticleResponse)
async def get_next_article(
    db: Session = Depends(get_db)
):
    """Get next article in queue for processing"""
    article = db.query(ArticleQueue)\
        .filter(ArticleQueue.status == "pending")\
        .order_by(ArticleQueue.priority.desc(), ArticleQueue.created_at.asc())\
        .first()
    if not article:
        raise HTTPException(status_code=404, detail="No articles in queue")
    return article

@router.post("/queue/reorder")
async def reorder_queue(
    article_ids: List[int],
    db: Session = Depends(get_db)
):
    """Reorder queue based on provided article IDs"""
    for idx, article_id in enumerate(article_ids):
        db_article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
        if db_article:
            db_article.priority = len(article_ids) - idx
    
    db.commit()
    return {"message": "Queue reordered successfully"}

@router.get("/queue/status", response_model=ArticleQueueStats)
async def get_queue_stats(
    db: Session = Depends(get_db)
):
    """Get queue statistics"""
    total = db.query(ArticleQueue).count()
    pending = db.query(ArticleQueue).filter(ArticleQueue.status == "pending").count()
    processing = db.query(ArticleQueue).filter(ArticleQueue.status == "processing").count()
    completed = db.query(ArticleQueue).filter(ArticleQueue.status == "completed").count()
    failed = db.query(ArticleQueue).filter(ArticleQueue.status == "failed").count()
    
    return {
        "total_articles": total,
        "pending_articles": pending,
        "processing_articles": processing,
        "completed_articles": completed,
        "failed_articles": failed
    }

@router.patch("/{article_id}/priority", response_model=ArticleResponse)
async def update_priority(
    article_id: int,
    priority_update: ArticlePriorityUpdate,
    db: Session = Depends(get_db)
):
    """Update article priority"""
    db_article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not db_article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    db_article.priority = priority_update.priority
    db.commit()
    db.refresh(db_article)
    return db_article

@router.post("/batch", response_model=List[ArticleResponse])
async def create_articles_batch(
    articles: List[ArticleCreate],
    db: Session = Depends(get_db)
):
    """Batch create articles"""
    db_articles = []
    for article in articles:
        db_article = ArticleQueue(**article.dict())
        db.add(db_article)
        db_articles.append(db_article)
    
    try:
        db.commit()
        for article in db_articles:
            db.refresh(article)
        return db_articles
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))