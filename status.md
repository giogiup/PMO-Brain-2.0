# PMO BRAIN 2.0 - STATUS

**Single source of truth for Chat & Code**

---

## HOW TO USE THIS FILE

**STATUS.md = PRIMARY coordination file (daily updates)**
- Current state, priorities, last action
- Both Chat & Code read FIRST every session
- Both update AFTER working
- This is your sync point

**Other files (reference only, rarely change):**
- **README.md** - Technical reference (commands, architecture, troubleshooting)
- **CLAUDE.md** - Quick context for new Chat sessions
- **AI-PROMPTS.md** - Complete AI prompt documentation (scoring, enrichment, prefilter)
- **Automation/README.md** - Module-specific technical docs
- **docs/session-log.md** - Historical tracking (append-only)

**Pattern every session:**
1. Read STATUS.md (current state)
2. Read CLAUDE.md if new session
3. Do work
4. Update STATUS.md with what changed

---

## CURRENT STATE

### Pipeline
**Status:** ✅ WORKING (auto-logs enabled)
**Last Run:** 2025-12-11 04:00 SAST
**Summary Log:** Auto-opens after each run

### Discovery
**Status:** ✅ COMPLETE
**Sources:** 185 enabled (103 RSS + 10 GDELT + 62 Google + 10 NewsAPI)
**Volume:** 1,700+ articles/day (Google 80%, RSS 20%)
**Performance:** 99% success, exponential backoff, 6.3min

### PreFilter
**Status:** ✅ FIXED & DEPLOYED (working since Dec 17)
**Mode:** Semantic (embeddings + streaming progress)
**Performance:** Processing 100% of daily articles (no 250 limit)
**Pass Rate:** 1.0%-5.5% (variable, content-dependent)
**Monitoring:** Stall detection (3min) + timeout (60min)

### Backlog
**Status:** ⚠️ HISTORICAL (8,964 articles from Oct-Dec)
**Source:** Articles from before Dec 17 fix (old LIMIT 250 code)
**Current Growth:** NOT growing (daily articles processed 100%)
**Action Needed:** Separate cleanup script to process in batches

---

## DISCOVERY WORKING LIST - ✅ COMPLETE

### 1. ✅ Logging System
- Date-based logs: `YYYY-MM-DD-summary.log` + `YYYY-MM-DD-detailed.log`
- Auto-opens summary after completion
- 30-day retention with auto-cleanup

### 2. ✅ Disabled 7 Broken RSS
- Removed: APM, Basecamp, Gantthead, MS Project, Miro, PMI Today, Trello
- 101 RSS feeds remaining (100% success rate)

### 3. ✅ Full 183 Source Test
- RSS: 101/101 (100%) = 320 articles
- GDELT: 10/10 (100%) = 0 articles
- Google: 62/62 (100%) = 1,251 articles
- **Total: 1,571 articles in 6.3min**

### 4. ✅ arXiv Sources
- Already disabled (0 found)

### 5. ✅ Tier-Aware PreFilter
- Enabled: use_tier_thresholds=true
- Tier 1: 40 → Tier 6: 70

### 6. ✅ New Tier 1 Sources
- Added: House of PMO, Acuity PPM
- 97 Tier 1 sources total

---

## CRITICAL ISSUES

### ~~PreFilter Bottleneck~~ ✅ RESOLVED & VERIFIED (Jan 11)
**Was:** Only 250/day processed due to LIMIT 250 (before Dec 17)
**Fixed:** Removed batch limit, added streaming progress monitoring
**Deployed:** Between Dec 11-17, 2025
**Verified:** Processing 100% of daily articles since Dec 17
**Evidence:** Dec 17: 312/312, Dec 18: 335/335, Dec 19: 311/311, Jan 13: 301/301

### Historical Backlog (Jan 11)
**Impact:** 8,964 unprocessed articles from Oct-Dec 2025
**Cause:** Articles discovered BEFORE Dec 17 fix (old LIMIT 250 code)
**Current:** NOT growing - daily pipeline processes 100% of new articles
**Action:** Need backlog cleanup script (process 500 at a time)

### GDELT Zero Contribution
**Impact:** 10 queries return 0 articles
**Cause:** Queries too specific (e.g., "AI Asana", "AI Trello")
**Status:** Low priority (RSS + Google provide sufficient volume)
**Action:** Broaden GDELT queries or disable

