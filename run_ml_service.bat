@echo off
echo ============================================================
echo   Menjalankan SuaraLens ML Service (FastAPI + Ollama)
echo ============================================================
echo.
set PYTHONPATH=%CD%\notebooks;%CD%

:: Utamakan virtualenv utama proyek (.venv), fallback ke ml-service\venv
set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=%CD%\ml-service\venv\Scripts\python.exe"

"%PYTHON_EXE%" -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload
pause
