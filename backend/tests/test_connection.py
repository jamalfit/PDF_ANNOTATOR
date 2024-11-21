from sqlalchemy import create_engine, text
import os

# Get the database URL from environment variable
database_url = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost:5432/pdf_segmenter')

def test_connection():
    try:
        # Create engine
        engine = create_engine(database_url)
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("Database connection successful!")
            
            # Test if article_queue table exists
            result = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'article_queue')"
            ))
            if result.scalar():
                print("article_queue table exists!")
            else:
                print("article_queue table does not exist!")
                
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")

if __name__ == "__main__":
    test_connection() 