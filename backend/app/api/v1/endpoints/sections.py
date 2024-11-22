from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.deps import get_db
from app.schemas.section import SectionCreate, SectionUpdate, SectionResponse
from app.models.section import Section

router = APIRouter()

@router.put("/{section_id}", response_model=SectionResponse)
async def update_section(
    section_id: int,
    section: SectionUpdate,
    db: Session = Depends(get_db)
):
    """Update section content"""
    db_section = db.query(Section).filter(Section.id == section_id).first()
    if not db_section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    for field, value in section.dict(exclude_unset=True).items():
        setattr(db_section, field, value)
    
    db.commit()
    db.refresh(db_section)
    return db_section

@router.post("/batch", response_model=List[SectionResponse])
async def create_sections_batch(
    sections: List[SectionCreate],
    db: Session = Depends(get_db)
):
    """Batch create sections"""
    db_sections = []
    for section in sections:
        db_section = Section(**section.dict())
        db.add(db_section)
        db_sections.append(db_section)
    
    try:
        db.commit()
        for section in db_sections:
            db.refresh(section)
        return db_sections
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{section_id}")
async def delete_section(
    section_id: int,
    db: Session = Depends(get_db)
):
    """Delete specific section"""
    db_section = db.query(Section).filter(Section.id == section_id).first()
    if not db_section:
        raise HTTPException(status_code=404, detail="Section not found")
    
    db.delete(db_section)
    db.commit()
    return {"message": "Section deleted successfully"}

@router.get("/types")
async def get_section_types(db: Session = Depends(get_db)):
    """Get all section types"""
    types = db.query(SectionType).all()
    return types 