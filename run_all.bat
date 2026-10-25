@echo off
title SuaraLens - Multi Service Launcher
echo ============================================================
echo   Menjalankan Seluruh Layanan SuaraLens
echo   1. ML Service   : FastAPI + Ollama Qwen3:8B (Port 8000)
echo   2. Backend API  : CodeIgniter 4 (Port 8080)
echo   3. Frontend Web : Vite React (Port 5173)
echo ============================================================
echo.

:: 1. Jalankan ML Service di jendela baru
start "SuaraLens - ML Service (Port 8000)" cmd /k "cd /d %CD% && set PYTHONPATH=%CD%\notebooks;%CD% && .\ml-service\venv\Scripts\python.exe -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload"

:: 2. Jalankan Backend PHP di jendela baru
start "SuaraLens - Backend CI4 (Port 8080)" cmd /k "cd /d %CD%\backend && php spark serve --port 8080"

:: 3. Jalankan Frontend di jendela baru
start "SuaraLens - Frontend React (Port 5173)" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo Seluruh layanan telah dibuka di jendela terminal masing-masing!
echo Aplikasi frontend dapat diakses di: http://localhost:5173
echo.
pause
