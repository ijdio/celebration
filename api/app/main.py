import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG to capture all log levels
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # Output to console
    ]
)

# Set loggers to DEBUG level
logging.getLogger().setLevel(logging.DEBUG)
logging.getLogger('uvicorn').setLevel(logging.DEBUG)
logging.getLogger('app').setLevel(logging.DEBUG)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.endpoints import events
from app.db.session import SessionLocal
from app.db.base import Base, engine
from app.models import event  # Explicitly import models to ensure they are loaded

# Ensure tables are created
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Celebration Event Scheduler")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(events.router, prefix="/api/events", tags=["events"])

# Optional: Add health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    # Ensure tables are created when script is run directly
    Base.metadata.create_all(bind=engine)
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
