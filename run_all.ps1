# Script untuk menjalankan seluruh layanan SuaraLens secara otomatis
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Meluncurkan Semua Layanan SuaraLens (PENS)..." -ForegroundColor Cyan
Write-Host "  1. ML Service   : FastAPI + Ollama Qwen3.5:4B (Port 8000)" -ForegroundColor Yellow
Write-Host "  2. Backend API  : CodeIgniter 4 (Port 8090)" -ForegroundColor Yellow
Write-Host "  3. Frontend Web : Vite React (Port 5173)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Tentukan path Python untuk ML Service
$pythonExe = "$root\ml-service\venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonExe = "python"
    } else {
        $pythonExe = $null
    }
}

# 2. Tentukan path PHP untuk Backend
$phpExe = "php"
if (-not (Get-Command php -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\xampp\php\php.exe") {
        $phpExe = "C:\xampp\php\php.exe"
    }
}

# 3. Pastikan folder writable CodeIgniter 4 tersedia
$writableDirs = @(
    "$root\backend\writable\cache",
    "$root\backend\writable\logs",
    "$root\backend\writable\session",
    "$root\backend\writable\uploads",
    "$root\backend\writable\debugbar"
)
foreach ($dir in $writableDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# 4. Pastikan MySQL berjalan di port 3306
$mysqlRunning = Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction SilentlyContinue
if (-not $mysqlRunning) {
    if (Test-Path "C:\xampp\mysql_start.bat") {
        Write-Host "  Memulai MySQL daemon..." -ForegroundColor Yellow
        Start-Process "C:\xampp\mysql_start.bat" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    }
}

# 5. Jalankan ML Service di jendela PowerShell baru
if ($pythonExe) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; `$env:PYTHONPATH = '$root\notebooks;$root'; & '$pythonExe' -m uvicorn main:app --app-dir ml-service --host 127.0.0.1 --port 8000 --reload"
} else {
    Write-Host "[PERINGATAN] Python tidak ditemukan. Layanan ML Service dilewati (Backend akan menggunakan local fallback)." -ForegroundColor Yellow
}

# 6. Jalankan Backend CodeIgniter 4 di jendela PowerShell baru
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; & '$phpExe' spark serve --host 0.0.0.0 --port 8090"

# 7. Jalankan Frontend Vite di jendela PowerShell baru
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "`nSemua layanan berhasil dibuka di jendela terpisah!" -ForegroundColor Green
Write-Host "Aplikasi dapat diakses di: http://localhost:5173" -ForegroundColor Green

