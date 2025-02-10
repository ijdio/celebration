#!/usr/bin/env pwsh

# Change to the API directory
Set-Location -Path ".\api"

# Create virtual environment if it doesn't exist
if (-Not (Test-Path -Path ".\venv")) {
    python -m venv venv
}

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

try {
    # Run the database reset script
    python run_recreate_db.py
    Write-Host "Database reset successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error resetting database: $_" -ForegroundColor Red
} finally {
    # Deactivate virtual environment
    deactivate
}

# Return to original directory
Set-Location -Path ..
