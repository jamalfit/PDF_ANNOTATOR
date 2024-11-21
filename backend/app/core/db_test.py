from app.core.database import engine, SessionLocal

def test_database_connection():
    try:
        # Test engine connection
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            print("✅ Database engine connection successful!")
        
        # Test session creation
        db = SessionLocal()
        db.execute("SELECT 1")
        print("✅ Database session creation successful!")
        db.close()
        
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_database_connection() 