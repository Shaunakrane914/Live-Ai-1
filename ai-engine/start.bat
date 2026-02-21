@echo off
echo.
echo ============================================
echo   AegisGrid AI Engine — Startup Script
echo   Python 3.11+ required
echo ============================================
echo.

:: Check if venv exists, create if not
IF NOT EXIST "venv\" (
    echo [1/3] Creating virtual environment...
    python -m venv venv
) ELSE (
    echo [1/3] Virtual environment found.
)

:: Activate venv
echo [2/3] Activating venv and installing deps...
CALL venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

:: Start server
echo [3/3] Starting FastAPI server on http://localhost:8000
echo.
echo   Health:    http://localhost:8000/health
echo   State:     http://localhost:8000/state
echo   Docs:      http://localhost:8000/docs
echo   WebSocket: ws://localhost:8000/ws
echo.
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