---

## RECENT WINS

### Summary Log Auto-Open (Dec 11)
- Integrated into production pipeline
- Auto-opens after each 4 AM run
- Shows discovery stats, pass rates, errors
- **Result:** Daily monitoring automated

### PreFilter Analysis Tool (Dec 11)
- Created analyze-prefilter.js
- Shows score distribution, top/bottom articles, tier stats
- Identified critical bottleneck
- **Result:** Clear visibility into PreFilter health

### Discovery Complete (Dec 10)
- 185 sources: 99% success, exponential backoff
- 1,700+ articles/day (Google 80%, RSS 20%)
- Disabled 7 broken RSS feeds
- **Result:** Production-ready Discovery engine

---

## 6-TIER SYSTEM (DESIGNED DEC 5)

**Tier 1:** PMO Core (PMI, Scrum.org, Agile Alliance) - 60-80% pass rate  
**Tier 2:** PM Disciplines (ENR, Mind the Product) - 40-60%  
**Tier 3:** AI Inference (OpenAI, Anthropic) - 30-50%  
**Tier 4:** PM Software (Monday, ClickUp) - 20-40%  
**Tier 5:** Business/Broad (HBR, McKinsey) - 10-20%  
**Tier 6:** General Tech (TechCrunch) - 5-10%

**Strategy:** Build Tier 1 robust FIRST, then expand

---

## TECH STACK

**Database:** SQLite (02-discovery-engine/pmo_insights.db)  
**Node:** 20.x  
**Python:** 3.11 (semantic PreFilter)  
**Environment:** Windows, PowerShell, UTC+2

**Key Modules:**
- DiscoveryEngine.js - 4 sources (RSS, Google, GDELT, NewsAPI)
- PreFilter.js - Hybrid semantic/keyword
- SemanticPrefilter.js - Python wrapper (10-min timeout)
- ScoringEngine.js - Multi-provider AI scoring

---

## LAST UPDATED

**Date:** 2026-01-27 14:30 SAST
**By:** Code
**Action:** ✅ V4 Design FULLY RESTORED - Fixed All Broken Styling
**Result:**
- ✅ FIXED: Hero icons sizing (3rem desktop, 32px mobile, 28px small mobile with !important constraints)
- ✅ FIXED: Article card display (switched back to styles-v2.css containing all card styling)
- ✅ FIXED: Latest Intelligence section (uses loadDailyCards() → daily-cards.json with rich TLDR/badges/keywords)
- ✅ FIXED: Strategic Insights section (uses loadCuratedInsights() → displayed-articles.json with curated articles)
- ✅ V4 Header: Fixed z-index 10000, 60px height, glassmorphic design, desktop/mobile nav
- ✅ V4 Result Popup: Centered, bordered by quadrant color, shows name/percentage/description
- ✅ V4 Email Modal: 2 checkboxes (Advanced Assessment + Newsletter), validation, EmailOctopus ready
- ✅ All components properly namespaced (site-header-, hero-, AssessmentFlow, HeaderMenu)
- ✅ CSS Stack: styles-v2.css (cards) + hero.css + header-styles.css + assessment-flow.css
- ✅ DEPLOYED: Commits 096a445 (styling fix), a769d92 (icon fix), c34b963 (V4 base)
- ✅ LIVE: https://smartpmo.ai fully functional with V4 design + rich article cards
**Next:** Add EmailOctopus API credentials → Monitor conversion rate

**Phase 1 Achievements:**
- Database cleaned: 23,671 → 3,834 unique articles (84% reduction)
- Deleted 10,109 pre-Jan 15 articles
- Removed 9,728 duplicate articles (50% waste eliminated)
- UNIQUE constraint on URL prevents future duplicates
- Published date validation (4-step check in DiscoveryEngine.js)

**Phase 2 Achievements:**
- 3-category taxonomy deployed (PMO_RELATED/PMO_POTENTIAL/AI_GENERAL)
- Scoring prompt v3.0 active (JSON format with category + score + reasoning)
- ScoringEngine.js updated (JSON parsing, category validation, fallback)
- ArticleDisplayManager completely rewritten (category-aware batch FIFO)
- AI_GENERAL 50% hard cap enforced (max 10 of 20)
- FIFO uses `published_date` (not `discovered_at`) for freshness

