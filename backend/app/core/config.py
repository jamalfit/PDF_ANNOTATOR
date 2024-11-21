from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PDF Segmenter"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    SECRET_KEY: str
    ADMIN_EMAIL: str
    
    # Database settings
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # AWS Settings
    AWS_ACCESS_KEY: str
    AWS_SECRET_KEY: str
    AWS_REGION: str
    AWS_ARTICLE_QUEUE_BUCKET: str
    AWS_BUCKET_NAME: Optional[str] = None
    
    # OpenAI Settings
    OPENAI_API_KEY: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

    # Helper method for AWS credentials
    @property
    def aws_credentials(self):
        return {
            "aws_access_key_id": self.AWS_ACCESS_KEY,
            "aws_secret_access_key": self.AWS_SECRET_KEY,
            "region_name": self.AWS_REGION
        }

settings = Settings()

