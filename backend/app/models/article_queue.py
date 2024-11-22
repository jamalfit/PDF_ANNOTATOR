from sqlalchemy import Column, Integer, String, Date, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.db.base_class import Base

class ArticleQueue(Base):
    __tablename__ = "article_queue"

    id = Column(Integer, primary_key=True, index=True)
    doi = Column(String, unique=True, index=True)
    title = Column(String)
    authors = Column(String, nullable=True)
    journal = Column(String, nullable=True)
    publication_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")
    pdf_s3_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    annotation_data = Column(JSON, nullable=True)
 