from fastapi import APIRouter, HTTPException, Depends, Response, Query
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session
import io
from app.db.session import get_db
from app.models.article_queue import ArticleQueue
from app.core.s3 import S3Client
import logging
from typing import List, Optional
from sqlalchemy import desc

# Create the router
router = APIRouter()
logger = logging.getLogger(__name__)
s3_client = S3Client()

# Get all articles
@router.get("/", response_model=List[dict])
async def get_queue_items(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=10, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^[a-zA-Z0-9_-]+$"),
    db: Session = Depends(get_db)
):
    """Get articles from the queue with optional status filter"""
    try:
        query = db.query(ArticleQueue)
        if status:
            query = query.filter(ArticleQueue.status == status)
        
        articles = query.order_by(desc(ArticleQueue.created_at)).offset(skip).limit(limit).all()
        
        return [{
            "id": article.id,
            "doi": article.doi,
            "title": article.title,
            "authors": article.authors,
            "status": article.status,
            "created_at": article.created_at.isoformat() if article.created_at else None
        } for article in articles]
    except Exception as e:
        logger.error(f"Error retrieving articles: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving articles: {str(e)}"
        )

# Get specific article
@router.get("/{article_id}")
async def get_queue_item(article_id: int, db: Session = Depends(get_db)):
    """Get a specific article from the queue"""
    article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return {
        "id": article.id,
        "doi": article.doi,
        "title": article.title,
        "authors": article.authors,
        "status": article.status,
        "created_at": article.created_at.isoformat() if article.created_at else None
    }

# Download PDF endpoint
@router.get("/{article_id}/download-pdf")
async def download_pdf(
    article_id: int,
    db: Session = Depends(get_db),
    direct_download: bool = False
):
    """Get PDF from S3 for an article"""
    try:
        # Get article from database
        article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        if not article.pdf_s3_key:
            raise HTTPException(status_code=404, detail="No PDF found for this article")
        
        logger.info(f"Attempting to download PDF with S3 key: {article.pdf_s3_key}")
        
        if direct_download:
            try:
                # Get the file from S3 using S3Client
                pdf_content = await s3_client.download_pdf(article.pdf_s3_key)
                
                # Create a filename for download
                filename = f"{article.doi.replace('/', '_')}.pdf" if article.doi else f"article_{article_id}.pdf"
                
                # Stream the file content
                return StreamingResponse(
                    io.BytesIO(pdf_content),
                    media_type='application/pdf',
                    headers={
                        'Content-Disposition': f'attachment; filename="{filename}"'
                    }
                )
                
            except Exception as e:
                logger.error(f"Error downloading from S3: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error downloading PDF from storage: {str(e)}"
                )
        else:
            try:
                # Generate pre-signed URL using S3Client
                url = s3_client.generate_presigned_url(article.pdf_s3_key)
                return RedirectResponse(url=url)
                
            except Exception as e:
                logger.error(f"Error generating pre-signed URL: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error generating PDF access URL: {str(e)}"
                )
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing PDF request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF request: {str(e)}"
        ) 