from sqlalchemy import create_engine
from app.db.base import Base
from app.models.event import Event  # Import to ensure the model is loaded

def recreate_database():
    # Create SQLite database
    SQLALCHEMY_DATABASE_URL = "sqlite:///./events.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    
    # Remove existing tables
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print(f"Database events.db recreated successfully!")

if __name__ == '__main__':
    recreate_database()
