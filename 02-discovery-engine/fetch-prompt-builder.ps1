# fetch-prompt-builder.ps1
# Extracts top 12 unfetched PMO articles and builds Claude prompt with URLs

Import-Module PSSQLite

$dbPath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
$today = Get-Date -Format "yyyy-MM-dd"

# Query articles
$articles = Invoke-SqliteQuery -DataSource $dbPath -Query @"
SELECT id, title, url, pmo_score, fetch_status, fetch_attempts
FROM daily_insights 
WHERE date = DATE('now')
  AND pmo_score >= 70
  AND (content_fetched = 0 OR fetch_status = 'failed')
ORDER BY pmo_score DESC 
LIMIT 12
"@

# Check fetched count
$fetched = Invoke-SqliteQuery -DataSource $dbPath -Query @"
SELECT COUNT(*) as count 
FROM daily_insights 
WHERE date = DATE('now') AND fetch_status = 'success'
"@

$fetchedCount = $fetched.count
$needed = 10 - $fetchedCount

Write-Host "Found $($articles.Count) articles to process"
Write-Host "Already fetched: $fetchedCount/10"
Write-Host "Need: $needed more articles`n"

if ($fetchedCount -ge 10) {
    Write-Host "✅ Already have 10+ articles. Done!"
    exit
}

if ($articles.Count -eq 0) {
    Write-Host "⚠️ No unfetched articles found."
    exit
}

# Build URL list
$urlList = ($articles | ForEach-Object -Begin {$i=1} -Process { 
    "$i. $($_.url)`n   Title: $($_.title)`n   PMO Score: $($_.pmo_score)"
    $i++
}) -join "`n`n"

# Build full prompt - using single quotes to avoid issues
$prompt = "# Daily PMO Article Content Fetch - Automated Run

## Context
Database: D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo-insights.db
Date: $today
Articles to process: $($articles.Count)
Target: Fetch $needed more articles (currently have $fetchedCount/10)

## User-Provided URLs
The user has provided these $($articles.Count) article URLs to fetch:

$urlList

## Instructions

## Instructions

### Phase 1: Direct Fetch Attempt
For each URL above (in order):
1. Try web_fetch directly on the URL
2. If successful:
   - If article is under 10,000 words: Store COMPLETE content in full_content field
   - If article exceeds 10,000 words: Extract comprehensive summary (800-1200 words) covering:
     * Main concepts and features
     * Benefits and use cases
     * Technical details
     * PMO relevance and applications
     * Examples and context
3. If fails: Note error, proceed to Phase 2

### Phase 2: Search & Fetch Fallback
For URLs that failed direct fetch:
1. Search using: `"[article title]`" [source domain]
2. web_fetch URL from search results
3. Still fails → mark 'failed' with reason

### Phase 3: Database Updates

For SUCCESS:
UPDATE daily_insights 
SET content_fetched = 1,
    fetch_status = 'success',
    fetch_date = CURRENT_TIMESTAMP,
    fetch_attempts = fetch_attempts + 1,
    full_content = '[content summary]',
    content_length = [length],
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

For FAILURE:
UPDATE daily_insights 
SET content_fetched = 0,
    fetch_status = 'failed',
    fetch_date = CURRENT_TIMESTAMP,
    fetch_attempts = fetch_attempts + 1,
    fetch_error = '[error reason]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?;

### Phase 4: Early Stop
- STOP when $needed successful fetches achieved
- Don't process remaining articles once target met

### Phase 5: Summary Report
Generate summary:
✅ DAILY PMO ARTICLE FETCH COMPLETE
Target: $needed articles needed
Successfully Fetched: [X]/$needed
Failed: [Y]
Total Today: [Z]/10

## Error Handling
- Direct fetch fails → Search & fetch
- Paywall → Mark 'partial', store snippet
- Search quota low → Mark remaining 'pending'

Execute now."

# Copy to clipboard
Set-Clipboard -Value $prompt

Write-Host "✅ Prompt copied to clipboard!`n"
Write-Host "📋 Articles queued for fetch:"
$articles | ForEach-Object { 
    Write-Host "   [$($_.pmo_score)] $($_.title)" 
}
Write-Host "`n👉 Paste into Claude now."