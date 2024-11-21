from dotenv import load_dotenv
import os
from urllib.parse import urlparse, parse_qs

def check_db_url():
    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    
    if not db_url:
        print("No DATABASE_URL found in .env file")
        return
        
    # Parse the URL
    parsed = urlparse(db_url)
    
    # Print components (masking sensitive data)
    print(f"Scheme: {parsed.scheme}")
    print(f"Username: {parsed.username}")
    print(f"Password: {'*' * len(parsed.password) if parsed.password else 'None'}")
    print(f"Hostname: {parsed.hostname}")
    print(f"Path: {parsed.path}")
    print(f"Query parameters: {parse_qs(parsed.query) if parsed.query else 'None'}")
    
    # Check if sslmode is in the URL
    query_params = parse_qs(parsed.query)
    if 'sslmode' not in query_params:
        print("\nWARNING: sslmode not found in URL")
        print("Your DATABASE_URL should look like:")
        print("postgresql://user:password@host:port/dbname?sslmode=require")

if __name__ == "__main__":
    check_db_url() 