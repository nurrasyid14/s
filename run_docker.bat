@echo off
setlocal
title SuaraLens - Full-Stack Docker

echo ============================================================
echo   Meluncurkan SuaraLens Full-Stack (Docker Mode)...
echo   - Database   : PostgreSQL 16 (Port 5432)
echo   - ML Service : FastAPI + HuggingFace/Ollama (Port 8000)
echo   - Backend    : CodeIgniter 4 + PHP 8.2 (Port 8090)
echo   - Frontend   : Vite React (Port 5173)
echo ============================================================

docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Docker Desktop belum aktif!
    echo Silakan buka aplikasi Docker Desktop di Windows terlebih dahulu, lalu coba lagi.
    echo.
    pause
    exit /b 1
)

echo.
echo [1/3] Membangun dan menjalankan kontainer Docker...
docker compose up --build -d
if errorlevel 1 (
    echo.
    echo [ERROR] Gagal menjalankan kontainer Docker.
    pause
    exit /b 1
)

echo.
echo [2/3] Memeriksa status kontainer...
timeout /t 3 /nobreak >nul
docker compose ps

echo.
echo ============================================================
echo   Seluruh layanan SuaraLens berhasil dijalankan!
echo ============================================================
echo   Frontend Web      : http://localhost:5173
echo   Backend API       : http://localhost:8090
echo   ML API Docs       : http://localhost:8000/docs
echo   PostgreSQL DB     : localhost:5432 (db: suaralens, user: postgres)
echo ------------------------------------------------------------
echo   Akun Uji Coba (Demo):
echo   - Admin       : admin@pens.ac.id       (pw: admin123)
echo   - Stakeholder : sari@pens.ac.id        (pw: password123)
echo   - Mahasiswa   : budi@student.pens.ac.id (pw: password123)
echo ------------------------------------------------------------
echo   Untuk melihat log     : docker compose logs -f
echo   Untuk menghentikan    : stop_docker.bat (atau docker compose down)
echo ============================================================
echo.
pause

