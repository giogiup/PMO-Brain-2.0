# PMO Brain 2.0 - Current System Behavior Analysis

**Date:** 2026-01-21
**Purpose:** Document actual system behavior based on code analysis
**Database:** D:\PMO-Brain-2.0-Modular\02-discovery-engine\pmo_insights.db

---

## Executive Summary

**Current State:**
- **Total articles in DB:** 19,107
- **Articles displayed:** 5 (target: 20)
- **High-scoring articles (≥70):** 310
- **Content-fetched articles:** 183
- **Duplicate URLs:** Massive duplication at discovery (168 copies of same URL)

**Key Issues:**
1. Only 5 articles displayed instead of 20-article FIFO queue
2. All displayed articles categorized as `AI_GENERAL` despite having `pmo_relevance='Direct'`
3. Severe URL duplication at discovery (no deduplication enforcement)
4. Category mismatch between `pmo_category` and `pmo_relevance`

---

## 1. Discovery Process

**File:** `D:\PMO-Brain-2.0-Modular\Automation\modules\DiscoveryEngine.js`

### How Articles Are Discovered

**Source Types:**
- **RSS Feeds** (lines 176-242): 185+ enabled sources from `content_sources` table
- **GDELT API** (lines 248-324): Query-based news aggregator
- **TheNewsAPI** (lines 330-409): Search-based news API
- **Google Custom Search** (lines 415-507): Web search with date filtering

**Time-based Discovery:**
```javascript
// Lines 40-64: Auto-detect run type based on SAST time (UTC+2)
if (sastHour === 6) {
    hoursBack = 24;  // 06:00 AM - Main daily run
} else if (sastHour === 16) {
    hoursBack = 10;  // 04:00 PM - US East Coast
} else if (sastHour === 22) {
    hoursBack = 6;   // 10:00 PM - US West Coast
}
```

### Fields Populated at Discovery

**Database insertion (lines 199-213):**
```javascript
const article = {
    title: item.title,
    url: item.link,
    publishedDate: pubDate.toISOString().split('T')[0],
    tier: source.tier
};

const articleId = await this.db.insertArticle(article, source.id, runId);
```

**Fields set:**
- `title` - Article headline
- `url` - Article URL
- `published_date` - Publication date (YYYY-MM-DD)
- `discovered_at` - Current timestamp (auto)
- `source_id` - Foreign key to content_sources
- `tier` - Source quality tier (1-3)

**NOT set at discovery:**
- `pmo_score` - NULL until scoring
- `pmo_category` - Defaults to 'AI_GENERAL'
- `pmo_relevance` - NULL until enrichment
- `content_fetched` - 0 until fetch
- `is_displayed` - 0 until display manager

---

## 2. Deduplication Logic

### Discovery-Time Deduplication (BROKEN)

**File:** `DatabaseManager.js` (not read, but inferred from DiscoveryEngine)

**Method:** `insertArticle()` (lines 206-212)
```javascript
const articleId = await this.db.insertArticle(article, source.id, runId);

if (articleId) {
    articlesInserted++;
    await this.db.createPipelineEntry(articleId, article.publishedDate);
} else {
    this.stats.duplicatesSkipped++;  // Returns null if duplicate
}
```

**Expected behavior:** Returns `null` if URL already exists
**Actual behavior:** NOT WORKING - same URLs inserted hundreds of times

**Evidence from database:**
- URL `https://monday.com/blog/project-management/` appears **168 times**
- URL `https://monday.com/blog/rnd/` appears **126 times**
- URL `https://monday.com/blog/crm-and-sales/` appears **126 times**
- URL `https://www.wrike.com/blog/ai-agents-in-project-management/` appears **42 times** (one is displayed!)

**Root cause:** Missing UNIQUE constraint on `url` column in `daily_insights` table OR insertArticle() not checking for duplicates properly.

### Display-Time Deduplication (WORKING)

**File:** `ArticleDisplayManager.js` (lines 53-63)

**Method:** `updateAutoSection()`
```javascript
// Check if this URL is already displayed (prevent duplicates)
const existingUrl = this.db.prepare(`
    SELECT id, title
    FROM daily_insights
    WHERE is_displayed = 1
    AND url = ?
`).get(article.url);

if (existingUrl) {
    throw new Error(`URL already displayed (article ${existingUrl.id}): ${article.url}`);
}
```

