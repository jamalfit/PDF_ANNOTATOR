from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime

class TextChunk(Base):
    __tablename__ = "text_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"))
    chunk_text = Column(Text, nullable=False)
    embedding = Column('embedding', Text)
    chunk_metadata = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="text_chunks")
    section = relationship("Section", back_populates="text_chunks") 