from fastapi import APIRouter, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.s3 import S3Client
from app.db.session import get_db
from app.models.pdf import PDF

router = APIRouter()
s3_client = S3Client()

@router.post("/upload/")
async def upload_pdf(
    file: UploadFile,
    db: Session = Depends(get_db)
) -> dict:
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Upload to S3
        s3_key = await s3_client.upload_pdf(file)
        
        # Store metadata in database
        pdf = PDF(
            filename=file.filename,
            s3_key=s3_key,
            status="uploaded"
        )
        db.add(pdf)
        db.commit()
        db.refresh(pdf)
        
        return {
            "id": pdf.id,
            "filename": pdf.filename,
            "s3_key": pdf.s3_key,
            "status": pdf.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 