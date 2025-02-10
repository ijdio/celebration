import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.base import Base, engine
from app.models.event import Event  # Import to ensure the model is loaded

def recreate_database():
    try:
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("Database recreated successfully!")
    except Exception as e:
        print(f"Error recreating database: {e}")
        raise

if __name__ == '__main__':
    recreate_database()
