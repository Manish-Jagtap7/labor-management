import os
import subprocess
import sys

def main():
    port = os.environ.get("PORT", "8000")
    
    print("Running database migrations...")
    try:
        # Run alembic to create/upgrade the SQLite database tables
        subprocess.run(["alembic", "upgrade", "head"], cwd="backend", check=True)
        print("Database migrations successful.")
    except subprocess.CalledProcessError as e:
        print(f"Database migration failed: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("Alembic not found. Are dependencies installed?")
        sys.exit(1)
        
    print(f"Starting uvicorn server on port {port}...")
    try:
        subprocess.run([
            "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", port
        ], cwd="backend", check=True)
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
