from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TextChunkBase(BaseModel):
    content: str
    document_id: int
    section_id: Optional[int] = None

class TextChunkCreate(TextChunkBase):
    pass

class TextChunkUpdate(BaseModel):
    content: Optional[str] = None

class TextChunkResponse(TextChunkBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True 