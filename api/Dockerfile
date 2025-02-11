# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /api

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/api

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 curl && \
    rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml ./

# Install project dependencies
RUN pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings alembic python-dotenv

# Copy the rest of the application
COPY . .

# Expose port for the application
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
