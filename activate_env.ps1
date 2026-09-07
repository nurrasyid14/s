# SuaraLens — Activation Helper (PowerShell)

# Activate virtual environment
& .\.venv\Scripts\Activate.ps1

# Set PYTHONPATH supaya modules/ bisa diimport dari notebooks maupun root
$env:PYTHONPATH = "$PWD\notebooks;$PWD"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SuaraLens Virtual Environment Aktif" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[OK] Venv   : .venv" -ForegroundColor Green
Write-Host "[OK] Python : $((Get-Command python).Source)" -ForegroundColor Green
Write-Host "[OK] PYTHONPATH : $env:PYTHONPATH" -ForegroundColor Green
Write-Host ""
Write-Host "Perintah berguna:" -ForegroundColor Yellow
Write-Host "  jupyter notebook                          -- jalankan Jupyter"
Write-Host "  jupyter lab                               -- jalankan JupyterLab"
Write-Host "  python notebooks\modules\analytics.py    -- test modul"
Write-Host "  python generate_data.py --n 1000 --months 3  -- generate data"
Write-Host "  deactivate                                -- keluar dari venv"
Write-Host ""
