# Celebration Event Scheduler

A modern web application for scheduling and managing events with support for recurring events.

## Features

- Create and view scheduled events
- Support for one-time and recurring weekly events
- Automatic timezone handling and UTC storage
- Conflict detection for overlapping events
- Modern, responsive UI using FullCalendar
- RESTful API using FastAPI

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy (with SQLite)
- Pydantic for data validation

### Frontend
- Angular 17
- FullCalendar with Recurring Events plugin
- Moment.js for timezone handling
- Angular Material for UI components

## Prerequisites

- Python 3.11 or higher
- Node.js 18.x or higher
- npm 9.x or higher

## Project Structure

```
celebration-poc/
├── api/                    # Backend FastAPI application
│   ├── alembic/           # Database migrations
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   └── api/          # API routes
│   ├── tests/            # Backend tests
│   └── requirements.txt   # Python dependencies
│
├── app/                   # Frontend Angular application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── models/
│   │   ├── assets/
│   │   └── styles/
│   └── package.json
│
└── docker/               # Docker configuration
    ├── Dockerfile.api
    └── Dockerfile.app
```

## Getting Started

### Backend Setup

1. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd api
   pip install -r requirements.txt
   ```

3. Run migrations:
   ```bash
   alembic upgrade head
   ```

4. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd app
   npm install
   ```

2. Start the development server:
   ```bash
   ng serve
   ```

The application will be available at:
- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development

### Backend Development

The backend uses FastAPI with SQLAlchemy for the ORM. Key points:

- All times are stored in UTC
- Database migrations are handled by Alembic
- API documentation is auto-generated using OpenAPI
- Input validation using Pydantic models

### Frontend Development

The frontend is built with Angular and uses:

- FullCalendar for event display
- Moment.js for timezone handling
- Reactive forms for event creation
- Angular Material for styling

## Testing

### Backend Tests

Run the backend tests with:
```bash
cd api
pytest
```

### Frontend Tests

Run the frontend tests with:
```bash
cd app
ng test
```

## Docker Support

Build and run with Docker:

```bash
docker-compose up --build
```

## Assumptions

1. Events are stored in UTC timezone
2. Frontend handles timezone conversion using Moment.js
3. No authentication required (single-user system)
4. SQLite is sufficient for persistence
5. Recurring events are limited to weekly patterns

## License

MIT License - see LICENSE file for details
