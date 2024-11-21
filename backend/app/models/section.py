from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from datetime import datetime

class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"))
    section_type_id = Column(Integer, ForeignKey("section_types.id", ondelete="SET NULL"))
    text = Column(Text, nullable=False)
    page_num = Column(Integer)
    coordinates = Column(JSON)
    rect = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="sections")
    section_type = relationship("SectionType")
    text_chunks = relationship("TextChunk", back_populates="section", cascade="all, delete-orphan")