from fastapi import APIRouter, HTTPException, Depends, Security
from app.core.s3 import S3Client
from app.core.security import get_api_key
import logging
from typing import List, Optional
from app.core.config import settings

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
    api_key: str = Depends(get_api_key) if not settings.DEBUG else None
):
    """List all files in the S3 bucket with optional prefix filter"""
    try:
        files = await s3_client.list_files(prefix or "")
        return [{"key": file["Key"], "size": file["Size"], "last_modified": file["LastModified"]} 
                for file in files]
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 