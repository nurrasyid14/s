# ==============================================================================
# SuaraLens Production Health Check Script
# ==============================================================================
# Skrip ini bersifat READ-ONLY dan melakukan verifikasi menyeluruh terhadap
# status operasional seluruh service production SuaraLens:
# 1. Status container Docker (suaralens-prod-*)
# 2. Status kesiapan PostgreSQL (pg_isready)
# 3. Status kesiapan ML Service (/health internal)
# 4. Status kesiapan Ingress Nginx & PHP-FPM Backend (/health HTTP)
# 5. Status ketersediaan Ollama Native Windows di Host (port 11434)
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$NginxUrl = "http://127.0.0.1:8090",

    [Parameter(Mandatory = $false)]
    [string]$OllamaUrl = "http://localhost:11434",

    [Parameter(Mandatory = $false)]
    [string]$TargetModel = "qwen3.5:4b"
)

$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       SUARALENS PRODUCTION SYSTEM HEALTH CHECK          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Waktu Pemeriksaan : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host " Target Nginx URL  : $NginxUrl" -ForegroundColor Gray
Write-Host " Target Ollama URL : $OllamaUrl" -ForegroundColor Gray
Write-Host ""

$allHealthy = $true
$checkResults = @()

# ------------------------------------------------------------------------------
# 1. Pemeriksaan Container Docker Production
# ------------------------------------------------------------------------------
Write-Host "[1/5] Memeriksa status container Docker production..." -ForegroundColor Yellow
$expectedContainers = @(
    "suaralens-prod-db",
    "suaralens-prod-ml",
    "suaralens-prod-backend",
    "suaralens-prod-nginx"
)

foreach ($c in $expectedContainers) {
    $inspectJson = docker inspect $c 2>$null
    if ($LASTEXITCODE -eq 0 -and $inspectJson) {
        $cState = ($inspectJson | ConvertFrom-Json).State
        $status = $cState.Status
        $health = if ($cState.Health) { $cState.Health.Status } else { "no healthcheck" }

        if ($status -eq "running" -and ($health -eq "healthy" -or $health -eq "no healthcheck")) {
            Write-Host "      Container '$c': RUNNING ($health)" -ForegroundColor Green
            $checkResults += [PSCustomObject]@{ Komponen = "Docker: $c"; Status = "HEALTHY"; Detail = "Running ($health)" }
        } else {
            Write-Host "      Container '$c': UNHEALTHY (Status: $status, Health: $health)" -ForegroundColor Red
            $checkResults += [PSCustomObject]@{ Komponen = "Docker: $c"; Status = "FAILED"; Detail = "Status: $status ($health)" }
            $allHealthy = $false
        }
    } else {
        Write-Host "      Container '$c': TIDAK DITEMUKAN" -ForegroundColor Red
        $checkResults += [PSCustomObject]@{ Komponen = "Docker: $c"; Status = "NOT FOUND"; Detail = "Container belum dibuat / tidak aktif" }
        $allHealthy = $false
    }
}

# ------------------------------------------------------------------------------
# 2. Pemeriksaan Koneksi Database PostgreSQL
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Memeriksa kesiapan basis data PostgreSQL..." -ForegroundColor Yellow
$dbCheck = docker exec suaralens-prod-db pg_isready 2>$null
if ($LASTEXITCODE -eq 0 -and $dbCheck -match "accepting connections") {
    Write-Host "      PostgreSQL Ready: $dbCheck" -ForegroundColor Green
    $checkResults += [PSCustomObject]@{ Komponen = "PostgreSQL 16"; Status = "HEALTHY"; Detail = "Menerima koneksi aktif" }
} else {
    Write-Host "      PostgreSQL Not Ready: $dbCheck" -ForegroundColor Red
    $checkResults += [PSCustomObject]@{ Komponen = "PostgreSQL 16"; Status = "FAILED"; Detail = "Tidak merespon pg_isready" }
    $allHealthy = $false
}

