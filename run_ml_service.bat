@echo off
echo ============================================================
echo   Menjalankan SuaraLens ML Service (FastAPI + Ollama)
echo ============================================================
echo.
set PYTHONPATH=%CD%\notebooks;%CD%
.\ml-service\venv\Scripts\python.exe -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload
pause
