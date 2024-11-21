import os
import subprocess
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from prettytable import PrettyTable

# Load .env from project root
env_path = Path(__file__).parents[1] / '.env'
load_dotenv(env_path)

def get_db_url():
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL not found in .env file")
        sys.exit(1)
    return db_url

def parse_db_url(db_url):
    # Remove postgresql:// prefix
    db_url = db_url.replace('postgresql://', '')
    # Split user:pass@host:port/dbname
    auth, rest = db_url.split('@')
    user, password = auth.split(':')
    host_port, dbname = rest.split('/')
    
    # Make port optional, default to 5432 if not specified
    if ':' in host_port:
        host, port = host_port.split(':')
    else:
        host = host_port
        port = '5432'  # Default PostgreSQL port
        
    # Remove any query parameters from dbname
    dbname = dbname.split('?')[0]
    
    return {
        'user': user,
        'password': password,
        'host': host,
        'port': port,
        'dbname': dbname
    }

def create_dump_directory():
    dump_dir = Path(__file__).parent / 'dumps'
    dump_dir.mkdir(exist_ok=True)
    return dump_dir

def dump_tables(db_config, dump_dir):
    # Get list of tables
    env = os.environ.copy()
    env['PGPASSWORD'] = db_config['password']
    
    cmd = [
        'psql',
        f"-h {db_config['host']}",
        f"-p {db_config['port']}",
        f"-U {db_config['user']}",
        f"-d {db_config['dbname']}",
        "-t",
        "-c \"SELECT tablename FROM pg_tables WHERE schemaname = 'public';\""
    ]
    
    try:
        result = subprocess.run(' '.join(cmd), shell=True, capture_output=True, text=True, env=env)
        tables = [t.strip() for t in result.stdout.split('\n') if t.strip()]
        
        if not tables:
            print("No tables found in database")
            return
        
        print("\nAvailable tables:")
        for i, table in enumerate(tables, 1):
            print(f"{i}. {table}")
        
        selections = input("\nEnter table numbers to dump (comma-separated) or 'all': ").strip()
        
        if selections.lower() == 'all':
            selected_tables = tables
        else:
            try:
                indices = [int(i.strip()) - 1 for i in selections.split(',')]
                selected_tables = [tables[i] for i in indices]
            except (ValueError, IndexError):
                print("Invalid selection")
                return
        
        for table in selected_tables:
            output_file = dump_dir / f"{table}_dump.sql"
            dump_cmd = [
                'pg_dump',
                f"-h {db_config['host']}",
                f"-p {db_config['port']}",
                f"-U {db_config['user']}",
                f"-d {db_config['dbname']}",
                f"-t {table}",
                f"> {output_file}"
            ]
            
            print(f"\nDumping table {table}...")
            subprocess.run(' '.join(dump_cmd), shell=True, env=env)
            print(f"Dump saved to {output_file}")
            
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        sys.exit(1)

