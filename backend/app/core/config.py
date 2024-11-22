from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "PDF Segmenter"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., env='SECRET_KEY')
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
    
    # OpenAI Settings
    OPENAI_API_KEY: str
    
    # Security settings
    ALLOWED_ORIGINS: list = ["http://localhost:3000"]
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    API_KEY_NAME: str = "X-API-Key"
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # Improve AWS settings
    AWS_ENDPOINT_URL: Optional[str] = None
    AWS_S3_CUSTOM_DOMAIN: Optional[str] = None
    
    # Add PDF processing settings
    PDF_ALLOWED_MIME_TYPES: list = ["application/pdf"]
    MAX_CHUNK_SIZE: int = 1000
    
    ENVIRONMENT: str = "development"
    
    API_KEY: str = Field(default="your_default_api_key")
    
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

    def model_post_init(self, *args, **kwargs):
        super().model_post_init(*args, **kwargs)
        if self.API_KEY == "your_default_api_key":
            self.API_KEY = self.SECRET_KEY

settings = Settings()

