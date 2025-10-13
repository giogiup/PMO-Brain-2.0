# ============================================================================
# SmartPMO Console - Test Script
# Verifies all components are working correctly
# ============================================================================

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  SmartPMO Console Test Suite" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:8080"
$testsPassed = 0
$testsFailed = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "`nTesting: $Name" -ForegroundColor White
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -TimeoutSec 5
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  ✓ PASS - Status $($response.StatusCode)" -ForegroundColor Green
            
            # Try to parse JSON if it's an API endpoint
            if ($Url -like "*/api/*") {
                try {
                    $json = $response.Content | ConvertFrom-Json
                    Write-Host "  ✓ Valid JSON response" -ForegroundColor Green
                } catch {
                    Write-Host "  ! Warning: Response is not JSON" -ForegroundColor Yellow
                }
            }
            
            return $true
        } else {
            Write-Host "  ✗ FAIL - Status $($response.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ FAIL - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Test 1: Check if server is running
Write-Host "`n[Test 1/15] Server Status" -ForegroundColor Cyan
$serverRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($serverRunning) {
    Write-Host "  ✓ Node.js process running (PID: $($serverRunning.Id))" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "  ✗ No Node.js process found" -ForegroundColor Red
    Write-Host "  → Start console with: .\start-console.ps1" -ForegroundColor Yellow
    $testsFailed++
    exit 1
}

# Test 2: Console HTML loads
Write-Host "`n[Test 2/15] Console HTML" -ForegroundColor Cyan
if (Test-Endpoint "Console HTML" "$baseUrl/console.html") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 3: Dashboard Stats API
Write-Host "`n[Test 3/15] Dashboard Stats API" -ForegroundColor Cyan
if (Test-Endpoint "Dashboard Stats" "$baseUrl/api/dashboard/stats") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 4: Discovery Stats API
Write-Host "`n[Test 4/15] Discovery Stats API" -ForegroundColor Cyan
if (Test-Endpoint "Discovery Stats" "$baseUrl/api/discovery/stats") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 5: Discovery Recent API
Write-Host "`n[Test 5/15] Discovery Recent API" -ForegroundColor Cyan
if (Test-Endpoint "Discovery Recent" "$baseUrl/api/discovery/recent?limit=10") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 6: Sources API
Write-Host "`n[Test 6/15] Sources API" -ForegroundColor Cyan
if (Test-Endpoint "Sources List" "$baseUrl/api/sources") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 7: Pre-Filter Config API
Write-Host "`n[Test 7/15] Pre-Filter Config API" -ForegroundColor Cyan
if (Test-Endpoint "Pre-Filter Config" "$baseUrl/api/prefilter/config") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 8: Pre-Filter Keywords API
Write-Host "`n[Test 8/15] Pre-Filter Keywords API" -ForegroundColor Cyan
if (Test-Endpoint "Pre-Filter Keywords" "$baseUrl/api/prefilter/keywords") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 9: Prompts Active API
Write-Host "`n[Test 9/15] Active Prompts API" -ForegroundColor Cyan
if (Test-Endpoint "Active Prompts" "$baseUrl/api/prompts/active") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 10: Backlog API
Write-Host "`n[Test 10/15] Backlog API" -ForegroundColor Cyan
if (Test-Endpoint "Backlog Tasks" "$baseUrl/api/backlog") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 11: Operations API
Write-Host "`n[Test 11/15] Operations API" -ForegroundColor Cyan
if (Test-Endpoint "Operations Log" "$baseUrl/api/operations") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 12: Operations Stats API
Write-Host "`n[Test 12/15] Operations Stats API" -ForegroundColor Cyan
if (Test-Endpoint "Operations Stats" "$baseUrl/api/operations/stats") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 13: Alerts API
Write-Host "`n[Test 13/15] Alerts API" -ForegroundColor Cyan
if (Test-Endpoint "Alert System" "$baseUrl/api/alerts") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 14: Restart Prompts API
Write-Host "`n[Test 14/15] Restart Prompts API" -ForegroundColor Cyan
if (Test-Endpoint "Restart Prompts" "$baseUrl/api/restart") {
    $testsPassed++
} else {
    $testsFailed++
}

# Test 15: Chart Data APIs
Write-Host "`n[Test 15/15] Chart Data APIs" -ForegroundColor Cyan
$chartTests = @(
    "Discovery Chart|$baseUrl/api/charts/discovery",
    "Pre-Filter Chart|$baseUrl/api/charts/prefilter",
    "Scores Chart|$baseUrl/api/charts/scores",
    "Keywords Chart|$baseUrl/api/charts/keywords",
    "Operations Chart|$baseUrl/api/charts/operations"
)

$chartsPassed = 0
foreach ($test in $chartTests) {
    $name, $url = $test -split '\|'
    if (Test-Endpoint $name $url) {
        $chartsPassed++
    }
}

if ($chartsPassed -eq $chartTests.Count) {
    Write-Host "`n  ✓ All $($chartTests.Count) chart APIs working" -ForegroundColor Green
    $testsPassed++
} else {
    Write-Host "`n  ✗ Only $chartsPassed/$($chartTests.Count) chart APIs working" -ForegroundColor Red
    $testsFailed++
}

# Database check
Write-Host "`n[Bonus Test] Database Connection" -ForegroundColor Cyan
$dbPath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
if (Test-Path $dbPath) {
    $dbSize = (Get-Item $dbPath).Length / 1MB
    Write-Host "  ✓ Database found: $('{0:N2}' -f $dbSize) MB" -ForegroundColor Green
} else {
    Write-Host "  ✗ Database not found at: $dbPath" -ForegroundColor Red
}

# Summary
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  Test Results" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

$totalTests = $testsPassed + $testsFailed
$passRate = [math]::Round(($testsPassed / $totalTests) * 100, 1)

Write-Host "`nPassed: $testsPassed / $totalTests ($passRate%)" -ForegroundColor $(if ($passRate -eq 100) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })
Write-Host "Failed: $testsFailed / $totalTests" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })

if ($testsFailed -eq 0) {
    Write-Host "`n✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "Your console is ready to use! 🎉" -ForegroundColor Cyan
    Write-Host "`nOpen: $baseUrl/console.html" -ForegroundColor Yellow
} elseif ($passRate -ge 80) {
    Write-Host "`n⚠️  MOSTLY WORKING" -ForegroundColor Yellow
    Write-Host "Some endpoints failed but core functionality is OK" -ForegroundColor White
} else {
    Write-Host "`n❌ CONSOLE HAS ISSUES" -ForegroundColor Red
    Write-Host "Please fix the failed endpoints" -ForegroundColor White
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")