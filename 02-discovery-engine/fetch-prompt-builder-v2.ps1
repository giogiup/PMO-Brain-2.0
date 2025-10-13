# fetch-prompt-builder.ps1
# VERSION: 2.0
# DATE: 2025-10-07
# PURPOSE: Generate Claude prompt for fetching article content
# USAGE: .\fetch-prompt-builder.ps1
# CHANGE: Fixed published_date field and prompt structure

Import-Module PSSQLite

$dbPath = "D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db"
$today = Get-Date -Format "yyyy-MM-dd"

# Query unfetched articles
$articles = Invoke-SqliteQuery -DataSource $dbPath -Query @"
SELECT id, title, url, pmo_score, fetch_status, fetch_attempts
FROM daily_insights 
WHERE published_date = DATE('now')
  AND pmo_score >= 70
  AND (content_fetched = 0 OR fetch_status = 'failed')
ORDER BY pmo_score DESC 
LIMIT 12
"@

# Check already fetched count
$fetched = Invoke-SqliteQuery -DataSource $dbPath -Query @"
SELECT COUNT(*) as count 
FROM daily_insights 
WHERE published_date = DATE('now') 
  AND fetch_status = 'success'
"@

$fetchedCount = $fetched.count
$needed = 10 - $fetchedCount

Write-Host "`n=== FETCH PROMPT BUILDER v2.0 ===" -ForegroundColor Cyan
Write-Host "Found $($articles.Count) articles to process"
Write-Host "Already fetched: $fetchedCount/10"
Write-Host "Need: $needed more articles`n" -ForegroundColor Yellow

if ($fetchedCount -ge 10) {
    Write-Host "✅ Already have 10+ articles fetched today. Done!" -ForegroundColor Green
    exit
}

if ($articles.Count -eq 0) {
    Write-Host "⚠️ No unfetched articles found for today." -ForegroundColor Yellow
    exit
}

# Build URL list
$urlList = ($articles | ForEach-Object -Begin {$i=1} -Process { 
    "$i. $($_.url)`n   Title: $($_.title)`n   PMO Score: $($_.pmo_score)"
    $i++
}) -join "`n`n"

# Build full prompt
$prompt = @'
# Daily PMO Article Content Fetch - Automated Run

## Context
Database: D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db
Date: {0}
Articles to process: {1}
Target: Fetch {2} more articles (currently have {3}/10)

## User-Provided URLs
The user has provided these {1} article URLs to fetch:

{4}

## Instructions

### Phase 1: Direct Fetch Attempt
Process each URL above (in order):
1. Try web_fetch directly on the URL
2. If successful:
   - If article under 10,000 words: Store COMPLETE content in full_content field
   - If article exceeds 10,000 words: Extract comprehensive summary (800-1200 words) covering:
     * Main concepts and features
     * Benefits and use cases
     * Technical details
     * PMO relevance and applications
     * Examples and real-world context
     * Implementation considerations
3. If fails: Note error, proceed to Phase 2

### Phase 2: Search & Fetch Fallback
Process URLs that failed direct fetch:
1. Search using: "[article title]" [source domain]
2. web_fetch URL from search results - apply same content rules as Phase 1
3. Still fails → mark 'failed' with specific reason

### Phase 3: Database Updates

Use MCP sqlite tools to update each article processed:

SUCCESS:
UPDATE daily_insights 
SET content_fetched = 1,
    fetch_status = 'success',
    fetch_date = CURRENT_TIMESTAMP,
    fetch_attempts = fetch_attempts + 1,
    full_content = '[extracted_content]',
    content_length = [character_count],
    updated_at = CURRENT_TIMESTAMP
WHERE id = [article_id];

FAILED:
UPDATE daily_insights 
SET content_fetched = 0,
    fetch_status = 'failed',
    fetch_date = CURRENT_TIMESTAMP,
    fetch_attempts = fetch_attempts + 1,
    fetch_error = '[specific_error_reason]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = [article_id];

### Phase 4: Early Stop Logic
- Track successful fetches as you process
- STOP when you reach {2} successful fetches (total will be 10)
- Don't process remaining articles if target met

### Phase 5: Final Report
Generate summary:

DAILY PMO ARTICLE FETCH COMPLETE

Target: {2} new articles needed
Successfully Fetched: [X]/{2}
Failed: [Y]
Total Success Today: [Z]/10

Processed Articles:
[List each with ID, title, status, word count]

Failed Articles (if any):
[List with ID, title, reason]

## Error Handling
- Direct fetch fails → Try search & fetch
- Search fails → Mark 'failed', reason: "URL not accessible"
- Paywall detected → Mark 'partial', store available content
- Rate limit hit → Mark remaining as 'pending'
- Content too short → Mark 'failed', reason: "Insufficient content"

## Quality Checks
Before storing content, verify:
- Content length > 200 words
- Content is actual article (not just navigation/ads)
- Content relates to article title
- No extraction errors in text

Execute now.
'@ -f $today, $articles.Count, $needed, $fetchedCount, $urlList

# Copy to clipboard
Set-Clipboard -Value $prompt

Write-Host "✅ Prompt copied to clipboard!" -ForegroundColor Green
Write-Host "`n📋 Articles queued for fetch:" -ForegroundColor Cyan
$articles | ForEach-Object -Begin {$i=1} -Process {
    Write-Host "  $i. [Score: $($_.pmo_score)] $($_.title)" -ForegroundColor White
    $i++
}
Write-Host "`n👉 Paste into Claude Desktop now (Ctrl+V)" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan