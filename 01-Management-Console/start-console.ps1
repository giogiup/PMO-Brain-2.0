# start-console.ps1
# ============================================================================
# SmartPMO Console - Daily Startup Script
# ============================================================================

$consoleDir = "D:\PMO-Brain-2.0-Modular\01-Management-Console\public"
$consoleUrl = "http://localhost:8080/console.html"

Write-Host "`n🎯 Starting SmartPMO Management Console..." -ForegroundColor Cyan

# Check if already running
$existingProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | 
    Where-Object { $_.Path -like "*01-Management-Console*" }

if ($existingProcess) {
    Write-Host "⚠️  Console already running (PID: $($existingProcess.Id))" -ForegroundColor Yellow
    Write-Host "Would you like to:" -ForegroundColor White
    Write-Host "  1. Open browser only" -ForegroundColor White
    Write-Host "  2. Restart console" -ForegroundColor White
    Write-Host "  3. Exit" -ForegroundColor White
    Write-Host "`nChoice (1/2/3): " -ForegroundColor Yellow -NoNewline
    $choice = Read-Host
    
    switch ($choice) {
        "1" {
            Write-Host "Opening browser..." -ForegroundColor Green
            Start-Process $consoleUrl
            exit
        }
        "2" {
            Write-Host "Stopping existing process..." -ForegroundColor Yellow
            Stop-Process -Id $existingProcess.Id -Force
            Start-Sleep -Seconds 2
        }
        "3" {
            Write-Host "Exiting..." -ForegroundColor Gray
            exit
        }
        default {
            Write-Host "Invalid choice. Exiting..." -ForegroundColor Red
            exit
        }
    }
}

# Check if directory exists
if (-not (Test-Path $consoleDir)) {
    Write-Host "❌ Console directory not found: $consoleDir" -ForegroundColor Red
    exit 1
}

# Check if server.js exists
$serverPath = "$consoleDir\server.js"
if (-not (Test-Path $serverPath)) {
    Write-Host "❌ server.js not found at: $serverPath" -ForegroundColor Red
    exit 1
}

# Start the console
Write-Host "✅ Starting console server..." -ForegroundColor Green
Write-Host "📍 Location: $consoleDir" -ForegroundColor White

# Start server in background
$job = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    node server.js
} -ArgumentList $consoleDir

# Wait for server to start
Write-Host "⏳ Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Check if server started successfully
$jobState = Get-Job -Id $job.Id
if ($jobState.State -eq "Running") {
    Write-Host "✅ Console server running (Job ID: $($job.Id))" -ForegroundColor Green
    Write-Host "🌐 URL: $consoleUrl" -ForegroundColor Cyan
    
    # Open browser
    Write-Host "🔗 Opening browser..." -ForegroundColor Green
    Start-Sleep -Seconds 1
    Start-Process $consoleUrl
    
    Write-Host "`n" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  Console Running Successfully! 🎉" -ForegroundColor Green
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "`nTo stop the console:" -ForegroundColor Yellow
    Write-Host "  Stop-Job -Id $($job.Id)" -ForegroundColor White
    Write-Host "  Remove-Job -Id $($job.Id)" -ForegroundColor White
    Write-Host "`nOr run: .\stop-console.ps1" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Failed to start console server" -ForegroundColor Red
    Write-Host "Check the error below:" -ForegroundColor Yellow
    Receive-Job -Id $job.Id
    Remove-Job -Id $job.Id
    exit 1
}

Write-Host "`nPress any key to exit (console will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")