# ------------------------------------------------------------------------------
# 3. Pemeriksaan ML Service (FastAPI) Internal
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Memeriksa kesiapan ML Service (FastAPI)..." -ForegroundColor Yellow
$mlCheck = docker exec suaralens-prod-ml curl -s -f http://localhost:8000/health 2>$null
if ($LASTEXITCODE -eq 0 -and $mlCheck) {
    Write-Host "      ML Service Response: $mlCheck" -ForegroundColor Green
    $checkResults += [PSCustomObject]@{ Komponen = "ML Service (FastAPI)"; Status = "HEALTHY"; Detail = "Endpoint /health aktif" }
} else {
    Write-Host "      ML Service Not Responding: $mlCheck" -ForegroundColor Red
    $checkResults += [PSCustomObject]@{ Komponen = "ML Service (FastAPI)"; Status = "FAILED"; Detail = "Gagal menghubungi http://localhost:8000/health" }
    $allHealthy = $false
}

# ------------------------------------------------------------------------------
# 4. Pemeriksaan Ingress Nginx & Backend (PHP-FPM)
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Memeriksa endpoint Nginx & Backend melalui host port..." -ForegroundColor Yellow
try {
    $backendUri = "$($NginxUrl.TrimEnd('/'))/health"
    $response = Invoke-RestMethod -Uri $backendUri -Method Get -TimeoutSec 5 -ErrorAction Stop
    if ($response.status -eq "ok" -or $response.service -eq "suaralens-backend") {
        Write-Host "      Backend Health Check: SUKSES (status=$($response.status), service=$($response.service))" -ForegroundColor Green
        $checkResults += [PSCustomObject]@{ Komponen = "Nginx + PHP-FPM"; Status = "HEALTHY"; Detail = "Endpoint $backendUri mengembalikan HTTP 200 OK" }
    } else {
        Write-Host "      Backend Health Check: Respon tidak terduga: $($response | ConvertTo-Json -Compress)" -ForegroundColor Yellow
        $checkResults += [PSCustomObject]@{ Komponen = "Nginx + PHP-FPM"; Status = "WARNING"; Detail = "Respon JSON tidak sesuai ekspektasi" }
    }
} catch {
    Write-Host "      Gagal menghubungi Nginx pada $backendUri : $($_.Exception.Message)" -ForegroundColor Red
    $checkResults += [PSCustomObject]@{ Komponen = "Nginx + PHP-FPM"; Status = "FAILED"; Detail = $_.Exception.Message }
    $allHealthy = $false
}

# ------------------------------------------------------------------------------
# 5. Pemeriksaan Ketersediaan Ollama Native di Host Windows
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Memeriksa daemon Ollama native di host Windows..." -ForegroundColor Yellow
try {
    $ollamaTagsUri = "$($OllamaUrl.TrimEnd('/'))/api/tags"
    $tagsResponse = Invoke-RestMethod -Uri $ollamaTagsUri -Method Get -TimeoutSec 3 -ErrorAction Stop
    $modelFound = $tagsResponse.models | Where-Object { $_.name -like "$TargetModel*" }

    if ($modelFound) {
        Write-Host "      Ollama Ready: Model '$TargetModel' ditemukan dan tersedia di GPU Host." -ForegroundColor Green
        $checkResults += [PSCustomObject]@{ Komponen = "Ollama Native Windows"; Status = "HEALTHY"; Detail = "Model $TargetModel terpasang" }
    } else {
        Write-Host "      Ollama aktif, tetapi model '$TargetModel' tidak ditemukan di daftar!" -ForegroundColor Red
        $checkResults += [PSCustomObject]@{ Komponen = "Ollama Native Windows"; Status = "WARNING"; Detail = "Model $TargetModel belum diunduh (ollama pull)" }
        $allHealthy = $false
    }
} catch {
    Write-Host "      Daemon Ollama tidak merespon di $($OllamaUrl): $($_.Exception.Message)" -ForegroundColor Red
    $checkResults += [PSCustomObject]@{ Komponen = "Ollama Native Windows"; Status = "FAILED"; Detail = "Daemon Ollama belum dijalankan di host" }
    $allHealthy = $false
}

# ------------------------------------------------------------------------------
# Ringkasan Akhir
# ------------------------------------------------------------------------------
Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "                 TABEL RINGKASAN KESEHATAN                " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
$checkResults | Format-Table -Property Komponen, Status, Detail -AutoSize

if ($allHealthy) {
    Write-Host "KESIMPULAN: SELURUH SISTEM PRODUCTION BEROPERASI DENGAN BAIK (HEALTHY)." -ForegroundColor Green
    exit 0
} else {
    Write-Host "KESIMPULAN: DITEMUKAN MASALAH / KOMPONEN BELUM AKTIF. PERIKSA DETAIL DI ATAS." -ForegroundColor Red
    exit 1
}

