from fastapi import APIRouter, HTTPException, Depends, Security
from app.core.s3 import S3Client
from app.core.security import get_api_key
import logging
from typing import List, Optional
from app.core.config import settings
from sqlalchemy.orm import Session
from app.core.database import get_db
import boto3
from app.models.article_queue import ArticleQueue
from fastapi.responses import StreamingResponse

router = APIRouter()
logger = logging.getLogger(__name__)
s3_client = S3Client()

@router.get("/", response_model=List[dict])
async def list_s3_files(
    prefix: Optional[str] = "",
    api_key: str = Security(get_api_key)
):
    """List files in S3 bucket"""
    try:
        files = await s3_client.list_files(prefix)
        return files
    except Exception as e:
        logger.error(f"Error listing S3 files: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error listing S3 files: {str(e)}"
        )

@router.delete("/{s3_key:path}")
async def delete_s3_file(
    s3_key: str,
    api_key: str = Security(get_api_key)
):
    """Delete a file from S3 bucket"""
    try:
        await s3_client.delete_file(s3_key)
        return {
            "message": f"Successfully deleted file: {s3_key}",
            "s3_key": s3_key
        }
    except Exception as e:
        logger.error(f"Error deleting S3 file: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting S3 file: {str(e)}"
        )

@router.get("/list-files/", response_model=List[dict])
async def list_files(
    prefix: Optional[str] = None,
):
    """List all files in the S3 bucket with optional prefix filter"""
    try:
        logger.info(f"Attempting to list files with prefix: {prefix}")
        
        # Use the configured bucket
        response = s3_client.s3.list_objects_v2(
            Bucket=settings.AWS_BUCKET_NAME,
            Prefix=prefix or ""
        )
        
        if 'Contents' not in response:
            logger.info("No files found in bucket")
            return []
            
        files = response['Contents']
        logger.info(f"Found {len(files)} files")
        
        # Format the response
        return [
            {
                "key": file["Key"],
                "size": file["Size"],
                "last_modified": file["LastModified"]
            } 
            for file in files
        ]
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-s3")
async def test_s3_connection():
    """Test S3 connection using configured bucket"""
    try:
        # Test with your configured bucket
        response = s3_client.s3.list_objects_v2(
            Bucket=settings.AWS_BUCKET_NAME,
            MaxKeys=1  # Just check for one object to verify access
        )
        
        return {
            "message": "S3 connection successful",
            "bucket": settings.AWS_BUCKET_NAME,
            "accessible": True,
            "objects_found": 'Contents' in response,
            "total_objects": response.get('KeyCount', 0)
        }
    except Exception as e:
        logger.error(f"S3 connection test failed: {str(e)}")
        return {
            "message": "S3 connection failed",
            "bucket": settings.AWS_BUCKET_NAME,
            "error": str(e)
        }

@router.get("/test-buckets")
async def test_bucket_access():
    """Test access to configured S3 buckets"""
    try:
        results = {}
        buckets_to_check = [
            settings.AWS_BUCKET_NAME,
            settings.AWS_ARTICLE_QUEUE_BUCKET
        ]
        
        for bucket in buckets_to_check:
            try:
                # Try to list a single object to verify access
                response = s3_client.s3.list_objects_v2(
                    Bucket=bucket,
                    MaxKeys=10
                )
                results[bucket] = {
                    "status": "accessible",
                    "objects_found": 'Contents' in response,
                    "total_objects": response.get('KeyCount', 0)
                }
                logger.info(f"Successfully accessed bucket: {bucket}")
            except Exception as e:
                logger.error(f"Error accessing bucket {bucket}: {str(e)}")
                results[bucket] = {
                    "status": "error",
                    "error": str(e)
                }
        
        return {
            "message": "Bucket access test completed",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error testing buckets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-presigned-url/{article_id}")
async def get_presigned_url(article_id: int, db: Session = Depends(get_db)):
    """Get a presigned URL for viewing a PDF"""
    try:
        # Get article from database
        article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
            
        if not article.pdf_s3_key:
            raise HTTPException(status_code=404, detail="No PDF key found for this article")

        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION
        )
        
        logger.info(f"Generating presigned URL for bucket: {settings.AWS_ARTICLE_QUEUE_BUCKET}, key: {article.pdf_s3_key}")

        # Generate URL
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_ARTICLE_QUEUE_BUCKET,
                'Key': article.pdf_s3_key
            },
            ExpiresIn=3600  # URL valid for 1 hour
        )
        
        return {
            "url": url,
            "key": article.pdf_s3_key,
            "bucket": settings.AWS_ARTICLE_QUEUE_BUCKET
        }
    except Exception as e:
        logger.error(f"Error generating presigned URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-pdf/{article_id}")
async def get_pdf_content(article_id: int, db: Session = Depends(get_db)):
    """Get PDF content directly from S3"""
    try:
        # Get article from database
        article = db.query(ArticleQueue).filter(ArticleQueue.id == article_id).first()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
            
        if not article.pdf_s3_key:
            raise HTTPException(status_code=404, detail="No PDF key found for this article")

        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION
        )

        try:
            # Get the object from S3
            response = s3_client.get_object(
                Bucket=settings.AWS_ARTICLE_QUEUE_BUCKET,
                Key=article.pdf_s3_key
            )
            
            # Return streaming response with PDF content
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{article.pdf_s3_key}"'
                }
            )

        except s3_client.exceptions.NoSuchKey:
            raise HTTPException(status_code=404, detail="PDF not found in S3")
            
    except Exception as e:
        logger.error(f"Error getting PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/get-pdf-by-key/{s3_key:path}")
async def get_pdf_by_key(s3_key: str):
    """Get PDF content directly from S3 using the key"""
    try:
        logger.info(f"Attempting to get PDF with key: {s3_key}")
        # Create S3 client
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION
        )

        try:
            # Get the object from S3
            response = s3_client.get_object(
                Bucket=settings.AWS_ARTICLE_QUEUE_BUCKET,
                Key=s3_key
            )
            
            logger.info(f"Successfully retrieved PDF from S3: {s3_key}")
            
            # Return streaming response with PDF content
            return StreamingResponse(
                response['Body'].iter_chunks(),
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'inline; filename="{s3_key.split("/")[-1]}"',
                    "Access-Control-Allow-Origin": "*"
                }
            )

        except s3_client.exceptions.NoSuchKey:
            logger.error(f"PDF not found in S3: {s3_key}")
            raise HTTPException(status_code=404, detail="PDF not found in S3")
            
    except Exception as e:
        logger.error(f"Error getting PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))