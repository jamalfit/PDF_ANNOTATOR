from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class DocumentBase(BaseModel):
    title: str
    authors: Optional[str] = None
    doi: Optional[str] = None

class Document(DocumentBase):
    id: int
    status_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class PDFResponse(BaseModel):
    id: int
    filename: str
    s3_key: str
    status: str
