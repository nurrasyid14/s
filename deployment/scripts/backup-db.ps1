# ==============================================================================
# SuaraLens Database Backup & Verification Script (PostgreSQL 16)
# ==============================================================================
# Skrip ini melakukan pencadangan (backup) database PostgreSQL dari container
# Docker yang sedang berjalan, menyimpannya ke direktori host lokal, dan
# melakukan verifikasi integritas arsip secara otomatis menggunakan pg_restore.
# ==============================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$ContainerName = "suaralens-db",

    [Parameter(Mandatory = $false)]
    [string]$Database = "",

    [Parameter(Mandatory = $false)]
    [string]$Username = "",

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = "",

    [Parameter(Mandatory = $false)]
    [ValidateSet("custom", "plain")]
    [string]$Format = "custom"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
    $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
    $OutputDir = Join-Path $scriptDir "../backups"
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     SUARALENS DATABASE BACKUP & VERIFICATION TOOL        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Periksa ketersediaan Docker dan status container
Write-Host "[1/6] Memeriksa status container '$ContainerName'..." -ForegroundColor Yellow
$containerStatus = docker inspect --format '{{.State.Status}}' $ContainerName 2>$null

if ($LASTEXITCODE -ne 0 -or $containerStatus -ne "running") {
    Write-Error "Container '$ContainerName' tidak ditemukan atau sedang tidak berjalan! (Status: $containerStatus)"
    exit 1
}
Write-Host "      Container '$ContainerName' aktif dan berjalan (healthy/running)." -ForegroundColor Green

# 2. Identifikasi Database dan Username secara aktual dari container
Write-Host "[2/6] Mengidentifikasi konfigurasi database secara aktual..." -ForegroundColor Yellow
$containerEnvJson = docker inspect --format '{{json .Config.Env}}' $ContainerName
$containerEnvs = $containerEnvJson | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($Database)) {
    $dbEnv = $containerEnvs | Where-Object { $_ -like "POSTGRES_DB=*" } | Select-Object -First 1
    if ($dbEnv) {
        $Database = $dbEnv.Split("=")[1]
    } else {
        $Database = "suaralens"
    }
}

if ([string]::IsNullOrWhiteSpace($Username)) {
    $userEnv = $containerEnvs | Where-Object { $_ -like "POSTGRES_USER=*" } | Select-Object -First 1
    if ($userEnv) {
        $Username = $userEnv.Split("=")[1]
    } else {
        $Username = "postgres"
    }
}

Write-Host "      Target Database : $Database" -ForegroundColor Gray
Write-Host "      Database User   : $Username" -ForegroundColor Gray
Write-Host "      Kredensial      : [TERLINDUNGI / DIKONFIGURASI OTOMATIS]" -ForegroundColor Gray

# 3. Siapkan direktori penyimpanan host dan penamaan file dengan timestamp
Write-Host "[3/6] Menyiapkan target direktori penyimpanan lokal..." -ForegroundColor Yellow
$resolvedOutputDir = [System.IO.Path]::GetFullPath($OutputDir)
if (-not (Test-Path -Path $resolvedOutputDir)) {
    New-Item -ItemType Directory -Path $resolvedOutputDir -Force | Out-Null
    Write-Host "      Direktori baru dibuat: $resolvedOutputDir" -ForegroundColor Gray
} else {
    Write-Host "      Direktori tujuan: $resolvedOutputDir" -ForegroundColor Gray
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$extension = if ($Format -eq "custom") { "dump" } else { "sql" }
$backupFileName = "suaralens_db_backup_${timestamp}.${extension}"
$containerTempPath = "/tmp/$backupFileName"
$localFilePath = Join-Path $resolvedOutputDir $backupFileName

# 4. Jalankan pg_dump di dalam container
Write-Host "[4/6] Menjalankan pg_dump di dalam container..." -ForegroundColor Yellow
if ($Format -eq "custom") {
    docker exec $ContainerName pg_dump -U $Username -d $Database -Fc -f $containerTempPath
} else {
    docker exec $ContainerName pg_dump -U $Username -d $Database -f $containerTempPath
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Proses pg_dump gagal dengan exit code $LASTEXITCODE!"
    docker exec $ContainerName rm -f $containerTempPath 2>$null
    exit 1
}
Write-Host "      Dump database berhasil dibuat di container ($containerTempPath)." -ForegroundColor Green

# 5. Verifikasi arsip backup
Write-Host "[5/6] Memverifikasi integritas hasil backup..." -ForegroundColor Yellow
$verificationSuccess = $false
$tocCount = 0

if ($Format -eq "custom") {
    $tocList = docker exec $ContainerName pg_restore --list $containerTempPath
    if ($LASTEXITCODE -eq 0 -and $tocList) {
        $tableEntries = $tocList | Where-Object { $_ -match "TABLE DATA public" }
        $tocCount = ($tocList | Measure-Object).Count
        Write-Host "      Verifikasi pg_restore --list: SUKSES" -ForegroundColor Green
        Write-Host "      Total TOC Entries : $tocCount" -ForegroundColor Gray
        Write-Host "      Tabel Ditemukan   : $(($tableEntries | Measure-Object).Count) entri data tabel" -ForegroundColor Gray
        $verificationSuccess = $true
    } else {
        Write-Error "Verifikasi pg_restore --list gagal! Arsip dump rusak atau tidak valid."
        docker exec $ContainerName rm -f $containerTempPath 2>$null
        exit 1
    }
} else {
    $checkOutput = docker exec $ContainerName head -n 20 $containerTempPath
    if ($LASTEXITCODE -eq 0 -and ($checkOutput -match "PostgreSQL database dump")) {
        Write-Host "      Verifikasi plain SQL header: SUKSES" -ForegroundColor Green
        $verificationSuccess = $true
    } else {
        Write-Error "Verifikasi plain SQL dump gagal!"
        docker exec $ContainerName rm -f $containerTempPath 2>$null
        exit 1
    }
}

# 6. Salin file backup ke host lokal dan bersihkan file sementara di container
Write-Host "[6/6] Menyalin file backup ke host dan finalisasi..." -ForegroundColor Yellow
docker cp "${ContainerName}:${containerTempPath}" $localFilePath

if ($LASTEXITCODE -ne 0 -or -not (Test-Path -Path $localFilePath)) {
    Write-Error "Gagal menyalin file backup dari container ke host lokal!"
    docker exec $ContainerName rm -f $containerTempPath 2>$null
    exit 1
}

# Bersihkan file temporer di dalam container
docker exec $ContainerName rm -f $containerTempPath

# Dapatkan informasi ukuran file dan SHA-256 hash di host
$fileItem = Get-Item $localFilePath
$fileSizeKb = [math]::Round($fileItem.Length / 1KB, 2)
$fileHash = (Get-FileHash -Path $localFilePath -Algorithm SHA256).Hash

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "         PENCADANGAN DATABASE BERHASIL & TERVERIFIKASI    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " File Backup : $($fileItem.FullName)" -ForegroundColor White
Write-Host " Ukuran File : $($fileItem.Length) bytes ($fileSizeKb KB)" -ForegroundColor White
Write-Host " Format      : $(if ($Format -eq "custom") { "PostgreSQL Custom Archive (-Fc)" } else { "Plain SQL" })" -ForegroundColor White
Write-Host " SHA-256     : $fileHash" -ForegroundColor White
Write-Host " Verifikasi  : VALID & TERUJI (Exit Code 0)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green

exit 0
