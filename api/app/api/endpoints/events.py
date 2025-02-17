from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import logging
import json

from app.db.base import get_db
from app.schemas.event import EventCreate, EventResponse, EventList
from app.services.event_service import EventService

# Get a logger specific to this module
logger = logging.getLogger(__name__)

router = APIRouter()

def log_request_details(request_type: str, details: dict):
    """
    Log request details with a consistent format
    """
    log_message = f"{request_type.upper()} REQUEST: " + json.dumps(details, default=str)
    logger.debug(log_message)

@router.post("/", response_model=EventResponse, status_code=201)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new event.
    
    - Validates event data
    - Checks for conflicts with existing events
    - Returns the created event
    """
    # Log detailed request information
    log_request_details("event creation", {
        "event_data": event.model_dump(),
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        # Create event service
        service = EventService(db)
        
        # Attempt to create the event
        db_event = service.create_event(event)
        
        # Convert to response model
        event_response = EventResponse.from_orm(db_event)
        
        # Log successful event creation
        log_request_details("event creation success", {
            "event_id": event_response.id,
            "event_name": event_response.name,
            "timestamp": datetime.now().isoformat()
        })
        
        return event_response
    
    except HTTPException as conflict_error:
        # Log conflict details
        log_request_details("event creation conflict", {
            "error_detail": conflict_error.detail,
            "timestamp": datetime.now().isoformat()
        })
        raise
    
    except Exception as e:
        # Log any unexpected errors
        log_request_details("event creation error", {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error: {str(e)}"
        )

@router.get("/", response_model=EventList)
def get_events(
    start: Optional[datetime] = Query(None, description="Start time (UTC)"),
    end: Optional[datetime] = Query(None, description="End time (UTC)"),
    db: Session = Depends(get_db)
):
    """
    Get all events within the specified time range.
    
    Parameters:
    - start: Optional start time to filter events
    - end: Optional end time to filter events
    - Times should be provided in UTC
    """
    # Log request details
    log_request_details("event retrieval", {
        "start_time": start,
        "end_time": end,
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        # Create event service
        event_service = EventService(db)
        
        # Fetch events
        events = event_service.get_events(start, end)
        
        # Log events found
        log_request_details("event retrieval success", {
            "total_events": len(events),
            "events": [
                {
                    "id": event.id, 
                    "name": event.name, 
                    "start_time": event.start_time
                } for event in events
            ],
            "timestamp": datetime.now().isoformat()
        })
        
        # Convert to response model
        event_responses = [EventResponse.from_orm(event) for event in events]
        
        # Return as EventList to match frontend expectations
        return EventList(events=event_responses)
    
    except Exception as e:
        # Log any errors
        log_request_details("event retrieval error", {
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/current", response_model=EventList)
def get_current_events(
    db: Session = Depends(get_db)
):
    """
    Get all events happening at the current time.
    
    Returns events that are:
    1. Non-recurring events currently in progress
    2. Recurring events scheduled for today that are currently in progress
    
    All times are handled in UTC.
    """
    try:
        # Get current time in UTC
        current_time = datetime.now(timezone.utc)
        
        # Log request details
        log_request_details("current events retrieval", {
            "current_time": current_time.isoformat(),
            "day_of_week": current_time.strftime('%A'),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Create event service and fetch events
        event_service = EventService(db)
        events = event_service.get_current_events(current_time)
        
        # Log found events
        log_request_details("current events retrieval success", {
            "total_events": len(events),
            "events": [
                {
                    "id": event.id, 
                    "name": event.name, 
                    "start_time": event.start_time.isoformat() if event.start_time else None,
                    "duration": event.duration,
                    "is_recurring": event.is_recurring,
                    "recurring_days": event.recurring_days.split(',') if event.recurring_days else []
                } for event in events
            ],
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # Convert to response model
        event_responses = [EventResponse.from_orm(event) for event in events]
        
        return EventList(events=event_responses)
    
    except Exception as e:
        # Log error details
        log_request_details("current events retrieval error", {
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving current events: {str(e)}"
        )

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
) -> EventResponse:
    log_request_details("event retrieval by id", {
        "event_id": event_id,
        "timestamp": datetime.now().isoformat()
    })
    
    service = EventService(db)
    event = service.get_event_by_id(event_id)
    if not event:
        log_request_details("event retrieval by id error", {
            "error": "Event not found",
            "timestamp": datetime.now().isoformat()
        })
        raise HTTPException(status_code=404, detail="Event not found")
    log_request_details("event retrieval by id success", {
        "event_id": event.id,
        "event_name": event.name,
        "timestamp": datetime.now().isoformat()
    })
    return EventResponse.from_orm(event)

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event: EventCreate,
    db: Session = Depends(get_db)
) -> EventResponse:
    """
    Update an existing event.
    
    - Validates updated event data
    - Checks for conflicts with other events
    - Returns the updated event
    """
    log_request_details("event update", {
        "event_id": event_id,
        "event_data": event.model_dump(),
        "timestamp": datetime.now().isoformat()
    })
    
    service = EventService(db)
    updated_event = service.update_event(event_id, event)
    log_request_details("event update success", {
        "event_id": updated_event.id,
        "event_name": updated_event.name,
        "timestamp": datetime.now().isoformat()
    })
    return EventResponse.from_orm(updated_event)

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete an event.
    """
    log_request_details("event deletion", {
        "event_id": event_id,
        "timestamp": datetime.now().isoformat()
    })
    
    service = EventService(db)
    service.delete_event(event_id)
    log_request_details("event deletion success", {
        "event_id": event_id,
        "timestamp": datetime.now().isoformat()
    })
    return {"message": "Event deleted successfully"}
