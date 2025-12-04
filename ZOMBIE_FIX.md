# Zombie Pipeline Fix - Dec 1, 2025

## Problem Summary

**Symptom:** Pipeline hung since Nov 25, 4:00 AM. Last successful run: Oct 17, 2025.

**Root Cause:** SemanticPrefilter.js spawned Python subprocess with NO TIMEOUT, attempting to process 31,931 backlogged articles in a single batch.

---

## Investigation Findings

### 1. Massive Backlog
```sql
SELECT COUNT(*) FROM daily_insights
WHERE pmo_score IS NULL AND prefilter_passed = 0;
-- Result: 31,931 articles (not 15K as initially thought!)
```

### 2. Blocking Operation Identified

**File:** `Automation/modules/SemanticPrefilter.js:95-129`

**Issue:**
```javascript
// BEFORE: No timeout - hangs forever
async runPythonPrefilter(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const process = spawn(this.pythonPath, args);

        process.on('close', (code) => {  // ← Waits indefinitely
            if (code === 0) resolve();
        });
    });
}
```

**What Happened:**
1. PreFilter tried to score all 31K+ articles in semantic mode
2. Python script (`prefilter_titles.py`) received massive JSON input
3. Script likely ran out of memory or got stuck generating embeddings
4. Node.js waited indefinitely for Python process to complete
5. Pipeline never progressed past PreFilter step

### 3. No Safety Mechanisms
- No timeout on subprocess
- No batch size limits
- No fallback to keyword mode
- No progress logging

---

## The Fix

### 1. Added 5-Minute Timeout (SemanticPrefilter.js:108-121)

```javascript
// AFTER: 5-minute timeout with graceful/force kill
const timeout = setTimeout(() => {
    timedOut = true;
    process.kill('SIGTERM');  // Graceful shutdown

    setTimeout(() => {
        if (!process.killed) {
            process.kill('SIGKILL');  // Force kill if needed
        }
    }, 5000);

    reject(new Error('Prefilter timeout after 5 minutes'));
}, 5 * 60 * 1000);

process.on('close', (code) => {
    clearTimeout(timeout);  // Clean up timeout
    if (timedOut) return;
    if (code === 0) resolve();
});
```

### 2. Added 500-Article Batch Limit (PreFilter.js:67-76)

```javascript
// BEFORE: Tried to process ALL unprocessed articles
const articles = await this.db.all(`
    SELECT id, title, url FROM daily_insights
    WHERE DATE(discovered_at) = ?
    AND pmo_score IS NULL
    AND prefilter_passed = 0
    ORDER BY id
`, [runDate]);

// AFTER: Limit to 500 articles per run
const articles = await this.db.all(`
    SELECT id, title, url FROM daily_insights
    WHERE DATE(discovered_at) = ?
    AND pmo_score IS NULL
    AND prefilter_passed = 0
    ORDER BY id
    LIMIT 500  -- ← Process in manageable batches
`, [runDate]);
```

**Why 500?**
- Small enough to complete in <5 minutes
- Large enough to make progress on backlog
- Run pipeline multiple times to clear backlog incrementally

### 3. Added Graceful Fallback (PreFilter.js:138-143)

```javascript
try {
    // Try semantic scoring
    const semanticScored = await this.semanticPrefilter.scoreArticles(...);
    // Process results...
} catch (error) {
    // GRACEFUL FALLBACK: Switch to keyword mode
    console.warn(`\n⚠️  Semantic prefilter failed: ${error.message}`);
    console.warn('   Falling back to keyword mode...\n');
    semanticFailed = true;
}

if (!useSemanticMode || semanticFailed) {
    // KEYWORD MODE (always works, no external dependencies)
    for (const article of articles) {
        const scoreData = await this.scoreArticle(article);
        scoredArticles.push({ ...article, ...scoreData });
    }
}
```

### 4. Added Progress Logging (PreFilter.js:159-163)

