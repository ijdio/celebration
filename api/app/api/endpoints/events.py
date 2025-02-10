from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
import logging

from app.db.base import get_db
from app.schemas.event import EventCreate, EventResponse, EventList
from app.services.event_service import EventService

logger = logging.getLogger(__name__)

router = APIRouter()

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
    # Log the incoming event creation request
    logger.info(f"Received event creation request: {event.model_dump()}")
    
    try:
        # Detailed logging of event creation attempt
        logger.debug(f"Event Creation Details:")
        logger.debug(f"Name: {event.name}")
        logger.debug(f"Start Time: {event.start_time}")
        logger.debug(f"Duration: {event.duration} minutes")
        logger.debug(f"Is Recurring: {event.is_recurring}")
        logger.debug(f"Recurring Days: {event.recurring_days}")
        
        # Create event service
        service = EventService(db)
        
        # Attempt to create the event
        db_event = service.create_event(event)
        
        # Convert to response model
        event_response = EventResponse.from_orm(db_event)
        
        # Additional logging of the response
        logger.debug(f"Event Response: {event_response}")
        
        logger.info(f"Event created successfully: ID {event_response.id}")
        return event_response
    
    except HTTPException as conflict_error:
        # Log conflict details
        logger.warning(f"Event creation blocked: {conflict_error.detail}")
        raise
    
    except Exception as e:
        # Catch and log any unexpected errors
        logger.error(f"Unexpected error during event creation: {str(e)}", exc_info=True)
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
    try:
        # Log the received parameters
        logger.info(f"Fetching events - Start: {start}, End: {end}")
        
        # Create event service
        event_service = EventService(db)
        
        # Fetch events
        events = event_service.get_events(start, end)
        
        # Log the number of events found
        logger.info(f"Found {len(events)} events")
        
        # Log detailed information about each event
        for event in events:
            logger.info(
                f"Event Details: "
                f"ID: {event.id}, "
                f"Name: {event.name}, "
                f"Start Time: {event.start_time}, "
                f"Duration: {event.duration} minutes, "
                f"Is Recurring: {event.is_recurring}, "
                f"Recurring Days: {event.recurring_days}"
            )
        
        # Convert to response model
        event_responses = [EventResponse.from_orm(event) for event in events]
        
        # Return as EventList to match frontend expectations
        return EventList(events=event_responses)
    
    except Exception as e:
        # Log any errors
        logger.error(f"Error fetching events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
) -> EventResponse:
    """
    Get a specific event by ID.
    """
    service = EventService(db)
    event = service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
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
    service = EventService(db)
    updated_event = service.update_event(event_id, event)
    return EventResponse.from_orm(updated_event)

@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db)
) -> dict:
    """
    Delete an event.
    """
    service = EventService(db)
    service.delete_event(event_id)
    return {"message": "Event deleted successfully"}