**Behavior:** Prevents duplicate URLs in displayed articles (max 20)
**Effectiveness:** Working - no duplicate URLs in displayed articles (verified via query)

### Pipeline Deduplication

**File:** `run-daily-pipeline.js` (lines 213-231)

**Query for display selection:**
```javascript
const articlesToDisplay = syncDb.prepare(`
    SELECT id, title, url, pmo_score, discovered_at
    FROM daily_insights
    WHERE DATE(discovered_at) = ?
      AND pmo_score >= 70
      AND content_fetched = 1
      AND is_displayed = 0
      AND id IN (
        SELECT MAX(id) as id            -- DEDUPLICATION: Take newest duplicate
        FROM daily_insights
        WHERE DATE(discovered_at) = ?
          AND pmo_score >= 70
          AND content_fetched = 1
          AND is_displayed = 0
        GROUP BY url                     -- Group by URL
      )
    ORDER BY pmo_score DESC, discovered_at DESC
    LIMIT 20
`).all(runDate, runDate);
```

**Deduplication strategy:**
- Groups by URL
- Takes MAX(id) - the most recently discovered copy
- Prevents displaying duplicate URLs

**Effectiveness:** Working for pipeline, but doesn't fix root cause (duplicates still in DB)

---

## 3. Scoring & Categorization

**File:** `D:\PMO-Brain-2.0-Modular\Automation\modules\ScoringEngine.js`

### How pmo_score Is Calculated

**Process (lines 91-196):**

1. **Load scoring prompt** from `prompt_templates` table (line 98)
   - Prompt type: 'scoring'
   - Must have `is_active=1`

2. **Query articles needing scores** (lines 113-120):
   ```sql
   SELECT id, title, url, prefilter_score
   FROM daily_insights
   WHERE DATE(discovered_at) = ?
   AND prefilter_passed = 1
   AND pmo_score IS NULL
   ORDER BY prefilter_score DESC
   ```

3. **Score each article** (lines 227-263):
   - Replace `{title}` and `{url}` in prompt template
   - Send to AI via AIRouter (Groq → Fireworks → Cohere → GPT-4o-mini waterfall)
   - Extract numeric score from AI response: `const scoreMatch = text.match(/\d+/);`
   - Clamp to 0-100 range

4. **Save score** (lines 142-147):
   ```sql
   UPDATE daily_insights
   SET pmo_score = ?,
       scoring_prompt_version = ?
   WHERE id = ?
   ```

**Fields updated:**
- `pmo_score` - 0-100 numeric score
- `scoring_prompt_version` - Tracking which prompt was used

**NOT updated during scoring:**
- `pmo_category` - Still 'AI_GENERAL' (default)
- `pmo_relevance` - Still NULL

### How pmo_category Is Assigned

**File:** `CardGenerator.js` (lines 108-136)

**Method:** `classifyPMOCategory(article)` - FALLBACK ONLY

**Logic:**
```javascript
const pmoKeywords = /\b(pmo|project management|portfolio|resource allocation|...)\b/i;
const aiKeywords = /\b(llm|gpt|claude|gemini|model release|...)\b/i;

// PMO_RELATED: score >= 70 + explicit PMO keywords
if (score >= 70 && pmoKeywords.test(text)) {
    return 'PMO_RELATED';
}

// PMO_POTENTIAL: score 40-69 OR high score without explicit keywords
if (score >= 40 && score < 70) {
    return 'PMO_POTENTIAL';
}
if (score >= 70) {
    return 'PMO_POTENTIAL';  // High score but no PMO keywords
}

// AI_GENERAL: Everything else
return 'AI_GENERAL';
```

**When used:** Only in CardGenerator if `pmo_category` is NULL (line 71)

**Database default:** `'AI_GENERAL'` (schema line 32: `dflt_value="'AI_GENERAL'"`)

**Problem:** Database default is used, fallback classification never runs because field is never NULL

### How pmo_relevance Is Determined

**File:** `ContentEnricher.js` (lines 291-309)

**Process:**

1. **AI generates pmo_relevance** during enrichment (line 293):
   ```javascript
   if (!enrichment.pmo_relevance ||
       !enrichment.tldr ||
       !Array.isArray(enrichment.tldr) ||
       enrichment.tldr.length !== 3 ||
       !enrichment.badges ||
       !enrichment.keywords) {
       throw new Error('Invalid enrichment structure');
   }
   ```