```javascript
let processed = 0;
for (const article of articles) {
    const scoreData = await this.scoreArticle(article);
    scoredArticles.push({ ...article, ...scoreData });

    processed++;
    if (processed % 100 === 0) {
        console.log(`   Progress: ${processed}/${articles.length} articles scored`);
    }
}
```

---

## Files Modified

1. **Automation/modules/SemanticPrefilter.js**
   - Added 5-minute timeout to Python subprocess
   - Added graceful and force kill mechanisms
   - Added timeout flag to prevent duplicate error handling

2. **Automation/modules/PreFilter.js**
   - Added 500-article batch limit (LIMIT 500)
   - Added try/catch around semantic scoring
   - Added fallback to keyword mode on semantic failure
   - Added progress logging every 100 articles

3. **CLAUDE.md**
   - Updated with zombie process findings
   - Documented fix applied
   - Trimmed to <100 lines for conciseness

---

## Testing

**Command:**
```powershell
cd D:\PMO-Brain-2.0-Modular\Automation
node run-daily-pipeline.js --skip-discovery --test --date=2025-12-01
```

**Expected Behavior:**
1. Process up to 500 articles (instead of all 31K+)
2. Complete within 5 minutes OR timeout gracefully
3. Fall back to keyword mode if semantic times out
4. Log progress every 100 articles
5. No zombie processes left behind

**Test Results:**
- Processing 182 articles from Dec 1, 2025
- Semantic mode attempting to run
- Timeout protection active (5-min max)
- [Results pending - test running]

---

## Clearing the Backlog

The 31,931-article backlog needs to be processed in batches:

### Option 1: Run Pipeline Multiple Times
```powershell
# Run 64 times to process 500 articles each (31,931 ÷ 500 = ~64 runs)
for ($i = 1; $i -le 64; $i++) {
    Write-Host "Batch $i/64..."
    node run-daily-pipeline.js --skip-discovery
    Start-Sleep -Seconds 10
}
```

### Option 2: Process by Date Range
```powershell
# Process one day at a time
node run-daily-pipeline.js --skip-discovery --date=2025-11-25
node run-daily-pipeline.js --skip-discovery --date=2025-11-26
# ... etc
```

### Option 3: Disable Semantic Mode Temporarily
```sql
-- Switch to keyword mode for faster backlog processing
UPDATE prefilter_config
SET config_value = 'false'
WHERE config_key = 'use_semantic_prefilter';
```

Then run pipeline normally. Keyword mode is 10x faster.

---

## Prevention

### Monitoring
- Check operations_log for prefilter failures
- Monitor article backlog: `SELECT COUNT(*) FROM daily_insights WHERE prefilter_passed = 0`
- Alert if backlog > 1,000 articles

### Best Practices
- Always use batch limits for external processes
- Always add timeouts to subprocess calls
- Always have fallback mechanisms
- Log progress for long-running operations

### Future Improvements
1. Add health check endpoint to API
2. Add email alerts on pipeline failures
3. Consider moving semantic scoring to background queue
4. Add max retry logic with exponential backoff

---

## Commit Message

```
Fix zombie pipeline - add timeout, batch limit, fallback

Root cause: SemanticPrefilter spawned Python with no timeout
- 31,931 articles hung pipeline since Nov 25
- Python process never returned from massive batch

Fixes applied:
1. Add 5-min timeout to Python subprocess (SemanticPrefilter.js)
2. Add 500-article batch limit per run (PreFilter.js)
3. Add graceful fallback to keyword mode on timeout
4. Add progress logging every 100 articles

Files: SemanticPrefilter.js, PreFilter.js, CLAUDE.md
Test: 182 articles from 2025-12-01 (pending completion)
```

---

## Related Files

- `Automation/modules/PreFilter.js` - Main prefilter logic
- `Automation/modules/SemanticPrefilter.js` - Python subprocess wrapper
- `Automation/Advanced-Pre-Filter/prefilter_titles.py` - Python scoring script
- `CLAUDE.md` - Project memory (updated)
- `02-discovery-engine/pmo_insights.db` - Database (31K+ backlog)

---

**Status:** Fix implemented, test in progress
**Next:** Monitor test completion, commit changes, clear backlog
