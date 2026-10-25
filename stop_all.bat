@echo off
title SuaraLens - Stop All Services
echo ============================================================
echo   Menghentikan Seluruh Layanan SuaraLens
echo   Port 8000 (ML), 8080 (Backend), 5173 (Frontend)
echo ============================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_all.ps1"
echo.
pause
