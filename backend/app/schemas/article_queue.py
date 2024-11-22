from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class ArticleBase(BaseModel):
    doi: str
    title: str
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_date: Optional[date] = None
    description: Optional[str] = None
    status: str = "pending"
    pdf_s3_key: Optional[str] = None

class ArticleCreate(ArticleBase):
    pass

class ArticleUpdate(BaseModel):
    doi: Optional[str] = None
    title: Optional[str] = None
    authors: Optional[str] = None
    journal: Optional[str] = None
    publication_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None
    pdf_s3_key: Optional[str] = None

class ArticleResponse(ArticleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    annotation_data: Optional[dict] = None

    class Config:
        from_attributes = True

class ArticleQueueStats(BaseModel):
    total: int
    pending: int
    completed: int
    failed: int

    class Config:
        from_attributes = True