class SchemaInspector:
    def __init__(self, db_config):
        self.conn = psycopg2.connect(
            dbname=db_config['dbname'],
            user=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port']
        )
        self.conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)

    def get_table_info(self, table_name: str) -> dict:
        with self.conn.cursor() as cur:
            # Get columns
            cur.execute("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    column_default,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            columns = cur.fetchall()

            # Get constraints
            cur.execute("""
                SELECT
                    con.conname as constraint_name,
                    con.contype as constraint_type,
                    CASE
                        WHEN con.contype = 'f' THEN (
                            SELECT table_name 
                            FROM information_schema.tables 
                            WHERE table_schema = 'public' 
                            AND table_name = (
                                SELECT relname 
                                FROM pg_class 
                                WHERE oid = con.confrelid
                            )
                        )
                        ELSE NULL
                    END as referenced_table,
                    pg_get_constraintdef(con.oid) as definition
                FROM pg_constraint con
                JOIN pg_class rel ON rel.oid = con.conrelid
                JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
                WHERE nsp.nspname = 'public'
                AND rel.relname = %s;
            """, (table_name,))
            constraints = cur.fetchall()

            # Get indexes
            cur.execute("""
                SELECT
                    i.relname as index_name,
                    a.attname as column_name,
                    idx.indisunique as is_unique,
                    pg_get_indexdef(idx.indexrelid) as definition
                FROM pg_index idx
                JOIN pg_class i ON i.oid = idx.indexrelid
                JOIN pg_class t ON t.oid = idx.indrelid
                JOIN pg_attribute a ON a.attrelid = t.oid
                WHERE t.relname = %s
                AND a.attnum = ANY(idx.indkey)
                AND t.relkind = 'r';
            """, (table_name,))
            indexes = cur.fetchall()

            return {
                'columns': columns,
                'constraints': constraints,
                'indexes': indexes
            }

    def display_schema(self, output_file=None):
        """Display the complete database schema"""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cur.fetchall()]

        output = []
        output.append("\n📊 Database Schema")
        output.append("=" * 80)

        for table_name in tables:
            output.append(f"\n📋 Table: {table_name}")
            output.append("-" * 80)
            
            info = self.get_table_info(table_name)
            
            # Display columns
            columns_table = PrettyTable()
            columns_table.field_names = ["Column", "Type", "Nullable", "Default"]
            for col in info['columns']:
                data_type = col[1]
                if col[2]:  # if has length
                    data_type = f"{data_type}({col[2]})"
                columns_table.add_row([
                    col[0],  # name
                    data_type,
                    "YES" if col[4] == "YES" else "NO",
                    col[3] or ""  # default
                ])
            output.append("\nColumns:")
            output.append(str(columns_table))
            
            # Display constraints
            if info['constraints']:
                output.append("\nConstraints:")
                constraints_table = PrettyTable()
                constraints_table.field_names = ["Name", "Type", "Definition"]
                for con in info['constraints']:
                    con_type = {
                        'p': 'PRIMARY KEY',
                        'f': 'FOREIGN KEY',
                        'u': 'UNIQUE',
                        'c': 'CHECK'
                    }.get(con[1], con[1])
                    constraints_table.add_row([con[0], con_type, con[3]])
                output.append(str(constraints_table))
            
            # Display indexes
            if info['indexes']:
                output.append("\nIndexes:")
                indexes_table = PrettyTable()
                indexes_table.field_names = ["Name", "Unique", "Definition"]
                for idx in info['indexes']:
                    indexes_table.add_row([
                        idx[0],
                        "YES" if idx[2] else "NO",
                        idx[3]
                    ])
                output.append(str(indexes_table))
            
            output.append("\n" + "=" * 80)

        # Handle output
        full_output = '\n'.join(output)
        if output_file:
            with open(output_file, 'w') as f:
                f.write(full_output)
        print(full_output)

    def close(self):
        self.conn.close()

def dump_schema(db_config, dump_dir):
    print("\nOutput Options:")
    print("1. Console only")
    print("2. File only")
    print("3. Both console and file")
    output_choice = input("Enter your choice (1-3): ")
    
    output_file = None
    if output_choice in ['2', '3']:
        output_file = dump_dir / "schema_dump.sql"
    
    inspector = SchemaInspector(db_config)
    try:
        inspector.display_schema(output_file)
        if output_file:
            print(f"\n✅ Schema dump saved to: {output_file}")
    finally:
        inspector.close()

def main():
    db_url = get_db_url()
    db_config = parse_db_url(db_url)
    dump_dir = create_dump_directory()
    
    while True:
        print("\n🗃️  PostgreSQL Database Inspector")
        print("=" * 50)
        print("1. View/Dump Schema (tables, columns, constraints)")
        print("2. Dump Specific Tables (with data)")
        print("3. Generate CREATE Statements")
        print("4. Quit")
        print("=" * 50)
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == '1':
            dump_schema(db_config, dump_dir)
        elif choice == '2':
            dump_tables(db_config, dump_dir)
            print(f"\n✅ Table dumps saved to: {dump_dir}")
        elif choice == '3':
            inspector = SchemaInspector(db_config)
            try:
                output_file = dump_dir / "create_statements.sql"
                with open(output_file, 'w') as f:
                    sys.stdout = f
                    inspector.generate_create_statements()
                    sys.stdout = sys.__stdout__
                print(f"\n✅ CREATE statements saved to: {output_file}")
            finally:
                inspector.close()
        elif choice == '4':
            print("\n👋 Goodbye!")
            break
        else:
            print("\n❌ Invalid choice. Please try again.")

if __name__ == "__main__":
    main() 