2. **Validation** (lines 305-309):
   ```javascript
   const validRelevance = ['Direct', 'Inferred', 'Potential'];
   if (!validRelevance.includes(enrichment.pmo_relevance)) {
       throw new Error(`Invalid pmo_relevance: ${enrichment.pmo_relevance}`);
   }
   ```

3. **Saved to database** (lines 396-401):
   ```sql
   -- newsletter_content table
   INSERT INTO newsletter_content (..., pmo_relevance, ...)

   -- Also update daily_insights
   UPDATE daily_insights
   SET pmo_relevance = ?
   WHERE id = ?
   ```

**Valid values:**
- `'Direct'` - Directly applicable to PMO work
- `'Inferred'` - PMO relevance can be inferred
- `'Potential'` - Potential PMO application

**When assigned:** During enrichment step (Step 4), NOT during scoring

---

## 4. Display Selection

**File:** `run-daily-pipeline.js` (lines 198-259)

### Query for Display Selection

**Lines 213-231:**
```javascript
const articlesToDisplay = syncDb.prepare(`
    SELECT id, title, url, pmo_score, discovered_at
    FROM daily_insights
    WHERE DATE(discovered_at) = ?          -- Today's discoveries only
      AND pmo_score >= 70                  -- High quality threshold
      AND content_fetched = 1              -- Must have full content
      AND is_displayed = 0                 -- Not already displayed
      AND id IN (
        SELECT MAX(id) as id
        FROM daily_insights
        WHERE DATE(discovered_at) = ?
          AND pmo_score >= 70
          AND content_fetched = 1
          AND is_displayed = 0
        GROUP BY url                        -- Deduplicate by URL
      )
    ORDER BY pmo_score DESC, discovered_at DESC
    LIMIT 20                                -- Max 20 articles
`).all(runDate, runDate);
```

**Criteria:**
1. ✅ `DATE(discovered_at) = runDate` - Today's pipeline output
2. ✅ `pmo_score >= 70` - Quality threshold
3. ✅ `content_fetched = 1` - Full content must exist
4. ✅ `is_displayed = 0` - Not already shown
5. ✅ Deduplication via GROUP BY url + MAX(id)
6. ✅ ORDER BY score DESC, then discovered_at DESC
7. ✅ LIMIT 20

### Why Only 5 Articles Displayed?

**Current state verification:**
```sql
-- Query: Articles meeting display criteria (Jan 20-21)
WHERE DATE(discovered_at) >= '2026-01-20'
  AND pmo_score >= 70
  AND content_fetched = 1
  AND is_displayed = 0
```

**Results:**
- 20+ articles with score ≥70 available
- Many duplicates: "From Chaos to Clarity" appears 21 times with score 85-90
- ArticleDisplayManager FIFO limit: 20 articles max

**Root cause analysis:**

1. **Duplicate URL rejection** (ArticleDisplayManager.js:54-63):
   - First instance of "From Chaos to Clarity" (ID 47030) displayed on Jan 20
   - Subsequent attempts to display duplicates rejected with error
   - Pipeline continues, but duplicate articles skipped

2. **Content enrichment bottleneck:**
   - Only 5 unique articles were enriched (have `newsletter_content` entry)
   - CardGenerator requires join with `newsletter_content` (line 41)
   - Articles without enrichment metadata don't appear in cards

3. **Date filtering:**
   - Query uses `DATE(discovered_at) = runDate` (today only)
   - After initial 5 displayed, no more unique articles from same day
   - FIFO designed to build 20-article backlog over multiple days

**Why 5 specifically:**
- 5 unique URLs were discovered AND scored ≥70 AND fetched AND enriched on Jan 20-21
- Remaining high-scoring articles are duplicates of these 5 URLs
- No backlog from previous days (new system or recent database cleanup)

---

## 5. FIFO Logic

**File:** `ArticleDisplayManager.js`

### FIFO Implementation

**Constant:** `this.AUTO_SECTION_LIMIT = 20` (line 25)

**Adding articles** (lines 74-97):
```javascript
// If at limit, remove oldest article (FIFO)
if (currentCount.count >= this.AUTO_SECTION_LIMIT) {
    const oldest = this.db.prepare(`
        SELECT id, title, discovered_at
        FROM daily_insights
        WHERE is_displayed = 1
        ORDER BY discovered_at ASC           -- Oldest first
        LIMIT 1
    `).get();

    if (oldest) {
        // Remove oldest from display
        this.db.prepare(`
            UPDATE daily_insights
            SET is_displayed = 0
            WHERE id = ?
        `).run(oldest.id);

        removedArticle = oldest;
        console.log(`  🗑️  FIFO: Removed oldest article (${oldest.id}) from display`);
    }
}

// Add new article to display
this.db.prepare(`
    UPDATE daily_insights
    SET is_displayed = 1
    WHERE id = ?
