from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

class ArticleBase(BaseModel):
    doi: str
    title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_date: Optional[date] = None
    description: Optional[str] = None
    priority: int = Field(default=0)
    status: str = Field(default="pending")

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_date: Optional[date] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None

class ArticlePriorityUpdate(BaseModel):
    priority: int

class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ArticleQueueStats(BaseModel):
    total_articles: int
    pending_articles: int
    processing_articles: int
    completed_articles: int
    failed_articles: int 