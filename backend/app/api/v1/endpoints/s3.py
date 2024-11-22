from fastapi import APIRouter, HTTPException, Depends, Security
from app.core.s3 import S3Client
from app.core.security import get_api_key
import logging
from typing import List, Optional
from app.core.config import settings
from sqlalchemy.orm import Session
from app.core.database import get_db

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
    db: Session = Depends(get_db)
):
    """List all files in the S3 bucket with optional prefix filter"""
    try:
        logger.info(f"Attempting to list files with prefix: {prefix}")
        
        files = await s3_client.list_files(prefix or "")
        
        logger.info(f"Found {len(files)} files")
        
        return [{"key": file["Key"], "size": file["Size"], "last_modified": file["LastModified"]} 
                for file in files]
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