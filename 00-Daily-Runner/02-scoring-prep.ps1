# ============================================================================
# 02-scoring-prep.ps1 - Scoring Preparation Script
# ============================================================================
# Purpose: Prepares database for manual scoring in Claude Desktop
# Location: D:\PMO-Brain-2.0-Modular\00-Daily-Runner\02-scoring-prep.ps1
# 
# What this does:
# 1. Checks if discovery ran successfully in last 24 hours
# 2. Counts articles needing scoring (pmo_score IS NULL)
# 3. Displays scoring prompt location for copy/paste
# 4. Logs status to operations_log for console tracking
# 5. Waits for user to complete manual scoring in Claude
#
# Dependencies:
# - Discovery must have run successfully
# - Database: D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db
# - Prompt: D:\PMO-Brain-2.0-Modular\00-Daily-Runner\prompts\Content Scoring Prompt v1.3.txt
#
# Manual step required:
# - User must open Claude Desktop
# - Copy/paste scoring prompt
# - Wait for Claude to complete scoring
# - Run next script or click "Mark Complete" in console
#
# Runtime: ~1 minute (preparation only, scoring is manual)
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  SCORING PREPARATION" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Database path
$dbPath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
$promptPath = "D:\PMO-Brain-2.0-Modular\00-Daily-Runner\prompts\Content Scoring Prompt v1.3.txt"

# Check if database exists
if (-not (Test-Path $dbPath)) {
    Write-Host "ERROR: Database not found at $dbPath" -ForegroundColor Red
    exit 1
}

# Check if prompt exists
if (-not (Test-Path $promptPath)) {
    Write-Host "ERROR: Scoring prompt not found at $promptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Step 1: Checking discovery status..." -ForegroundColor Yellow

# Check if discovery ran in last 24 hours (using discovered_at with underscore)
$discoveryCheck = sqlite3 $dbPath "SELECT COUNT(*) FROM daily_insights WHERE discovered_at >= datetime('now', '-24 hours')"

if ($discoveryCheck -eq 0) {
    Write-Host "ERROR: No articles discovered in last 24 hours. Run discovery first." -ForegroundColor Red
    exit 1
}

Write-Host "  Discovery found: $discoveryCheck articles in last 24 hours" -ForegroundColor Green

Write-Host "`nStep 2: Counting unscored articles..." -ForegroundColor Yellow

# Count ALL unscored articles (Discovery already filtered by publish date)
$unscoredCount = sqlite3 $dbPath "SELECT COUNT(*) FROM daily_insights WHERE pmo_score IS NULL OR pmo_score = 0"

Write-Host "  Articles needing scoring: $unscoredCount" -ForegroundColor Green

if ($unscoredCount -eq 0) {
    Write-Host "`nAll articles already scored! Nothing to do." -ForegroundColor Green
    exit 0
}

Write-Host "`nStep 3: Logging status to operations_log..." -ForegroundColor Yellow

# Log to operations_log
sqlite3 $dbPath @"
INSERT INTO operations_log (operation_type, component, status, message, records_processed) 
VALUES ('scoring', '02-scoring-prep', 'ready', 'Ready for manual scoring in Claude Desktop', $unscoredCount);
"@

Write-Host "  Status logged successfully" -ForegroundColor Green

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  READY FOR MANUAL SCORING" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Articles to score: $unscoredCount" -ForegroundColor White
Write-Host "`nScoring Prompt Location:" -ForegroundColor Yellow
Write-Host "  $promptPath" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Open Claude Desktop" -ForegroundColor White
Write-Host "  2. Copy the scoring prompt from above location" -ForegroundColor White
Write-Host "  3. Paste into Claude Desktop" -ForegroundColor White
Write-Host "  4. Wait for Claude to complete scoring (10-15 minutes)" -ForegroundColor White
Write-Host "  5. After scoring completes, run: .\03-fetch-prep.ps1" -ForegroundColor White

Write-Host "`nOpening prompt file in notepad for easy copy..." -ForegroundColor Yellow
Start-Process notepad $promptPath

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")