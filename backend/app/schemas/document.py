from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DocumentBase(BaseModel):
    title: str
    authors: Optional[str] = None
    doi: Optional[str] = None

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(DocumentBase):
    title: Optional[str] = None
    authors: Optional[str] = None
    doi: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    status_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DocumentStatusUpdate(BaseModel):
    status_id: int

class DocumentStats(BaseModel):
    total_documents: int
    processed_documents: int
    failed_documents: int
    success_rate: float 