# PMO Brain 2.0 - Automated AI Content Pipeline

**Status:** Production
**Last Updated:** 2025-12-01
**Version:** 2.0

Automated system that discovers, analyzes, and publishes AI content relevant to PMO work. Processes 8.5M daily articles → publishes top 10-20 on [smartpmo.ai](https://smartpmo.ai).

---

## Quick Start

```powershell
# Clone & setup
cd D:\PMO-Brain-2.0-Modular\Automation
npm install

# Run full pipeline
node run-daily-pipeline.js

# Test mode (no git deploy)
node run-daily-pipeline.js --test

# Skip discovery (test PreFilter only)
node run-daily-pipeline.js --skip-discovery
```

**Management Console:**
```powershell
cd 01-Management-Console/public
node server.js
# Visit: http://localhost:8080/console
```

---

## Architecture

### 7-Step Pipeline

```
Discovery (800) → PreFilter (100) → Scoring (50) → Fetch (20) →
Enrich (20) → Cards (10-20) → Deploy (Website)
```

**Daily Flow:**
1. **Discovery** - RSS feeds, Google Search, GDELT, NewsAPI (800 articles)
2. **PreFilter** - Semantic embeddings OR keyword matching (→100 articles)
3. **Scoring** - AI relevance scoring via Gemini/Claude/Groq (→50 high-quality)
4. **Fetch** - Full article content via Jina AI (top 20)
5. **Enrich** - Extract taglines, TLDRs, keywords, badges (top 20)
6. **Cards** - Generate newsletter cards (10-20 final articles)
7. **Deploy** - Push to website via Git → Cloudflare Pages

---

## Key Components

### Core Modules (`Automation/modules/`)

| Module | Purpose | Tech |
|--------|---------|------|
| **DiscoveryEngine.js** | Find articles from 4 sources | RSS, Google, GDELT, NewsAPI |
| **PreFilter.js** | Fast semantic/keyword scoring | Hybrid mode, 500/batch |
| **SemanticPrefilter.js** | Python subprocess wrapper | Embeddings, BM25, 5-min timeout |
| **ScoringEngine.js** | Deep AI analysis | Multi-provider failover |
| **ContentFetcher.js** | Get full article text | Jina AI Reader |
| **ContentEnricher.js** | Extract metadata | Taglines, keywords, badges |
| **CardGenerator.js** | Create newsletter cards | Smart 10-20 selection |
| **DatabaseManager.js** | SQLite operations | 34 tables |

### Management Console (`01-Management-Console/`)

Web dashboard for monitoring, testing, and configuration.

**Features:**
- Real-time pipeline monitoring
- Source management (RSS, APIs)
- PreFilter keyword configuration
- Analytics & statistics
- Backlog inspection
- API usage tracking

**Tabs:** Dashboard | Discovery | Sources | PreFilter | Analytics | Stats | Backlog | Operations | API Usage

---

## Database Schema

**Location:** `02-discovery-engine/pmo_insights.db` (SQLite)

**Key Tables:**
- `daily_insights` - All discovered articles (main table)
- `source_registry` - Discovery sources configuration
- `prefilter_config` - PreFilter settings
- `prefilter_keywords` - Keyword matching rules
- `operations_log` - System event log
- `daily_runs` - Pipeline execution history
- `ai_provider_usage` - Multi-provider API tracking

---

## Recent Fixes

### Zombie Pipeline Fix (Dec 1, 2025)

**Problem:** Pipeline hung since Nov 25 processing 31K+ backlogged articles.

**Root Cause:** SemanticPrefilter spawned Python subprocess with NO TIMEOUT.

**Solution:**
1. Added 5-min timeout to Python subprocess
2. Added 500-article batch limit (prevents massive batches)
3. Added graceful fallback to keyword mode on timeout
4. Added progress logging every 100 articles

**Files:** `SemanticPrefilter.js`, `PreFilter.js`
**Details:** See `ZOMBIE_FIX.md`

---

## Configuration

### Environment Variables

Create `Automation/.env`:
```bash
# Required
GEMINI_API_KEY=your_key_here
JINA_API_KEY=your_key_here

# Optional (multi-provider)
ANTHROPIC_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
GOOGLE_SEARCH_API_KEY=your_key_here
GOOGLE_SEARCH_ENGINE_ID=your_id_here
GDELT_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here
```

### PreFilter Modes

**Semantic Mode** (default, slow, accurate):
```sql
UPDATE prefilter_config
SET config_value = 'true'
WHERE config_key = 'use_semantic_prefilter';
```

**Keyword Mode** (fast, good enough):
```sql
UPDATE prefilter_config
SET config_value = 'false'
WHERE config_key = 'use_semantic_prefilter';
```

**Batch Size:**
```sql
-- Increase for faster backlog clearing (max 500)
UPDATE prefilter_config
SET config_value = '500'
WHERE config_key = 'max_articles_per_batch';
```

---

## Automation

### Windows Task Scheduler

```powershell
# Location
D:\PMO-Brain-2.0-Modular\Automation\run-daily.bat

# Schedule
Daily at 4:00 AM (UTC+2 / SAST)

# Command
cd D:\PMO-Brain-2.0-Modular\Automation
node run-daily-pipeline.js
```

**Setup:**
1. Task Scheduler → Create Task
2. Trigger: Daily at 4:00 AM
3. Action: Run `run-daily.bat`
4. Settings: Allow manual run, wake computer

---

## Troubleshooting

### Pipeline Hung / Zombie Process

**Symptoms:**
- Pipeline runs for >10 minutes
- No progress logs
- Articles backlogged

**Solution:**
```powershell
# Check for hung Node process
tasklist | findstr node

# Kill if needed
taskkill /F /IM node.exe

# Check backlog
node -e "
const db = require('./modules/DatabaseManager');
const dbPath = '../02-discovery-engine/pmo_insights.db';
const dbm = new db(dbPath);
dbm.initialize().then(() => {
  dbm.get('SELECT COUNT(*) as count FROM daily_insights WHERE prefilter_passed = 0')
    .then(r => console.log('Backlog:', r.count));
});
"

# Clear backlog in batches
node run-daily-pipeline.js --skip-discovery  # Run 64x for 31K articles
```

### Python Timeout Errors

**Error:** `Prefilter timeout after 5 minutes`

**Causes:**
- Python script slow/hung
- Embeddings cache corrupted
- Too many articles in batch

**Solutions:**
1. Switch to keyword mode (10x faster)
2. Reduce batch size to 200-300
3. Delete `embeddings_cache.pkl` and restart
4. Check Python dependencies: `pip install -r requirements.txt`

### No Articles Discovered

**Check:**
1. API keys in `.env`
2. Source registry: `SELECT * FROM source_registry WHERE status = 'active'`
3. Discovery logs: `operations_log` table
4. Network connectivity

### Low Scoring Articles

**Tune scoring:**
```sql
-- Lower prefilter threshold (default: 50)
UPDATE prefilter_config SET config_value = '40' WHERE config_key = 'pass_threshold';

-- Increase max articles to pass (default: 100)
UPDATE prefilter_config SET config_value = '150' WHERE config_key = 'max_articles_to_pass';

-- Check keyword coverage
SELECT category, COUNT(*) FROM prefilter_keywords WHERE enabled = 1 GROUP BY category;
```

---

## Monitoring

### Check Pipeline Status

```sql
-- Last run status
SELECT * FROM daily_runs ORDER BY run_date DESC LIMIT 1;

-- Recent operations
SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT 20;

-- Backlog size
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN prefilter_passed = 0 THEN 1 ELSE 0 END) as unprocessed
FROM daily_insights;

-- Top scoring articles
SELECT id, title, pmo_score, discovered_at
FROM daily_insights
WHERE pmo_score >= 70
ORDER BY pmo_score DESC
LIMIT 10;
```

### Console Analytics

Visit: `http://localhost:8080/console`
- **Analytics Tab:** Charts, trends, success rates
- **Statistics Tab:** Daily/weekly/monthly stats
- **Operations Tab:** Recent logs, errors
- **Backlog Tab:** Inspect stuck articles

---

## Development

### Project Structure

```
D:\PMO-Brain-2.0-Modular\
├── Automation/                      # Main pipeline
│   ├── modules/                    # Core engines
│   │   ├── PreFilter.js           # Semantic/keyword scoring
│   │   ├── SemanticPrefilter.js   # Python wrapper (timeout!)
│   │   ├── ScoringEngine.js       # AI scoring
│   │   └── ...
│   ├── Advanced-Pre-Filter/        # Python semantic scoring
│   │   └── prefilter_titles.py   # Embeddings + BM25
│   ├── run-daily-pipeline.js      # Main orchestrator
│   └── package.json
├── 01-Management-Console/          # Web dashboard
│   └── public/
│       ├── server.js              # Express API
│       ├── console.html           # Frontend
│       └── console-modules/       # Tab modules
├── 02-discovery-engine/            # Legacy (now in Automation)
│   └── pmo_insights.db            # SQLite database
├── 09-research/                    # Documentation
├── website/                        # Production site (separate repo)
├── CLAUDE.md                       # Project context (<100 lines)
├── ZOMBIE_FIX.md                   # Dec 1 fix details
└── README.md                       # This file
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit
git add .
git commit -m "Description"

# Push
git push origin feature/your-feature

# Merge to main when ready
git checkout main
git merge feature/your-feature
```

### Adding New Features

**Example: Add new discovery source**
1. Add to `source_registry` table
2. Implement in `DiscoveryEngine.js`
3. Test: `node run-daily-pipeline.js --test`
4. Monitor in console: Discovery Tab

**Example: Tune PreFilter keywords**
1. Console → PreFilter Tab
2. Add keywords to `prefilter_keywords` table
3. Test scoring: Run PreFilter on sample articles
4. Check pass rates in Analytics Tab

---

## API Reference

### Pipeline Commands

```bash
# Full pipeline
node run-daily-pipeline.js

# Test mode (no deploy)
node run-daily-pipeline.js --test

# Skip steps
node run-daily-pipeline.js --skip-discovery
node run-daily-pipeline.js --skip-prefilter
node run-daily-pipeline.js --skip-scoring
node run-daily-pipeline.js --skip-fetch
node run-daily-pipeline.js --skip-keywords
node run-daily-pipeline.js --skip-cards
node run-daily-pipeline.js --skip-deploy

# Custom date
node run-daily-pipeline.js --date=2025-12-01
```

### Management Console API

```bash
# Start server
cd 01-Management-Console/public
node server.js

# Endpoints (localhost:8080)
GET  /api/discovery/sources         # Get all sources
POST /api/discovery/test-source     # Test source
GET  /api/prefilter/keywords        # Get keywords
POST /api/prefilter/test            # Test prefilter
GET  /api/analytics/stats           # Get statistics
GET  /api/backlog                   # Get backlog
```

---

## Production Deployment

### Website Deployment

The website is a separate repository that auto-deploys via Cloudflare Pages.

**Workflow:**
1. Pipeline generates `daily-cards.json`
2. Git push to website repo (`website/` directory)
3. Cloudflare Pages detects push
4. Auto-builds and deploys (~30 seconds)
5. Live at [smartpmo.ai](https://smartpmo.ai)

**Manual Deploy:**
```bash
cd D:\PMO-Brain-2.0-Modular\website
git add api/daily-cards.json
git commit -m "Daily cards update"
git push origin main
```

### Cloudflare Pages Settings

- **Build command:** None (static site)
- **Build output:** `/`
- **Branch:** `main`
- **Auto-deploy:** Enabled

---

## Known Issues

### 1. Python Timeout (FIXED Dec 1)
- **Issue:** SemanticPrefilter hung on large batches
- **Fix:** Added 5-min timeout + 500-article batch limit
- **Details:** `ZOMBIE_FIX.md`

### 2. Discovery Too Narrow
- **Issue:** Not enough relevant articles found
- **Status:** Needs redesign with wider net
- **Workaround:** Lower prefilter threshold to 40

### 3. API Rate Limits
- **Issue:** Gemini/Groq rate limits hit during scoring
- **Fix:** Multi-provider failover implemented
- **Config:** `AIRouter.js` handles automatic switching

---

## Support

**Issues:** Report at GitHub repo
**Contact:** GIO (COO)
**Documentation:** `CLAUDE.md` (project context), `ZOMBIE_FIX.md` (recent fixes)

---

## License

Proprietary - Internal use only
