from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.models.document_type import DocumentType
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    authors = Column(Text)
    publication_date = Column(Date)
    doi = Column(Text, unique=True)
    pdf_s3_url = Column(Text)
    document_type_id = Column(Integer, ForeignKey("document_types.id"))
    status_id = Column(Integer, ForeignKey("document_statuses.id"), nullable=False)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    document_type = relationship("DocumentType", back_populates="documents")
    status = relationship("DocumentStatus")
    sections = relationship("Section", back_populates="document", cascade="all, delete-orphan")
    text_chunks = relationship("TextChunk", back_populates="document", cascade="all, delete-orphan")
  
class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    doi: Optional[str] = None
    status_id: Optional[int] = None

class DocumentStatusUpdate(BaseModel):
    status_id: int

class DocumentStats(BaseModel):
    total_documents: int
    processed_documents: int
    failed_documents: int
    success_rate: float

class DocumentResponse(BaseModel):
    id: int
    title: str
    authors: Optional[str]
    doi: Optional[str]
    status_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
  