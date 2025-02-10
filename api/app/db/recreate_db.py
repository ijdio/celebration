from sqlalchemy import create_engine
from app.models.event import Base

def recreate_database():
    # Create SQLite database
    SQLALCHEMY_DATABASE_URL = "sqlite:///./events.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    print("Recreating database...")
    recreate_database()
    print("Database recreated successfully!")
