from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Date
from app.models.base import Base
from datetime import datetime

class ArticleQueue(Base):
    __tablename__ = "article_queue"

    id = Column(Integer, primary_key=True, index=True)
    doi = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(Text)
    authors = Column(Text)
    journal = Column(Text)
    publication_date = Column(Date)
    pdf_s3_key = Column(String(255))
    description = Column(Text)
    status = Column(String(50), index=True, default="Downloaded")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    annotation_data = Column(JSON)
    annotation_notes = Column(Text)
    annotation_status = Column(String, nullable=False, default="None") 