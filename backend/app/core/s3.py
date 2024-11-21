import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def get_s3_client():
    """Create and return an S3 client"""
    try:
        return boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION
        )
    except Exception as e:
        logger.error(f"Error creating S3 client: {str(e)}")
        raise

def get_s3_object(key: str):
    """Get an object from S3"""
    try:
        s3_client = get_s3_client()
        return s3_client.get_object(
            Bucket=settings.AWS_ARTICLE_QUEUE_BUCKET,
            Key=key
        )
    except ClientError as e:
        logger.error(f"Error getting object from S3: {str(e)}")
        raise

def generate_presigned_url(key: str, expiration=3600):
    """Generate a presigned URL for an S3 object"""
    try:
        s3_client = get_s3_client()
        return s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.AWS_ARTICLE_QUEUE_BUCKET,
                'Key': key
            },
            ExpiresIn=expiration
        )
    except ClientError as e:
        logger.error(f"Error generating presigned URL: {str(e)}")
        raise 