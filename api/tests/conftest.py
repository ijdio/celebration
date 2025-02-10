import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.models.event import Base

# Use an in-memory SQLite database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_engine():
    """Create a SQLAlchemy engine for testing"""
    engine = create_engine(
        TEST_DATABASE_URL, 
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a SQLAlchemy session for testing"""
    SessionLocal = sessionmaker(
        autocommit=False, 
        autoflush=False, 
        bind=db_engine
    )
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