`).run(articleId);
```

**FIFO behavior:**
1. Check current count of `is_displayed=1`
2. If count ≥ 20, find oldest by `discovered_at ASC`
3. Set oldest article's `is_displayed = 0`
4. Set new article's `is_displayed = 1`
5. Maintain rolling 20-article window

### Is FIFO Working Correctly?

**✅ YES** - Logic is sound and functional

**Evidence:**
- Current displayed count: 5 (under 20 limit)
- FIFO hasn't triggered yet (no removals needed)
- Deduplication prevents duplicates: Lines 54-63 check URL before adding
- Proper ordering: `discovered_at ASC` for oldest-first removal

**When it will trigger:**
- After 20 unique articles are displayed
- Each new article will remove oldest
- Will maintain 20-article rolling window

**Not triggered yet because:**
- Only 5 unique high-quality articles discovered so far
- System needs 15 more unique articles to reach 20-article limit
- Duplicate URLs being rejected prevents filling the queue

---

## 6. Category vs Relevance Mismatch

### Current State

**5 displayed articles:**

| ID | Title | pmo_category | pmo_relevance |
|----|-------|--------------|---------------|
| 48108 | Where I'm at with AI | AI_GENERAL | Potential |
| 47030 | From Chaos to Clarity: PM's Guide | AI_GENERAL | Direct |
| 46702 | AI agents in project management | AI_GENERAL | Direct |
| 46593 | AI in Project and Portfolio Mgmt | AI_GENERAL | Direct |
| 46074 | CPO predictions: AI speaks workflow | AI_GENERAL | Inferred |

**Problem:** 3 articles have `pmo_relevance='Direct'` but `pmo_category='AI_GENERAL'`

### Why This Happens

