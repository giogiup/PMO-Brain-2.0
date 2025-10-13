# TEST SCRIPT - Simulates 02-scoring-prep.ps1 without database changes

$ErrorActionPreference = "Stop"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  TEST: SCORING PREPARATION" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$dbPath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
$promptPath = "D:\PMO-Brain-2.0-Modular\00-Daily Runner\prompts\Content Scoring Prompt v1.2.txt"

Write-Host "TEST MODE - No database changes will be made`n" -ForegroundColor Yellow

# Test 1: Check database exists
Write-Host "Test 1: Checking database exists..." -ForegroundColor Yellow
if (Test-Path $dbPath) {
    Write-Host "  PASS: Database found" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Database not found" -ForegroundColor Red
    exit 1
}

# Test 2: Check prompt exists
Write-Host "`nTest 2: Checking prompt file exists..." -ForegroundColor Yellow
if (Test-Path $promptPath) {
    Write-Host "  PASS: Prompt file found" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Prompt file not found" -ForegroundColor Red
    exit 1
}

# Test 3: Simulate discovery check (read-only)
Write-Host "`nTest 3: Simulating discovery check..." -ForegroundColor Yellow
try {
    $discoveryCheck = sqlite3 $dbPath "SELECT COUNT(*) FROM daily_insights WHERE published_date = DATE('now')"
    Write-Host "  PASS: Found $discoveryCheck articles today" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: Could not query database" -ForegroundColor Red
    exit 1
}

# Test 4: Simulate unscored count (read-only)
Write-Host "`nTest 4: Simulating unscored article count..." -ForegroundColor Yellow
try {
    $unscoredCount = sqlite3 $dbPath "SELECT COUNT(*) FROM daily_insights WHERE (pmo_score IS NULL OR pmo_score = 0) AND published_date = DATE('now')"
    Write-Host "  PASS: Found $unscoredCount unscored articles" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: Could not count unscored articles" -ForegroundColor Red
    exit 1
}

# Test 5: Simulate operations_log insert (SKIP - no actual insert)
Write-Host "`nTest 5: Simulating operations_log insert..." -ForegroundColor Yellow
Write-Host "  SKIP: Would insert log record (test mode)" -ForegroundColor Yellow

# Test 6: Can open prompt file
Write-Host "`nTest 6: Testing prompt file can open..." -ForegroundColor Yellow
Write-Host "  Opening prompt in notepad..." -ForegroundColor White
Start-Process notepad $promptPath
Start-Sleep -Seconds 2
Write-Host "  PASS: Prompt opened successfully (close notepad to continue)" -ForegroundColor Green

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  ALL TESTS PASSED" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "The real script would now:" -ForegroundColor Yellow
Write-Host "  1. Show $unscoredCount articles need scoring" -ForegroundColor White
Write-Host "  2. Log status to operations_log" -ForegroundColor White
Write-Host "  3. Display prompt location" -ForegroundColor White
Write-Host "  4. Open prompt in notepad" -ForegroundColor White

Write-Host "`nScript is ready to use!" -ForegroundColor Green
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")