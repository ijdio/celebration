from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Index, event
from sqlalchemy.ext.hybrid import hybrid_property
from app.db.base import Base

class Event(Base):
    __tablename__ = "events"
    
    # Add table-level indexes
    __table_args__ = (
        Index('ix_events_start_time_duration', 'start_time', 'duration'),
        Index('ix_events_recurring', 'is_recurring', 'recurring_days'),
    )

    # Columns
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False, index=True)
    duration = Column(Integer, nullable=False)  # Duration in minutes
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_days = Column(String(20), nullable=True)  # Store as comma-separated string

    @hybrid_property
    def end_time(self):
        """Calculate the end time based on start time and duration"""
        return self.start_time + timedelta(minutes=self.duration)

    @property
    def recurring_days_list(self):
        """Convert comma-separated string to list"""
        if not self.recurring_days:
            return []
        return self.recurring_days.split(',')

    @recurring_days_list.setter
    def recurring_days_list(self, days):
        """Convert list to comma-separated string"""
        if not days:
            self.recurring_days = None
        else:
            self.recurring_days = ','.join(sorted(days))  # Sort for consistent storage

    def __repr__(self):
        return f"<Event {self.name} at {self.start_time}>"

# SQLite datetime handling
@event.listens_for(Event, 'before_insert')
@event.listens_for(Event, 'before_update')
def validate_and_format_datetime(mapper, connection, target):
    """Ensure datetime is stored in UTC format"""
    if target.start_time and target.start_time.tzinfo:
        target.start_time = target.start_time.astimezone().replace(tzinfo=None)
