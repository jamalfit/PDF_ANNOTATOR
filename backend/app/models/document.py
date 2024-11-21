from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(Text, nullable=False)
    authors = Column(Text)
    publication_date = Column(Date)
    doi = Column(Text, unique=True)
    pdf_s3_url = Column(Text)
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="SET NULL"))
    status_id = Column(Integer, ForeignKey("document_statuses.id"), nullable=False)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    document_type = relationship("DocumentType")
    status = relationship("DocumentStatus")
    sections = relationship("Section", back_populates="document", cascade="all, delete-orphan")
    text_chunks = relationship("TextChunk", back_populates="document", cascade="all, delete-orphan")
  