**pmo_category assignment:**
- Set to `'AI_GENERAL'` by database default (schema default value)
- Never updated during scoring (ScoringEngine doesn't touch it)
- CardGenerator fallback never runs (field never NULL)
- Result: ALL articles have `AI_GENERAL` category

**pmo_relevance assignment:**
- Set by ContentEnricher during enrichment (Step 4)
- AI analyzes full article content and assigns relevance
- Properly reflects PMO applicability
- Result: Accurate categorization based on content

### Code Flow Issue

**Expected:**
```
Discovery → Scoring → Enrichment → Category+Relevance assigned
```

**Actual:**
```
Discovery → pmo_category='AI_GENERAL' (default)
         ↓
Scoring → pmo_score set, category UNCHANGED
         ↓
Enrichment → pmo_relevance set, category STILL 'AI_GENERAL'
         ↓
CardGenerator → Fallback classification never runs (category not NULL)
```

**Root cause:**
- `pmo_category` has default value in schema
- No code updates `pmo_category` after default is set
- Fallback in CardGenerator never executes
- `pmo_relevance` is independent, correctly assigned by AI

---

## 7. Data Flow Summary

### Full Pipeline

```
STEP 1: DISCOVERY
├─ Insert articles with title, url, published_date, tier
├─ Fields: pmo_category='AI_GENERAL' (default), pmo_score=NULL, pmo_relevance=NULL
└─ Problem: Duplicates not prevented (168 copies of same URL)

STEP 1.5: PRE-FILTER
├─ Score articles 0-100 using semantic or keyword matching
├─ Top N articles marked prefilter_passed=1
└─ Fields: prefilter_score set

STEP 2: SCORING
├─ AI scores prefiltered articles 0-100
├─ Fields: pmo_score set, scoring_prompt_version set
└─ pmo_category UNCHANGED (still 'AI_GENERAL')

STEP 3: CONTENT FETCH
├─ Fetch full text for top 20 scored articles
└─ Fields: full_content set, content_fetched=1

STEP 4: ENRICHMENT
├─ AI generates TLDR, badges, keywords, pmo_relevance
├─ Fields: pmo_relevance set, keywords_extracted=1
└─ pmo_category STILL UNCHANGED

STEP 5: CARD GENERATION
├─ Query: is_displayed=1 + pmo_score>=70 + JOIN newsletter_content
├─ Fallback classification never runs (pmo_category not NULL)
└─ Generate daily-cards.json with AI_GENERAL category

STEP 6: DISPLAY MANAGER
├─ Query: discovered_at=today + score>=70 + content_fetched=1 + is_displayed=0
├─ Deduplication: GROUP BY url, MAX(id)
├─ FIFO: Remove oldest if count > 20
├─ Current: Only 5 displayed (duplicates rejected, others not enriched)
└─ Fields: is_displayed=1 for selected articles
```

### Key Data Fields Evolution

| Field | Discovery | Scoring | Enrichment | Display |
|-------|-----------|---------|------------|---------|
| title | SET | - | - | - |
| url | SET | - | - | - |
| published_date | SET | - | - | - |
| tier | SET | - | - | - |
| pmo_score | NULL | SET | - | - |
| pmo_category | 'AI_GENERAL' | **BUG** | **BUG** | **BUG** |
| pmo_relevance | NULL | - | SET | - |
| content_fetched | 0 | - | - | - |
| full_content | NULL | - | SET | - |
| is_displayed | 0 | - | - | SET |

**Bug:** `pmo_category` defaults to 'AI_GENERAL' and never updates

---

## 8. Issues Summary

### Critical Issues

1. **URL Deduplication Failure**
   - **Impact:** 168 duplicate entries for single URL
   - **Location:** DiscoveryEngine.js + DatabaseManager.insertArticle()
   - **Fix needed:** Enforce UNIQUE constraint on url column OR fix insertArticle() logic

2. **Category Classification Not Applied**
   - **Impact:** All articles show 'AI_GENERAL' regardless of PMO relevance
   - **Location:** pmo_category field never updated after default value
   - **Fix needed:** Update pmo_category during enrichment OR remove default value

3. **Display Queue Not Filling**
   - **Impact:** Only 5/20 articles displayed
   - **Root cause:** Combination of duplicates + limited enriched articles
   - **Fix needed:** Fix deduplication + ensure enrichment runs on more articles

### Design Issues

1. **Conflicting Categories**
   - `pmo_category` (PMO_RELATED, PMO_POTENTIAL, AI_GENERAL)
   - `pmo_relevance` (Direct, Inferred, Potential)
   - Both serve similar purpose, one works (relevance), one doesn't (category)

2. **Date Filtering Logic**
   - Display query uses `DATE(discovered_at) = runDate` (today only)
   - FIFO designed to build backlog over time
   - But query prevents accessing previous days' articles

3. **Multiple Deduplication Points**
   - Discovery: BROKEN (allows duplicates)
   - Pipeline query: WORKING (GROUP BY url)
   - Display manager: WORKING (checks existing URLs)
   - Inconsistent approach, partial protection

### Working Correctly

1. ✅ **Scoring** - AI scores articles 0-100 accurately
2. ✅ **Content Fetching** - Jina AI retrieves full text
3. ✅ **Enrichment** - AI generates metadata (TLDR, badges, relevance)
4. ✅ **FIFO Logic** - Will remove oldest when limit reached
5. ✅ **Display Deduplication** - Prevents duplicate URLs in display
6. ✅ **Card Generation** - Properly formats JSON output

---

## 9. Recommendations

### Immediate Fixes

1. **Add UNIQUE constraint on url:**
   ```sql
   CREATE UNIQUE INDEX idx_daily_insights_url ON daily_insights(url);
   ```

2. **Update pmo_category during enrichment:**
   ```javascript
   // In ContentEnricher.saveEnrichment()
   await this.db.run(`
       UPDATE daily_insights
       SET pmo_relevance = ?,
           pmo_category = ?
       WHERE id = ?
   `, [enrichment.pmo_relevance, this.mapRelevanceToCategory(enrichment.pmo_relevance), articleId]);
   ```

3. **Remove today-only filter for backlog:**
   ```sql
   -- Change from: WHERE DATE(discovered_at) = ?
   -- To: WHERE is_displayed = 0 (allows backlog from previous days)
   ```

### Strategic Improvements

1. **Consolidate category fields:** Choose ONE taxonomy (recommend pmo_relevance)
2. **Batch enrichment:** Enrich more articles to fill 20-article queue faster
3. **Monitoring:** Add alerts when displayed count < 15 (queue running low)

---

**End of Analysis**
