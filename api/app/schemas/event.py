from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict

class EventBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    start_time: datetime
    duration: int = Field(..., gt=0, description="Duration in minutes")
    is_recurring: bool = Field(False)
    recurring_days: Optional[List[str]] = Field(None)

    @field_validator('recurring_days', mode='before')
    @classmethod
    def parse_recurring_days(cls, v):
        """Convert comma-separated string to list or return None"""
        if isinstance(v, str):
            return v.split(',') if v else None
        return v

    @field_validator("start_time")
    @classmethod
    def ensure_utc(cls, v):
        if v.tzinfo:
            return v.astimezone(timezone.utc).replace(tzinfo=None)
        return v

    @field_validator("recurring_days")
    @classmethod
    def validate_days(cls, v, info):
        values = info.data
        if values.get("is_recurring"):
            if not v:
                raise ValueError("Days are required for recurring events")
            valid_days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
            if not all(day in valid_days for day in v):
                raise ValueError(f"Days must be one of {valid_days}")
        return v

class EventCreate(EventBase):
    """Schema for creating a new event"""
    model_config = ConfigDict(from_attributes=True)

class EventInDB(EventBase):
    id: int

    class Config:
        from_attributes = True

class EventResponse(EventInDB):
    """Schema for returning event details"""
    model_config = ConfigDict(from_attributes=True)

    @field_validator('recurring_days', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Ensure recurring_days is always a list"""
        if isinstance(v, str):
            return v.split(',') if v else []
        return v or []

class EventList(BaseModel):
    """Schema for returning a list of events"""
    events: List[EventResponse]
