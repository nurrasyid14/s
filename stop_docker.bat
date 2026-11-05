@echo off
setlocal
title Stop SuaraLens Docker

echo Menghentikan seluruh kontainer SuaraLens...
docker compose down
echo Semua kontainer SuaraLens telah dihentikan.
pause

