import boto3
from botocore.exceptions import ClientError
from app.core.config import settings
import logging
from typing import List

logger = logging.getLogger(__name__)

class S3Client:
    def __init__(self):
        self.s3 = boto3.client(    
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.AWS_BUCKET_NAME

    async def upload_pdf(self, file_content: bytes, prefix: str = "pdfs/") -> str:
        """Upload a PDF file to S3 and return the S3 key"""
        try:
            import uuid
            file_name = f"{prefix}{uuid.uuid4()}.pdf"
            
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=file_content,
                ContentType='application/pdf'
            )
            
            return file_name
        except Exception as e:
            logger.error(f"Error uploading to S3: {str(e)}")
            raise

    async def download_pdf(self, s3_key: str) -> bytes:
        """Download a PDF file from S3"""
        try:
            response = self.s3.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['Body'].read()
        except ClientError as e:
            logger.error(f"Error downloading from S3: {str(e)}")
            raise

    def generate_presigned_url(self, s3_key: str, expiration=3600) -> str:
        """Generate a presigned URL for an S3 object"""
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {str(e)}")
            raise

    async def delete_pdf(self, s3_key: str):
        """Delete a PDF file from S3"""
        try:
            self.s3.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
        except ClientError as e:
            logger.error(f"Error deleting from S3: {str(e)}")
            raise

    async def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3 bucket"""
        try:
            self.s3.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            raise

    async def list_files(self, prefix: str = "") -> List[dict]:
        """List files in S3 bucket"""
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    files.append({
                        "key": obj['Key'],
                        "size": obj['Size'],
                        "last_modified": obj['LastModified'].isoformat()
                    })
            return files
        except ClientError as e:
            logger.error(f"Error listing S3 files: {str(e)}")
            raise 