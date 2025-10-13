# ============================================================================
# SMARTPMO.AI AUTOMATION SETUP - PowerShell Version
# ============================================================================
# Run: .\setup-automation.ps1
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "SMARTPMO.AI AUTOMATION SETUP" -ForegroundColor Yellow
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Change to automation directory
Set-Location "D:\PMO-Brain-2.0-Modular\automation"

# Step 1: Check Node.js
Write-Host "[1/5] Checking Node.js installation..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Create .env file
Write-Host "[2/5] Creating .env file..." -ForegroundColor Green
if (-Not (Test-Path ".env")) {
    if (Test-Path ".env.template") {
        Copy-Item ".env.template" ".env"
        Write-Host ".env file created from template" -ForegroundColor White
        Write-Host ""
        Write-Host "IMPORTANT: You need to add your API keys to .env" -ForegroundColor Yellow
        Write-Host "Opening .env file in notepad..." -ForegroundColor White
        Write-Host ""
        Start-Sleep -Seconds 2
        notepad .env
        Write-Host ""
        Write-Host "Save the file after adding your API keys" -ForegroundColor Yellow
        Read-Host "Press Enter after saving to continue"
    } else {
        Write-Host "ERROR: .env.template not found!" -ForegroundColor Red
        Write-Host "Please make sure .env.template exists in the automation folder" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host ".env already exists - skipping" -ForegroundColor White
}

# Step 3: Install dependencies
Write-Host ""
Write-Host "[3/5] Installing Node.js dependencies..." -ForegroundColor Green
Write-Host "This may take a few minutes..." -ForegroundColor White
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 4: Test database connection
Write-Host ""
Write-Host "[4/5] Testing database connection..." -ForegroundColor Green
$testScript = @"
const DatabaseManager = require('./modules/DatabaseManager');
const db = new DatabaseManager('../02-discovery-engine/pmo_insights.db');
db.initialize()
  .then(() => {
    console.log('✅ Database connection OK');
    return db.close();
  })
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Database error:', e.message);
    process.exit(1);
  });
"@

$testScript | node
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Database connection failed!" -ForegroundColor Red
    Write-Host "Please check that pmo_insights.db exists in 02-discovery-engine folder" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 5: Run quick test
Write-Host ""
Write-Host "[5/5] Running quick test..." -ForegroundColor Green
Write-Host "Testing discovery engine (this will take about 2 minutes)..." -ForegroundColor White
Write-Host ""
npm run discovery
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "WARNING: Test had some issues, but setup is complete." -ForegroundColor Yellow
    Write-Host "You may need to check your API keys in .env" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "✅ Test successful!" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your automation system is ready. Here's what to do next:" -ForegroundColor White
Write-Host ""
Write-Host "1. Make sure your .env file has valid API keys:" -ForegroundColor Yellow
Write-Host "   - GEMINI_API_KEY (required - get from https://ai.google.dev)" -ForegroundColor White
Write-Host "   - JINA_API_KEY (required - get from https://jina.ai)" -ForegroundColor White
Write-Host ""
Write-Host "2. Test the full pipeline:" -ForegroundColor Yellow
Write-Host "   npm test" -ForegroundColor White
Write-Host ""
Write-Host "3. Run manually:" -ForegroundColor Yellow
Write-Host "   npm start" -ForegroundColor White
Write-Host ""
Write-Host "4. Schedule daily runs:" -ForegroundColor Yellow
Write-Host "   - Option A: Use GitHub Actions (recommended)" -ForegroundColor White
Write-Host "   - Option B: Use Windows Task Scheduler" -ForegroundColor White
Write-Host ""
Write-Host "5. Monitor at: http://localhost:8080/console" -ForegroundColor Yellow
Write-Host ""
Write-Host "See AUTOMATION-SETUP.md for detailed instructions." -ForegroundColor White
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"