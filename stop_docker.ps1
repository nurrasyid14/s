# Script untuk menghentikan seluruh layanan SuaraLens Docker
Write-Host "Menghentikan seluruh kontainer SuaraLens..." -ForegroundColor Cyan
docker compose down
Write-Host "Semua kontainer SuaraLens telah dihentikan." -ForegroundColor Green

