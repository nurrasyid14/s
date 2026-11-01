# Script untuk menghentikan seluruh layanan SuaraLens (Port 8000, 8090, 5173)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Menghentikan Seluruh Layanan SuaraLens..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "ML Service (FastAPI)"; Port = 8000 },
    @{ Name = "Backend API (CI4)";   Port = 8090 },
    @{ Name = "Frontend Web (Vite)";  Port = 5173 }
)

foreach ($svc in $services) {
    $port = $svc.Port
    $name = $svc.Name
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 4) {
                try {
                    # /T ikut menghentikan child process (mis. worker uvicorn --reload)
                    taskkill /PID $procId /T /F | Out-Null
                    Write-Host "  [OK] $name pada port $port (PID: $procId) berhasil dihentikan." -ForegroundColor Green
                } catch {
                    Write-Host "  [!] Gagal menghentikan PID $procId" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  [-] $name pada port $port tidak sedang berjalan." -ForegroundColor Gray
    }
}

# Hentikan sisa proses reloader uvicorn yang mungkin masih hidup tanpa memegang port
$projectPath = $PSScriptRoot
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.CommandLine -and
        $_.CommandLine -like "*$projectPath*" -and
        $_.CommandLine -match 'uvicorn\s+main:app'
    } |
    ForEach-Object {
        taskkill /PID $_.ProcessId /T /F | Out-Null
        Write-Host "  [OK] Proses reloader ML Service (PID: $($_.ProcessId)) dihentikan." -ForegroundColor Green
    }

Write-Host "`nSemua layanan SuaraLens telah dinonaktifkan." -ForegroundColor Green
