from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import logging
from sqlalchemy.types import String, Interval, Time

from app.models.event import Event
from app.schemas.event import EventCreate, EventResponse

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, 
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

class EventService:
    def __init__(self, db: Session):
        self.db = db

    def create_event(self, event: EventCreate) -> Event:
        """Create a new event with proper validation and error handling"""
        logger.info(f"Creating event: {event}")
        
        try:
            # Ensure start_time is UTC
            if isinstance(event.start_time, str):
                event.start_time = datetime.fromisoformat(event.start_time.replace('Z', '+00:00'))
            
            # ENHANCED LOGGING FOR DURATION
            logger.critical(f"DURATION VERIFICATION - Raw Duration: {event.duration}")
            logger.critical(f"DURATION VERIFICATION - Duration Type: {type(event.duration)}")
            
            # Log pre-conflict check details
            logger.debug(f"Pre-conflict check event details:")
            logger.debug(f"Start Time: {event.start_time}")
            logger.debug(f"Duration: {event.duration} minutes")
            logger.debug(f"Is Recurring: {event.is_recurring}")
            logger.debug(f"Recurring Days: {event.recurring_days}")
            
            # Check for conflicts BEFORE creating the event
            if conflict := self._get_conflict_details(event):
                logger.warning(f"Event creation blocked due to conflict: {conflict}")
                raise HTTPException(status_code=400, detail=conflict)
            
            # Convert event to dict and handle recurring days
            event_dict = event.model_dump()
            
            # Convert recurring_days to comma-separated string if it's a list
            if event_dict.get('recurring_days'):
                event_dict['recurring_days'] = ','.join(sorted(event_dict['recurring_days']))
            
            # Log final event details before database insertion
            logger.debug(f"Final event details for database insertion: {event_dict}")
            
            # Create and save event
            db_event = Event(**event_dict)
            self.db.add(db_event)
            self.db.flush()  # Flush to get the ID without committing
            
            # Commit the transaction
            self.db.commit()
            self.db.refresh(db_event)
            
            # Detailed logging of created event
            logger.info(f"Event created successfully:")
            logger.info(f"Event ID: {db_event.id}")
            logger.info(f"Event Name: {db_event.name}")
            logger.info(f"Event Start Time: {db_event.start_time}")
            logger.info(f"Event Duration: {db_event.duration} minutes")
            logger.info(f"Is Recurring: {db_event.is_recurring}")
            logger.info(f"Recurring Days: {db_event.recurring_days}")
            
            return db_event
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating event: {str(e)}", exc_info=True)
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def get_events(
        self,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None
    ) -> List[Event]:
        """Get events with optional date range filtering"""
        query = self.db.query(Event)
        
        if start:
            query = query.filter(
                or_(
                    Event.start_time >= start,
                    Event.is_recurring == True
                )
            )
        
        if end:
            query = query.filter(
                Event.start_time <= end
            )
        
        return query.order_by(Event.start_time).all()

    def get_event_by_id(self, event_id: int) -> Optional[Event]:
        return self.db.query(Event).filter(Event.id == event_id).first()

    def update_event(self, event_id: int, event_update: EventCreate) -> Event:
        try:
            # Log raw input data
            logger.info(f"Update Event Request - ID: {event_id}")
            logger.info(f"Raw Event Update Data: {event_update}")
            
            # Validate input data types
            logger.debug(f"Input Data Types:")
            logger.debug(f"event_id: {type(event_id)}, value: {event_id}")
            logger.debug(f"name: {type(event_update.name)}, value: {event_update.name}")
            logger.debug(f"start_time: {type(event_update.start_time)}, value: {event_update.start_time}")
            logger.debug(f"duration: {type(event_update.duration)}, value: {event_update.duration}")
            logger.debug(f"is_recurring: {type(event_update.is_recurring)}, value: {event_update.is_recurring}")
            logger.debug(f"recurring_days: {type(event_update.recurring_days)}, value: {event_update.recurring_days}")
            
            # Retrieve existing event
            db_event = self.get_event_by_id(event_id)
            if not db_event:
                logger.error(f"Event with ID {event_id} not found")
                raise HTTPException(
                    status_code=404,
                    detail="Event not found"
                )
            
            # Log existing event details for comparison
            logger.debug(f"Existing Event Details: {db_event}")
            
            # Check for conflicts excluding the current event
            conflict_details = self._get_conflict_details(event_update, exclude_id=event_id)
            if conflict_details:
                logger.warning(f"Event update blocked due to conflicts: {conflict_details}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid event details: {conflict_details}"
                )
            
            # Convert event_update to dictionary for more robust updating
            update_dict = event_update.model_dump()
            
            # Explicitly handle recurring_days
            if 'recurring_days' in update_dict and update_dict['recurring_days']:
                # Ensure days are uppercase and sorted
                update_dict['recurring_days'] = ','.join(
                    sorted(str(day).upper() for day in update_dict['recurring_days'])
                )
            
            # Update event attributes
            for key, value in update_dict.items():
                try:
                    # Log each attribute update
                    logger.debug(f"Updating attribute {key}: {value}")
                    setattr(db_event, key, value)
                except Exception as attr_error:
                    logger.error(f"Error setting attribute {key}: {attr_error}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"Error updating event attribute {key}: {str(attr_error)}"
                    )
            
            # Commit and refresh
            try:
                self.db.commit()
                self.db.refresh(db_event)
                
                # Log successful update
                logger.info(f"Event updated successfully: {db_event}")
                logger.debug(f"Updated Event Details: {db_event.__dict__}")
            except Exception as commit_error:
                self.db.rollback()
                logger.error(f"Database commit error: {commit_error}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Database error during event update: {str(commit_error)}"
                )
            
            return db_event
        
        except Exception as e:
            # Catch-all error logging with full traceback
            logger.error(f"Unexpected error updating event: {str(e)}", exc_info=True)
            if not isinstance(e, HTTPException):
                raise HTTPException(
                    status_code=500,
                    detail=f"Unexpected error updating event: {str(e)}"
                )
            raise

    def delete_event(self, event_id: int) -> bool:
        db_event = self.get_event_by_id(event_id)
        if not db_event:
            raise HTTPException(
                status_code=404,
                detail="Event not found"
            )
        
        self.db.delete(db_event)
        self.db.commit()
        return True

    def get_current_events(self, current_time: datetime) -> List[Event]:
        """
        Retrieve events happening at the current time.
        
        Args:
            current_time: UTC datetime object
            
        Returns:
            List of events currently in progress
        """
        try:
            # Ensure current_time is UTC and naive (no timezone info)
            if current_time.tzinfo:
                current_time = current_time.replace(tzinfo=None)
            
            # Get current day code
            current_day_code = current_time.strftime('%a')[:2].upper()
            logger.debug(f"Searching for current events at {current_time} (Day: {current_day_code})")
            
            # Build the query using SQLAlchemy expressions
            non_recurring = and_(
                ~Event.is_recurring,
                Event.start_time <= current_time,
                func.datetime(
                    Event.start_time, 
                    '+' + func.cast(Event.duration, String) + ' minutes'
                ) >= current_time
            )
            
            # For recurring events, compare time components
            current_time_str = current_time.strftime('%H:%M:%S')
            
            recurring = and_(
                Event.is_recurring,
                Event.recurring_days.like(f'%{current_day_code}%'),
                func.time(Event.start_time) <= current_time_str,
                func.time(
                    func.datetime(
                        Event.start_time,
                        '+' + func.cast(Event.duration, String) + ' minutes'
                    )
                ) >= current_time_str
            )
            
            # Combine queries
            query = self.db.query(Event).filter(or_(non_recurring, recurring))
            
            # Execute query
            events = query.all()
            logger.info(f"Found {len(events)} current events")
            
            return events
            
        except Exception as e:
            logger.error(f"Error retrieving current events: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error retrieving current events: {str(e)}"
            )

    def _get_conflict_details(self, event: EventCreate, exclude_id: Optional[int] = None) -> Optional[str]:
        """
        Check for event time conflicts using precise time overlap detection.
        
        Conflict is defined as:
        1. Events have overlapping time ranges
        2. Events are on the same day (for non-recurring events)
        3. Recurring events have additional conflict rules
        """
        try:
            # Calculate event end time
            event_end = event.start_time + timedelta(minutes=event.duration)
            
            # Log detailed conflict detection info
            logger.debug(f"Checking conflicts for event: {event}")
            logger.debug(f"Event start: {event.start_time}, Event end: {event_end}")
            
            # Base query for potential conflicts
            query = self.db.query(Event).filter(
                and_(
                    # Exclude the current event if an ID is provided
                    Event.id != (exclude_id or -1),
                    
                    # Check for time overlaps with more precise conditions
                    or_(
                        # Scenario 1: New event completely contains an existing event
                        and_(
                            event.start_time <= Event.start_time,
                            event_end >= Event.start_time + timedelta(minutes=Event.duration)
                        ),
                        # Scenario 2: Existing event completely contains the new event
                        and_(
                            Event.start_time <= event.start_time,
                            Event.start_time + timedelta(minutes=Event.duration) >= event_end
                        ),
                        # Scenario 3: Partial overlap at the start of the event
                        and_(
                            Event.start_time < event_end,
                            Event.start_time + timedelta(minutes=Event.duration) > event.start_time
                        )
                    ),
                    
                    # Additional conditions for non-recurring events
                    or_(
                        # For non-recurring events, check same day
                        and_(
                            ~Event.is_recurring,
                            ~event.is_recurring,
                            Event.start_time.date() == event.start_time.date()
                        ),
                        # For recurring events, check day of week
                        and_(
                            Event.is_recurring,
                            event.is_recurring,
                            # Check if recurring days overlap
                            or_(
                                # If both have recurring days
                                and_(
                                    Event.recurring_days is not None,
                                    event.recurring_days is not None,
                                    # Check for common days
                                    or_(
                                        *[
                                            Event.recurring_days.like(f'%{day}%') 
                                            for day in event.recurring_days or []
                                        ]
                                    )
                                ),
                                # If no specific recurring days, check general recurrence
                                Event.is_recurring
                            )
                        )
                    )
                )
            )
            
            # Log the raw SQL query for debugging
            logger.debug(f"Conflict detection query: {query.statement}")
            
            # Execute query and check for conflicts
            conflicts = query.all()
            
            # Log conflict details
            logger.debug(f"Number of conflicts found: {len(conflicts)}")
            
            if not conflicts:
                return None
            
            # Generate conflict details
            conflict_msgs = []
            for conflict in conflicts:
                conflict_end = conflict.start_time + timedelta(minutes=conflict.duration)
                conflict_msgs.append(
                    f"Conflict with event '{conflict.name}' "
                    f"(from {conflict.start_time.strftime('%Y-%m-%d %H:%M')} "
                    f"to {conflict_end.strftime('%Y-%m-%d %H:%M')}, "
                    f"Recurring: {conflict.is_recurring})"
                )
                
                # Additional logging for each conflict
                logger.debug(f"Conflict details: {conflict_msgs[-1]}")
            
            return "; ".join(conflict_msgs)
            
        except Exception as e:
            logger.error(f"Error checking conflicts: {str(e)}", exc_info=True)
            return None