**Phase 3 Achievements:**
- Enrichment buffer: 20→30 articles (run-daily-pipeline.js:155,175)
- Display selection: Today + yesterday backfill logic (run-daily-pipeline.js:200-323)
- Strategic Insights exclusion: curated_articles excluded by URL (run-daily-pipeline.js:228-230,263-265)
- Batch updateAutoSection() with array of IDs (not single ID loop)

**Database State:**
- Total articles: 3,834 (unique, post-Jan 15, ready for scoring)
- `pmo_category`: All NULL (will be assigned by v3.0 prompt on next scoring run)
- `is_displayed`: All 0 (will be populated by new display logic)
- Scoring prompt: v3.0 active
- Enrichment buffer: 30 articles
- Strategic Insights: 4 curated articles (excluded from auto-display)

**Code Changes:**
- `DiscoveryEngine.js:14-28, 193-233` - Date validation, articlesRejected tracking
- `ScoringEngine.js:227-329` - JSON parsing, deriveCategory() fallback
- `ScoringEngine.js:137-166` - Saves pmo_category to database
- `ArticleDisplayManager.js:37-304` - Complete rewrite with batch logic, calculateChanges(), removeOldestByCategory()
- `run-daily-pipeline.js:155,175` - ENRICHMENT_BUFFER = 30
- `run-daily-pipeline.js:200-323` - Today + yesterday backfill, batch updateAutoSection(), curated exclusion

**Migrations:**
- `001_cleanup_pre_jan15_v3.sql` - Delete old articles
- `002_add_url_unique_constraint_v2.sql` - UNIQUE index
- `003_category_taxonomy_reset.sql` - Reset categories
- `004_update_scoring_prompt.sql` - Deploy v3.0

**Tests:**
- `test-phase1.js` - 6/6 passing (cleanup, deduplication, dates)
- `test-phase2-display.js` - 7/7 passing (display manager, limits)
- `test-curated-exclusion.js` - 5/5 passing (Strategic Insights exclusion)

**Documentation:**
- `IMPLEMENTATION_COMPLETE.md` - Full implementation summary
- `PHASE2_PROGRESS.md` - Updated with Phase 3 details

**Next:** Run full pipeline to score articles with v3.0 prompt and verify end-to-end display logic

---

## DUAL-SECTION ARTICLE DISPLAY (In Progress - Jan 16)

**Status:** Phase 1 & 2 Complete, Phase 3-5 Pending

### Completed:
- ✅ Specification: SPEC_Dual_Section_Article_Display.md
- ✅ Database Backup: pmo_insights_backup_20260116.db (24MB)
- ✅ Migration 001: curated_articles table created
- ✅ Migration 001: is_displayed column added to daily_insights
- ✅ ArticleDisplayManager.js created with FIFO logic
- ✅ Test scripts created

### Pending:
- ⚠️  Fix operations_log constraint issue in ArticleDisplayManager
- 📝 Create API endpoint: /api/displayed-articles.json
- 📝 Update pipeline to call updateAutoSection() on card deployment
- 📝 Create admin console for curated article management
- 📝 Update frontend index.html with dual sections
- 📝 Mobile responsive CSS (4 col → 1 col)
- 📝 Navigation menu anchor links

### Known Issues:
1. **operations_log constraint**: ArticleDisplayManager uses operation_type values not in DB constraint
   - Constraint allows: scoring, content-fetch, newsletter-generation, keyword-extraction, json-export, deployment, backup, maintenance, error, manual
   - Fix: Use 'manual' operation_type or remove logging

2. **ArticleDisplayManager.js needs cleanup** to remove broken logging code

---

## WEBSITE DESIGN DOCUMENTATION (Jan 17, 2026)

### Design System Overview

**Color Palette:**
- Primary Cyan: `#00F5FF` - Headlines, links, accents
- Primary Purple: `#825AFF` - Gradients, secondary accents
- Primary Blue: `#4C78FF` - Badge accents
- Background: `#050505` (near-black)
- Panel Background: `rgba(30, 35, 45, 0.75)` (semi-transparent dark blue-grey)
- Text Primary: `#e8f0ff` (off-white)
- Text Muted: `#b0c4de` (light blue-grey)
- Glass Border: `rgba(255, 255, 255, 0.06)` (subtle white)

