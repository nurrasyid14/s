# Script untuk menjalankan SuaraLens ML Service (FastAPI + Ollama)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Menjalankan SuaraLens ML Service (Port 8000)..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$env:PYTHONPATH = "$PWD\notebooks;$PWD"
& .\ml-service\venv\Scripts\python.exe -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload
