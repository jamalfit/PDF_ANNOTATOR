from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import logging
from urllib.parse import urlparse

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_db_connection():
    # Load environment variables
    load_dotenv(override=True)
    
    # Get database URL
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        logger.error("DATABASE_URL not found in environment variables!")
        return
    
    # Parse and log URL components (hiding password)
    parsed_url = urlparse(database_url)
    logger.info(f"Connecting to:")
    logger.info(f"  Host: {parsed_url.hostname}")
    logger.info(f"  Port: {parsed_url.port}")
    logger.info(f"  Database: {parsed_url.path[1:]}")  # Remove leading '/'
    logger.info(f"  Username: {parsed_url.username}")
    
    try:
        # Create engine with SSL required
        logger.info("Creating database engine...")
        engine = create_engine(
            database_url,
            connect_args={
                "sslmode": "require"
            }
        )
        
        # Test connection
        logger.info("Testing connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Connection successful!")
            
            # Get connection info
            result = conn.execute(text("""
                SELECT 
                    current_database() as db,
                    current_user as user,
                    version() as version;
            """))
            info = result.first()
            logger.info(f"Connected to database: {info.db}")
            logger.info(f"Connected as user: {info.user}")
            logger.info(f"PostgreSQL version: {info.version}")
            
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        logger.error("Please verify your DATABASE_URL is correct and includes sslmode=require")
        raise

if __name__ == "__main__":
    test_db_connection() 