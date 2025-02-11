# Celebration Event Scheduler - Backend API

## Overview
This is the backend API for the Celebration Event Scheduler, built using FastAPI, SQLAlchemy, and Python. The API provides robust event management functionality with comprehensive logging, database integration, and RESTful endpoints.

## Technologies Used
- **Web Framework**: FastAPI (v0.109.0)
- **ASGI Server**: Uvicorn (v0.27.0)
- **Database ORM**: SQLAlchemy (v2.0.25)
- **Data Validation**: Pydantic (v2.5.3)
- **Database Migrations**: Alembic (v1.13.1)
- **Environment Management**: python-dotenv (v1.0.0)
- **Python Version**: 3.11+

## Project Structure
```
api/
├── app/
│   ├── api/           # API endpoint definitions
│   ├── core/          # Core configuration and settings
│   ├── db/            # Database session and base configurations
│   ├── models/        # SQLAlchemy database models
│   ├── schemas/       # Pydantic validation schemas
│   ├── services/      # Business logic and service layers
│   └── main.py        # FastAPI application entry point
├── tests/             # Unit and integration tests
├── Dockerfile         # Docker containerization configuration
├── requirements.txt   # Python package dependencies
└── setup.py           # Package configuration
```

## Prerequisites
- Python 3.11+
- pip
- (Optional) Docker

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd celebration-2/api
```

### 2. Create Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create a `.env` file in the `api` directory with the following variables:
```
DATABASE_URL=sqlite:///./events.db
LOG_LEVEL=DEBUG
```

### 5. Run the Application
```bash
# Development mode
uvicorn app.main:app --reload

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Docker Deployment

### Build Docker Image
```bash
docker build -t celebration-api .
```

### Run Docker Container
```bash
docker run -p 8000:8000 celebration-api
```

## Running Tests
```bash
# Ensure you're in the api directory
pytest tests/
```

## API Endpoints
- `GET /api/events`: Retrieve all events
- `POST /api/events`: Create a new event
- `GET /api/events/{event_id}`: Retrieve a specific event
- `PUT /api/events/{event_id}`: Update an existing event
- `DELETE /api/events/{event_id}`: Delete an event
- `GET /health`: Health check endpoint

## Security Features
- CORS middleware configured to allow all origins (customize in `main.py`)
- Comprehensive logging with configurable log levels
- Input validation using Pydantic schemas

## Logging
Logging is configured to output to console with the following characteristics:
- Log Level: DEBUG (configurable)
- Format: `%(asctime)s - %(name)s - %(levelname)s - %(message)s`
