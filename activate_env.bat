@echo off
echo ============================================
echo  SuaraLens Virtual Environment Activator
echo ============================================

:: Activate venv
call .venv\Scripts\activate.bat

:: Set PYTHONPATH supaya modules/ bisa diimport dari mana saja
set PYTHONPATH=%CD%\notebooks;%CD%

echo.
echo [OK] Virtual environment aktif: .venv
echo [OK] PYTHONPATH set ke: %PYTHONPATH%
echo.
echo Perintah berguna:
echo   jupyter notebook                  -- jalankan Jupyter
echo   python notebooks\modules\analytics.py  -- test modul langsung
echo   deactivate                        -- keluar dari venv
echo.
