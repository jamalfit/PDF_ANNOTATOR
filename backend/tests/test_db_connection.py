from dotenv import load_dotenv
import os
import psycopg2
import logging
from sqlalchemy import create_engine, text
from urllib.parse import urlparse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_connection():
    # Load environment variables
    load_dotenv()
    
    # Get DATABASE_URL from .env
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        logger.error("DATABASE_URL not found in .env file")
        return
    
    # Parse the URL for logging (hide sensitive info)
    parsed = urlparse(database_url)
    logger.info(f"Testing connection to:")
    logger.info(f"Host: {parsed.hostname}")
    logger.info(f"Database: {parsed.path[1:]}")
    logger.info(f"User: {parsed.username}")
    
    try:
        # Try SQLAlchemy connection
        logger.info("Attempting SQLAlchemy connection...")
        engine = create_engine(
            database_url,
            connect_args={
                "sslmode": "require"
            }
        )
        
        with engine.connect() as conn:
            # Test basic query
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            logger.info(f"Connected successfully!")
            logger.info(f"PostgreSQL version: {version}")
            
            # Test article_queue table
            result = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'article_queue')"
            ))
            if result.scalar():
                logger.info("article_queue table exists!")
                
                # Get sample article
                result = conn.execute(text(
                    "SELECT id, pdf_s3_key FROM article_queue LIMIT 1"
                ))
                row = result.first()
                if row:
                    logger.info(f"Sample article - ID: {row.id}, S3 Key: {row.pdf_s3_key}")
            else:
                logger.warning("article_queue table not found!")
                
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        logger.error("Please verify your DATABASE_URL is correct")
        raise

if __name__ == "__main__":
    test_connection() 