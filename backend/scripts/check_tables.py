import os
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_database_tables():
    # Get DATABASE_URL directly from environment
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables")
        return
    
    # Create engine
    engine = create_engine(database_url)
    
    # Get inspector
    inspector = inspect(engine)
    
    # Get all table names
    tables = inspector.get_table_names()
    
    print("\nExisting tables in database:")
    for table in tables:
        print(f"\n- {table}")
        # Get columns for each table
        columns = inspector.get_columns(table)
        for column in columns:
            print(f"  • {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_database_tables() 