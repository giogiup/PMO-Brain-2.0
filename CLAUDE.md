# PMO Brain 2.0 - Project Memory

**Last Updated:** 2025-12-01
**Purpose:** Core context for Claude Chat & Code

---

## Quick Facts

**Mission:** Find AI content applicable to PMO work from 8.5M daily articles
**Location:** D:\PMO-Brain-2.0-Modular\
**Database:** 02-discovery-engine/pmo_insights.db (SQLite)
**Environment:** Windows, PowerShell, UTC+2

---

## Pipeline Flow

```
Discovery → PreFilter → Scoring → Fetch → Enrich → Cards → Deploy
```

---

## Zombie Process Issue (FIXED Dec 1, 2025)

**Root Cause:** SemanticPrefilter.js spawned Python subprocess with NO TIMEOUT
- 31,931 articles backlogged, Python hung processing massive batch
- Last successful run: Oct 17, 2025

**Fix Applied:**
1. 5-min timeout to Python subprocess (SemanticPrefilter.js:108)
2. 1000-article batch limit (PreFilter.js:75)
3. Graceful fallback to keyword mode on timeout
4. Progress logging every 100 articles
5. Backlog cleanup script (delete >5 days old)
6. DB optimization (VACUUM + ANALYZE)

**Results:**
- Deleted 31,749 stale articles (>5 days)
- Remaining backlog: 1,255 articles (<5 days)
- DB size: 26.5 MB → 18.8 MB (29% reduction)

**Note:** Read CLAUDE.md + README.md together for full context in new chats

---

## Running the System

**Full pipeline:**
```powershell
cd D:\PMO-Brain-2.0-Modular\Automation
node run-daily-pipeline.js
```

**Skip steps:**
```powershell
node run-daily-pipeline.js --skip-discovery  # Test prefilter only
```

---

## Core Modules

- **PreFilter.js** - Semantic OR keyword scoring (hybrid mode)
- **SemanticPrefilter.js** - Python subprocess wrapper (embeddings)
- **ScoringEngine.js** - AI relevance scoring (multi-provider)
- **ContentFetcher.js** - Jina AI full text
- **DatabaseManager.js** - SQLite operations

**Key Tables:**
- `daily_insights` - All articles
- `prefilter_config` - PreFilter settings
- `operations_log` - System events

---

## Development Rules

**Language:** Node.js + Python
**Shell:** PowerShell (Windows)
**Logging:** Always log to operations_log
**Git:** feature/name or fix/name branches

---

## User Context

**User:** GIO (COO, 15yrs PMO)
**Style:** Direct, concise, challenges assumptions
**Values:** Honest assessment > agreeableness
