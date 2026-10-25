# Script untuk menjalankan seluruh layanan SuaraLens secara otomatis
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Meluncurkan Semua Layanan SuaraLens (PENS)..." -ForegroundColor Cyan
Write-Host "  1. ML Service   : FastAPI + Ollama Qwen3:8B (Port 8000)" -ForegroundColor Yellow
Write-Host "  2. Backend API  : CodeIgniter 4 (Port 8080)" -ForegroundColor Yellow
Write-Host "  3. Frontend Web : Vite React (Port 5173)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Jalankan ML Service di jendela PowerShell baru
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; `$env:PYTHONPATH = '$root\notebooks;$root'; & '.\ml-service\venv\Scripts\python.exe' -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload"

# 2. Jalankan Backend CodeIgniter 4 di jendela PowerShell baru
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; php spark serve --port 8080"

# 3. Jalankan Frontend Vite di jendela PowerShell baru
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nSemua layanan berhasil dibuka di jendela terpisah!" -ForegroundColor Green
Write-Host "Aplikasi dapat diakses di: http://localhost:5173" -ForegroundColor Green
