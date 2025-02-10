import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.event import Event
from app.schemas.event import EventCreate
from app.services.event_service import EventService
from fastapi import HTTPException

def test_create_simple_event(db_session: Session):
    """Test creating a basic non-recurring event"""
    print("Starting test_create_simple_event")
    event_service = EventService(db_session)
    
    event_data = EventCreate(
        name="Test Event",
        start_time=datetime.now(),
        duration=60,
        is_recurring=False
    )
    
    print(f"Event data: {event_data}")
    
    created_event = event_service.create_event(event_data)
    
    print(f"Created event: {created_event}")
    
    assert created_event.name == "Test Event"
    assert created_event.duration == 60
    assert not created_event.is_recurring
    print("test_create_simple_event completed successfully")

def test_event_time_conflict(db_session: Session):
    """Test preventing events with overlapping times"""
    print("Starting test_event_time_conflict")
    event_service = EventService(db_session)
    
    base_time = datetime.now()
    
    # Create first event
    first_event = EventCreate(
        name="First Event",
        start_time=base_time,
        duration=60,
        is_recurring=False
    )
    event_service.create_event(first_event)
    
    # Try to create a conflicting event
    conflicting_event = EventCreate(
        name="Conflicting Event",
        start_time=base_time + timedelta(minutes=30),  # Overlaps with first event
        duration=60,
        is_recurring=False
    )
    
    with pytest.raises(HTTPException) as exc_info:
        event_service.create_event(conflicting_event)
    
    assert exc_info.value.status_code == 400
    assert "Conflict" in str(exc_info.value.detail)
    print("test_event_time_conflict completed successfully")

def test_recurring_event_creation(db_session: Session):
    """Test creating a recurring event"""
    print("Starting test_recurring_event_creation")
    event_service = EventService(db_session)
    
    recurring_event = EventCreate(
        name="Weekly Meeting",
        start_time=datetime.now(),
        duration=90,
        is_recurring=True,
        recurring_days=["MO", "WE", "FR"]
    )
    
    created_event = event_service.create_event(recurring_event)
    
    assert created_event.name == "Weekly Meeting"
    assert created_event.is_recurring
    assert set(created_event.recurring_days) == {"MO", "WE", "FR"}
    print("test_recurring_event_creation completed successfully")

def test_invalid_recurring_event(db_session: Session):
    """Test creating a recurring event without specifying days"""
    print("Starting test_invalid_recurring_event")
    event_service = EventService(db_session)
    
    invalid_recurring_event = EventCreate(
        name="Invalid Recurring Event",
        start_time=datetime.now(),
        duration=60,
        is_recurring=True,
        recurring_days=None
    )
    
    with pytest.raises(ValueError):
        event_service.create_event(invalid_recurring_event)
    print("test_invalid_recurring_event completed successfully")

def test_event_duration_validation(db_session: Session):
    """Test event duration constraints"""
    print("Starting test_event_duration_validation")
    event_service = EventService(db_session)
    
    # Test invalid duration (too short)
    with pytest.raises(ValueError):
        EventCreate(
            name="Too Short Event",
            start_time=datetime.now(),
            duration=0,
            is_recurring=False
        )
    
    # Test invalid duration (too long)
    with pytest.raises(ValueError):
        EventCreate(
            name="Too Long Event",
            start_time=datetime.now(),
            duration=1441,  # More than 24 hours
            is_recurring=False
        )
    print("test_event_duration_validation completed successfully")
