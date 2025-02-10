from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    """Application configuration settings"""
    PROJECT_NAME: str = "Celebration POC"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    
    # Database configuration
    DATABASE_URL: str = "sqlite:///./events.db"
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    
    # CORS configuration
    ALLOWED_HOSTS: list[str] = ["*"]
    
    # Optional: Load environment-specific settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache
def get_settings() -> Settings:
    """Singleton to get application settings"""
    return Settings()
