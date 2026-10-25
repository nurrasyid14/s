# Script untuk menghentikan seluruh layanan SuaraLens (Port 8000, 8080, 5173)
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Menghentikan Seluruh Layanan SuaraLens..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$services = @(
    @{ Name = "ML Service (FastAPI)"; Port = 8000 },
    @{ Name = "Backend API (CI4)";   Port = 8080 },
    @{ Name = "Frontend Web (Vite)";  Port = 5173 }
)

foreach ($svc in $services) {
    $port = $svc.Port
    $name = $svc.Name
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            if ($procId -gt 4) {
                try {
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
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

Write-Host "`nSemua layanan SuaraLens telah dinonaktifkan." -ForegroundColor Green
