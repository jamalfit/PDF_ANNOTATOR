from fastapi import APIRouter, UploadFile, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.s3 import S3Client
from app.db.session import get_db
from app.models import PDF
from app.core.config import settings

router = APIRouter()
s3_client = S3Client()

@router.post("/upload/")
async def upload_pdf(
    file: UploadFile,
    db: Session = Depends(get_db)
) -> dict:
    # Add file size check
    file_size = 0
    file_content = await file.read()
    if len(file_content) > settings.MAX_FILE_SIZE:  # Add to Settings
        raise HTTPException(status_code=413, detail="File too large")
    
    try:
        # Upload to S3 with content type verification
        content_type = file.content_type
        if content_type != 'application/pdf':
            raise HTTPException(status_code=400, detail="Invalid file type")
            
        s3_key = await s3_client.upload_pdf(file_content)
        
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