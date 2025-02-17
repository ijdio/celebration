# Celebration: Event Scheduling Application

## Quick Start with Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/ijdio/celebration.git
cd celebration

# Run the entire application using Docker Compose
npm run compose:up
```

Access the application:
- Frontend: `http://localhost`
- API Endpoints: `http://localhost:8000/api`

## Project Overview

Celebration is a robust event scheduling application that allows users to create, view, and manage recurring and one-time events with intelligent conflict prevention.

### Project Requirements Fulfilled

- Event Creation with Comprehensive Details
  - Event name
  - Specific start time
  - Duration in minutes
  - Support for one-time and weekly recurring events

- Conflict Prevention
  - Prevents scheduling multiple events at the same time

- User Interface
  - Compatible with modern browsers (Chrome, Firefox)
  - Intuitive event viewing and creation

- Data Persistence
  - Server-side storage with SQLite
  - Events persist across browser sessions

## Technologies & Rationale

### Backend (API)
- **Python (FastAPI)**
  - Chosen for its high performance and type safety
  - Automatic API documentation with Swagger
  - Excellent async support
  - Quick development with Pydantic models

- **SQLAlchemy**
  - Powerful ORM for database interactions
  - Supports complex querying and relationship management
  - Database agnostic (easily switchable)

- **Uvicorn**
  - High-performance ASGI server
  - Ideal for async Python web applications

### Frontend
- **Angular**
  - Comprehensive framework with strong typing
  - Robust dependency injection
  - Excellent for complex, scalable applications
  - Strong community support

- **TypeScript**
  - Adds static typing to JavaScript
  - Improves code quality and developer experience

- **Material Design**
  - Consistent, modern UI components
  - Responsive design out of the box

### DevOps & Deployment
- **Docker**
  - Containerization for consistent development and deployment
  - Simplified environment management
  - Easy scaling and portability

- **Docker Compose**
  - Orchestrates multi-container applications
  - Simplifies service configuration and networking

## Local Development

### Prerequisites
- Docker
- Docker Compose
- Node.js (for npm scripts)

### Backend Development

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


### Frontend Development
```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Start development server
ng serve
```

## Available Scripts

### Root Level
```bash
# Install all dependencies
npm run api:install
npm run app:install

# Build Docker images
npm run api:docker:build
npm run app:docker:build

# Run entire application
npm run compose:up

# Stop application
npm run compose:down
```

## Assumptions & Limitations
- Weekly recurring events repeat for a full year
- App displays events in the user's local time
- Backend stores events in UTC-0
- Daylight Savings Time applied for locales that observe it
- Database persists between sessions and browsers in Docker container, reset when container is stopped (easily modified with Volume Mounts)
- SQLite used for simplicity (recommend PostgreSQL for production)
- No user authentication in this version
