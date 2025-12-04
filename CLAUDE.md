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

## Zombie Process Issue (CRITICAL)

**Root Cause:** SemanticPrefilter.js spawns Python subprocess with NO TIMEOUT
- 31,931 articles backlogged (not 15K!)
- Python process hung processing massive batch
- Last successful run: Oct 17, 2025
- Semantic mode enabled (`use_semantic_prefilter: true`)

**Fix Applied:**
1. Added 5-min timeout to Python subprocess (SemanticPrefilter.js:95)
2. Added 500-article batch limit (PreFilter.js:67)
3. Added graceful fallback to keyword mode on timeout
4. Added progress logging every 100 articles

**Files Modified:**
- `Automation/modules/SemanticPrefilter.js` (timeout handling)
- `Automation/modules/PreFilter.js` (batch limiting, fallback)

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
