# stop-console.ps1
# ============================================================================
# SmartPMO Console - Stop Script
# ============================================================================

Write-Host "`n🛑 Stopping SmartPMO Console..." -ForegroundColor Yellow

$consoleDir = "D:\PMO-Brain-2.0-Modular\01-Management-Console\public"

# Find running node processes in console directory
$processes = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*01-Management-Console*" -or $_.CommandLine -like "*server.js*" }

if (-not $processes) {
    Write-Host "✓ No console processes found running" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($processes.Count) console process(es):" -ForegroundColor White
$processes | ForEach-Object {
    Write-Host "  - PID: $($_.Id) | Memory: $([math]::Round($_.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
}

Write-Host "`nStop all console processes? (Y/N): " -ForegroundColor Yellow -NoNewline
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    foreach ($process in $processes) {
        try {
            Write-Host "Stopping PID $($process.Id)..." -ForegroundColor White
            Stop-Process -Id $process.Id -Force
            Write-Host "  ✓ Stopped" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed: $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✅ Console stopped successfully" -ForegroundColor Green
    
    # Also clean up any PowerShell jobs
    $jobs = Get-Job | Where-Object { $_.Command -like "*server.js*" }
    if ($jobs) {
        Write-Host "Cleaning up PowerShell jobs..." -ForegroundColor Yellow
        $jobs | Remove-Job -Force
        Write-Host "  ✓ Jobs cleaned" -ForegroundColor Green
    }
    
} else {
    Write-Host "Cancelled." -ForegroundColor Gray
}

Write-Host ""