**Typography:**
- Font Family: 'Inter' (Google Fonts)
- Weights: 400 (regular), 600 (semi-bold), 700 (bold), 800 (extra-bold)
- Anti-aliasing: Enabled (`-webkit-font-smoothing: antialiased`)

**Layout Container:**
- Max Width: `1200px`
- Padding: `1.5rem` (24px) horizontal
- Centered with `margin: 0 auto`

---

### Visual Effects

**Animated Background:**
- Fixed position radial gradients (cyan at 20% 30%, purple at 80% 70%)
- Breathing animation (20s ease-in-out infinite loop)
- Opacity oscillates 0.6 → 0.8 → 0.6
- Creates ambient glow effect

**Glassmorphism:**
- All cards use `backdrop-filter: blur(20px)` for frosted glass effect
- Semi-transparent backgrounds with subtle borders
- Layered depth via shadows and blur

**Micro-interactions:**
- Card hover: `translateY(-4px)` lift with shadow expansion
- Badge hover: `translateY(-2px)` + glow shadow using `currentColor`
- Button hover: `translateY(-2px)` + cyan glow shadow
- Link hover: Color shift to cyan
- Smooth transitions: `0.2s` to `0.3s` duration

---

### Header (Fixed Navigation)

**Layout:**
- Fixed position at top, full width
- Background: `rgba(5, 5, 5, 0.85)` with `backdrop-filter: blur(10px)`
- Border-bottom: Subtle glass border
- Height: ~60px
- Z-index: 1000 (above all content)

**Components:**
- **Logo + Brand**: 40px SVG logo with cyan drop-shadow, "SmartPMO.ai" text (1.25rem, 800 weight)
- **Navigation Menu**: Horizontal links ("Latest Intelligence", "Strategic Insights", "Newsletter")
  - Color: Muted grey, hover → cyan
  - Font weight: 600
  - Gap: 2rem between items
- **Hamburger Menu**: Mobile only (hidden on desktop)
  - 3 horizontal bars (24px × 2px), cyan color
  - Animates to X on click

---

### Hero Section

**Layout:** 2-column grid (1fr 1fr) with 3rem gap

**Left Column:**
1. **Hero Image** (stacked at top on mobile)
   - Border-radius: 16px
   - Box-shadow: Cyan glow (`0 20px 60px rgba(0, 245, 255, 0.15)`)
   - Max-height: 300px, object-fit: cover

2. **Headline**
   - Font-size: Clamp(1.75rem, 4vw, 2.5rem) - responsive
   - Font-weight: 800
   - Gradient text: Cyan → Purple (135deg)
   - Text: "30,000 AI articles distilled into 10 daily PMO Insights."

3. **Carousel** (60px height)
   - 3 rotating messages
   - Fade in/out animation (8s interval)
   - Opacity: 0 → 1 with translateY(20px) → 0
   - Color: Muted grey
   - Example: "150,000 AI articles analyzed weekly..."

**Right Column:**
- **Signup Card**
  - Background: Panel color with glassmorphism
  - Border-radius: 16px
  - Padding: 1.5rem 2rem
  - Shadow: `0 20px 40px rgba(0, 0, 0, 0.3)`
  - **Title**: "Get Your Weekly Top 20" (cyan, 1.4rem)
  - **EmailOctopus Form**: Embedded script
  - **Note**: "✓ Weekly digest · 5-min read · Unsubscribe anytime"

---

### Article Sections (Dual Display)

**Two Distinct Sections:**

1. **Latest Intelligence** (Auto-Discovered)
   - Section ID: `#latest-intelligence`
   - Grid ID: `auto-articles-grid`
   - Icon: Lightning bolt (Lucide `zap`)
   - Subtitle: "AI-Discovered PMO Insights"
   - Data Source: `api/daily-cards.json` (enriched cards with full metadata)

2. **Strategic Insights** (Curated)
   - Section ID: `#strategic-insights`
   - Grid ID: `curated-articles-grid`
   - Icon: Star (Lucide `star`)
   - Subtitle: "Curated by PMO Experts"
   - Data Source: `api/displayed-articles.json` → `strategicInsights` array

**Section Title Styling:**
- Font-size: 2rem
- Font-weight: 800
- Color: Text primary
- Margin-bottom: 2rem
- Includes inline icon + subtitle span

---

### Card Design (Enriched Articles)

**Grid Layout:**
- CSS Grid: `repeat(auto-fill, minmax(420px, 1fr))`
- Gap: 1.5rem
- Responsive: 3-4 cards on desktop, 1 on mobile

