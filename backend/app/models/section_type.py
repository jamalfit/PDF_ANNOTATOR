from sqlalchemy import Column, Integer, String, DateTime
from app.models.base import Base
from datetime import datetime

class SectionType(Base):
    __tablename__ = "section_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 