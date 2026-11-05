# Script untuk meluncurkan SuaraLens Full-Stack via Docker
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Meluncurkan SuaraLens Full-Stack (Docker Mode)..." -ForegroundColor Cyan
Write-Host "  - Database   : PostgreSQL 16 (Port 5432)" -ForegroundColor Yellow
Write-Host "  - ML Service : FastAPI + HuggingFace/Ollama (Port 8000)" -ForegroundColor Yellow
Write-Host "  - Backend    : CodeIgniter 4 + PHP 8.2 (Port 8090)" -ForegroundColor Yellow
Write-Host "  - Frontend   : Vite React (Port 5173)" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Pastikan Docker Daemon aktif
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Docker Desktop belum aktif!" -ForegroundColor Red
    Write-Host "Silakan buka aplikasi Docker Desktop di Windows terlebih dahulu, lalu jalankan script ini kembali.`n" -ForegroundColor Yellow
    exit 1
}

# 2. Build dan jalankan seluruh container
Write-Host "`n[1/3] Membangun dan menjalankan kontainer Docker..." -ForegroundColor Cyan
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Gagal menjalankan kontainer Docker." -ForegroundColor Red
    exit 1
}

# 3. Cek status kontainer
Write-Host "`n[2/3] Memeriksa status kontainer..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
docker compose ps

# 4. Berikan informasi akses
Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  Seluruh layanan SuaraLens berhasil dijalankan!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Frontend Web      : http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API       : http://localhost:8090" -ForegroundColor White
Write-Host "  ML API Docs       : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  PostgreSQL DB     : localhost:5432 (db: suaralens, user: postgres)" -ForegroundColor White
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Akun Uji Coba (Demo):" -ForegroundColor Yellow
Write-Host "  - Admin       : admin@pens.ac.id       (pw: admin123)" -ForegroundColor White
Write-Host "  - Stakeholder : sari@pens.ac.id        (pw: password123)" -ForegroundColor White
Write-Host "  - Mahasiswa   : budi@student.pens.ac.id (pw: password123)" -ForegroundColor White
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Untuk melihat log     : docker compose logs -f" -ForegroundColor DarkGray
Write-Host "  Untuk menghentikan    : .\stop_docker.ps1 (atau docker compose down)" -ForegroundColor DarkGray
Write-Host "============================================================`n" -ForegroundColor Green