**Card Structure** (top to bottom):

1. **Tagline** (`.card-tagline`)
   - Color: Cyan
   - Font-size: 0.95rem
   - Font-weight: 600
   - Purpose: One-sentence hook/summary

2. **Title** (`.card-title`)
   - Font-size: 1.1rem
   - Font-weight: 700
   - Line-height: 1.4
   - Link color: Off-white → cyan on hover

3. **Meta** (`.card-meta`) - **NEW as of Jan 17**
   - Published date (formatted: "Jan 17, 2026")
   - PMO Score (e.g., "Score: 75")
   - Font-size: 0.85rem, muted color

4. **TLDR Badge** (`.tldr-badge`)
   - Background: Cyan (15% opacity)
   - Text: "⚡ TLDR" with lightning icon
   - Margin: 8px 0 12px 0
   - Inline-block

5. **TLDR Content** (`.card-tldr`)
   - **Structure**: `<ul>` with `<li>` bullets
   - List-style: None (custom styling)
   - Gap: 0.5rem between items
   - Font-size: 0.9rem
   - Color: Muted grey
   - Line-height: 1.3

6. **Badge Row** (`.card-badges`)
   - Flexbox with wrap
   - Gap: 0.75rem
   - 5 badges displayed:

   **a. PMO Area Badge** (`.pmo-badge`)
   - Icon: Layout-dashboard (Lucide)
   - Background: Cyan (10% opacity)
   - Border: Cyan (30% opacity)
   - Text: Cyan
   - Values: "Risk", "Strategy", "Resource", "Integration", etc.

   **b. Implementation Badge** (`.implementation-badge`)
   - Icon: Rocket (Lucide)
   - Background: Orange (10% opacity)
   - Border: Orange (30% opacity)
   - Text: Orange (#FF8800)
   - Values: "Quick Win", "Weeks to Deploy", "Long to Deploy"

   **c. Skill Level Badge** (`.skill-badge`)
   - Icon: Graduation-cap (Lucide)
   - Background: Purple (10% opacity)
   - Border: Purple (30% opacity)
   - Text: Purple
   - Values: "Beginner", "Intermediate", "Expert"

   **d. Read Time Badge** (`.time-badge`)
   - Icon: Book-open (Lucide)
   - Background: Blue (10% opacity)
   - Border: Blue (30% opacity)
   - Text: Blue
   - Format: "X min read"

   **e. Price Badge** (`.price-badge`)
   - Icon: Dollar-sign (Lucide)
   - Background: Gold (10% opacity)
   - Border: Gold (30% opacity)
   - Text: Gold (#FFD700)
   - Values: "Free", "Paid", "Freemium", "Enterprise"

   **Badge Styling:**
   - Padding: 0.5rem 0.9rem
   - Border-radius: 8px
   - Font-size: 0.75rem
   - Font-weight: 600
   - Text-transform: Uppercase
   - Letter-spacing: 0.5px
   - Icon size: 14px × 14px

7. **Keyword Tags** (`.card-tags`)
   - Flexbox with wrap
   - Gap: 0.5rem
   - Margin-top: Auto (pushed to bottom)
   - Each tag: Small pill with 5% white background, glass border
   - Font-size: 0.75rem
   - Padding: 0.3rem 0.7rem
   - Border-radius: 6px

**Card Container:**
- Background: Panel color (`rgba(30, 35, 45, 0.75)`)
- Border: Cyan-green gradient (30% opacity)
- Border-radius: 14px
- Padding: 1.25rem 1.5rem
- Backdrop-filter: Blur(20px)
- Shadow: `0 8px 32px rgba(0, 0, 0, 0.4)`
- Hover: Lift 4px + brighter shadow + border glow

---

### Curated Cards (Strategic Insights)

**Simplified Design** (no badges):

1. **Title** (`.card-title`)
   - Same styling as enriched cards

2. **Summary** (`.card-summary`)
   - Plain text or markdown bullets
   - Font-size: 0.9rem
   - Color: Muted grey

3. **Meta Row** (`.card-meta`)
   - Source (e.g., "simonwillison.net")
   - Published date
   - Optional score
   - Flexbox layout with gap

**Container:**
- Same glassmorphic panel styling as enriched cards
- Border color may differ (distinct visual cue)

---

### Mobile Responsive Design

**Breakpoint:** `@media (max-width: 768px)`

**Changes:**
- **Hero Grid**: 1 column instead of 2
  - Image + Signup stacked vertically
- **Card Grid**: `grid-template-columns: 1fr` (single column)
- **Navigation**: Hamburger menu replaces horizontal nav
  - Menu slides from top, absolute positioned
  - Background: Same as header with backdrop blur
- **Font Sizes**: Reduced via clamp() functions
- **Tap Targets**: Min-height 48px for accessibility
- **Badge Wrapping**: Badges stack more vertically

---

### Icon System

**Library:** Lucide Icons (CDN)
- Script: `<script src="https://unpkg.com/lucide@latest"></script>`
- Initialization: `lucide.createIcons()` called after card render

**Icons Used:**
- `zap`: Lightning bolt (TLDR, Latest Intelligence section)
- `star`: Star (Strategic Insights section)
- `layout-dashboard`: Dashboard grid (PMO Area badge)
- `rocket`: Rocket (Implementation badge)
- `graduation-cap`: Mortarboard (Skill Level badge)
- `book-open`: Open book (Read Time badge)
- `dollar-sign`: Dollar symbol (Price badge)

**Styling:**
- Width/Height: 14px (badges), 16px-24px (section headers)
- Vertical-align: Middle
- Color: Inherits from parent badge

---

### Data Flow

**Latest Intelligence Cards:**
1. Fetch: `./api/daily-cards.json?t=<timestamp>`
2. Parse JSON: `{ generated, date, count, cards[] }`
3. Iterate `cards` array
4. Render each card with:
   - `card.tagline` → `.card-tagline`
   - `card.title` → `.card-title`
   - `card.url` → Link href
   - `card.date` → Formatted date (formatDate())
   - `card.score` → "Score: X"
   - `card.tldr[]` → `<ul><li>` bullets
   - `card.badges.pmoArea` → PMO badge text
   - `card.badges.implementation` → Implementation badge
   - `card.badges.skillLevel` → Skill badge
   - `card.badges.readTime` → Read time + " min read"
   - `card.badges.price` → Price badge
   - `card.keywords[]` → Keyword tags
5. Call `lucide.createIcons()` to render SVG icons

**Strategic Insights Cards:**
1. Fetch: `./api/displayed-articles.json?t=<timestamp>`
2. Parse JSON: `{ latestIntelligence[], strategicInsights[] }`
3. Use `strategicInsights` array
4. Render via `renderCuratedSection()` function
5. Uses `createArticleCard()` helper (simpler than enriched cards)

---

### Performance Optimizations

**Image Loading:**
- `loading="lazy"` on hero image
- Responsive `srcset`: "hero-barista-small.jpg 600w, hero-barista.jpg 1200w"
- `sizes`: "(max-width: 768px) 100vw, 50vw"
- Preload hint: `<link rel="preload" as="image" href="hero-barista-small.jpg">`

**CSS:**
- Critical CSS inlined in `<head>` for instant first paint
- External stylesheet (`styles-v2.css`) loaded separately
- Font display: `swap` to prevent invisible text

**Cache Busting:**
- CSS: `?v=<git-sha>` query parameter
- JSON: `?t=<timestamp>` query parameter

**Animations:**
- Respects `prefers-reduced-motion: reduce` media query
- All animations reduced to 0.01ms if user prefers reduced motion

---

### JavaScript Functions

**Card Rendering:**
- `renderCards(cards)` - Renders enriched cards to `#auto-articles-grid`
- `renderCuratedSection(articles)` - Renders curated cards to `#curated-articles-grid`
- `createArticleCard(article, type)` - Helper for creating card HTML
- `formatDate(dateString)` - Formats "2026-01-17" → "Jan 17, 2026"

**Data Loading:**
- `loadDailyCards()` - Fetches `daily-cards.json`, calls `renderCards()`
- `loadCuratedInsights()` - Fetches `displayed-articles.json`, calls `renderCuratedSection()`

**Initialization:**
- `loadDailyCards()` - Called on page load
- `loadCuratedInsights()` - Called on page load
- Carousel rotation: `setInterval()` every 8 seconds
- Hamburger menu toggle: Event listeners for mobile

---

### Accessibility

**ARIA Labels:**
- None currently implemented (opportunity for improvement)

**Keyboard Navigation:**
- All links and buttons are focusable
- Focus styles: Cyan outline with box-shadow

**Semantic HTML:**
- `<header>`, `<nav>`, `<section>`, `<footer>` landmarks
- `<h1>` for hero headline
- `<h2>` for section titles
- `<h3>` for card titles
- `<ul>/<li>` for TLDR bullets

**Color Contrast:**
- Text primary on dark bg: ~15:1 ratio (excellent)
- Cyan on dark bg: ~8:1 ratio (good)
- Badge text on badge bg: Verified for WCAG AA

**Focus Indicators:**
- Input focus: Cyan border + 3px box-shadow
- Link focus: Browser default (outline)

---

### Known Design Limitations

1. **No Dark/Light Mode Toggle**: Only dark theme available
2. **No Loading States**: Cards render instantly or show nothing
3. **No Error States**: Failed fetch shows console error, no user feedback
4. **No Skeleton Loaders**: Cards appear all at once (no progressive loading)
5. **No Pagination**: All 20 cards load at once (acceptable for 20 items)
6. **Fixed Grid Width**: `420px` min-width may be too wide for some tablets
7. **No Card Sorting/Filtering**: Display order is server-determined
8. **No Search**: Users cannot search cards on frontend
9. **Badge Values Not Clickable**: Badges are visual-only, no filtering by badge
10. **No Expandable TLDR**: All bullet points always visible (no "Read more")

---

### Design Improvement Opportunities

**Visual Enhancements:**
- Add subtle parallax scrolling to background gradients
- Animate cards in on scroll (stagger effect)
- Add "New" badge for articles <24 hours old
- Highlight premium articles (score ≥89) with gold border
- Add visual separator between card sections (decorative line)

**UX Improvements:**
- Add skeleton loaders during fetch
- Add error state UI for failed fetches
- Add "No articles" empty state with illustration
- Add toast notifications for user actions
- Add smooth scroll to section anchors
- Add "Back to top" button on long scrolls

**Interactivity:**
- Make badges clickable to filter cards by category
- Add search bar to filter cards by keyword
- Add sort dropdown (by date, score, read time)
- Add "Save for later" functionality (localStorage)
- Add share buttons for individual cards

**Accessibility:**
- Add ARIA labels to all interactive elements
- Add skip-to-content link
- Add visible focus indicators for keyboard navigation
- Add screen reader announcements for dynamic content
- Test with screen readers (NVDA, JAWS, VoiceOver)

**Performance:**
- Lazy-load cards below fold (intersection observer)
- Optimize badge icon rendering (sprite sheet vs individual SVGs)
- Add service worker for offline support
- Compress images further (WebP format)
- Add font subsetting for Inter (only used characters)

**Responsive:**
- Test on iPad (768px-1024px breakpoint needs work)
- Improve badge wrapping on narrow screens
- Reduce gap on mobile (1.5rem → 1rem)
- Stack badges vertically on very narrow screens

---

## CRITICAL: WORKING DIRECTORY POLICY

**⚠️ NEVER WORK IN CLAUDE CODE WORKTREES ⚠️**

**Forbidden locations:**
- ❌ `C:\Users\GioHome\.claude-worktrees\PMO-Brain-2.0-Modular\*`
- ❌ Any worktree directory (great-hugle, quirky-yonath, vigilant-joliot, etc.)

**Correct location:**
- ✅ `D:\PMO-Brain-2.0-Modular\` - ONLY work here

**Why:**
- Worktrees are temporary Claude Code scratch directories
- Files created in worktrees are isolated from main repo
- Main automation, database, and deployment run from D: drive
- Worktrees cause file location confusion and duplication

**Action:** All code, documentation, and changes MUST be in `D:\PMO-Brain-2.0-Modular\`

---

## UPDATE INSTRUCTIONS

### For Code (after making changes):
```markdown
## LAST UPDATED
Date: YYYY-MM-DD HH:MM SAST
By: Code
Action: [What you did]
Result: [What changed]
Next: [What should happen next]
```

### For Chat (after research/decisions):
```markdown
## LAST UPDATED
Date: YYYY-MM-DD HH:MM SAST
By: Chat
Action: [What you researched/decided]
Result: [Key findings]
Next: [Action for Code or next Chat session]
```

---

**Both Chat and Code read this file first. Keep it current.**
