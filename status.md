# PMO BRAIN 2.0 - STATUS

**LAST UPDATED: 2026-02-24 SAST by Code (B-27 Blog Source Expansion)**

**Single source of truth for Chat & Code**

---

## 🟢 CURRENT STATE: PIPELINE STABLE — CONSOLE CONSOLIDATED ✅

**Pipeline:** Healthy. Scoring-only run completed 2026-02-24 (8.6 min, 33/33 scored, 0 failures). Deployed to smartpmo.ai.
**Console:** ✅ B-16 DONE — Port 3333 absorbed into port 8080 as "Pipeline Runner" tab. WebSocket live log, Run/Stop, stage progress, cards preview. Scheduler auto-opens console + browser when `--trigger=scheduler` runs (4 AM SAST). Falls back to direct run if console fails.
**Website:** 20/20 articles displayed. Mix: 10 AI_GENERAL + 9 PMO_POTENTIAL + 1 PMO_RELATED (cap bug self-corrected on B-25 run).
**Assessment:** ✅ B-05 LIVE — 15-question assessment at smartpmo.ai/assessment. Quadrant result + scores + copy/email. Hero redesigned to Layout B (3-band stacked narrative).
**About:** ✅ B-01 LIVE — About page at smartpmo.ai/about. 8 content sections, stat callout, category cards, CTA block. Inter font throughout. Nav link on all 3 pages.
**Newsletter:** ✅ B-02 BUILT — `Automation/newsletter/send-weekly-newsletter.js`. Top 20 articles, email-safe HTML, EmailOctopus v1.6 API, `--dry-run` tested. Before first live send: set up sender email `newsletter@smartpmo.ai` (Cloudflare Email Routing + DNS verification). Schedule: Fridays 07:45 SAST via `run-newsletter.bat`.
**SEO:** B-03 complete — full meta/OG/Twitter tags, 3× JSON-LD, sitemap.xml, robots.txt, webmanifest (2026-02-20).
**Mobile:** Fixed (v3+Fix47) — mobile-fixes.css: single-column grid, hero bands stack, card footer visible, 32px tap targets. `share-btn` → `shr-icon` (ad blocker bypass).
**CSS loading:** Recovered — href corruption fixed (SPEC-SITE-RECOVERY-v1). All 5 CSS files 200 OK on live site (assessment-flow.css removed).
**Banner:** Amber maintenance banner live (dismissable). Header/body offset applied. Share buttons restored (hideVoteBar fix).
**Votes API:** ✅ LIVE — Cloudflare Worker + D1. URL: https://smartpmo-votes.ggpera.workers.dev — /health ✅ /votes/68054 returns upvotes:2 ✅. 23 votes migrated. local VotesAPI (localhost:3334) retired.
**Sources:** ✅ B-27 DONE — 434 enabled (was 379). 55 new RSS blogs added (validated from 69 proposed). 14 failed validation (7× 404, 7× non-XML). T1=13, T2=31, T4=11. 11 Cat-A (direct intersection), 44 Cat-B (PMO_POTENTIAL).
**Cerebras:** Fixed — model `gpt-oss-120b` (120B reasoning model). AIProviderAdapter patched for `.reasoning` field.
**Prompts:** v1.2 classification + v1.2 quality + v1.3 enrichment — ALL ACTIVE ✓ (B-25: text output format replaces JSON)

---

## PIPELINE FLOW

```
Discovery (1089) → PreFilter (100) → Scoring (78 pass) → Fetch (12) →
Enrich (10) → Cards (20) → Display (20) → Deploy (GitHub → Cloudflare)
```

---

## WEBSITE STATUS

- **URL:** https://smartpmo.ai
- **Articles displayed:** 20/20
- **Distribution:** 1 PMO_RELATED + 9 PMO_POTENTIAL + 10 AI_GENERAL
- **AI_GENERAL cap:** ✅ Correct (10/10, within 50% cap). Self-corrected on B-25 scoring run.
- **Last deploy:** 2026-02-24 ~07:16 UTC (B-25 scoring run, auto-deploy via GitHub push)
- **Host:** Cloudflare Pages (auto-deploy from GitHub push to website repo)
- **API files:** `daily-cards.json` + `displayed-articles.json` + `live-stats.json`

---

## PROVIDER STATUS (as of 2026-02-24)

| Provider | Priority | Use Case | Model | Status |
|----------|----------|----------|-------|--------|
| cerebras | 1 | scoring | **gpt-oss-120b** | ✅ Active — 120B reasoning model, text markers (B-25), 33/33 success |
| groq | 2 | scoring | llama-3.3-70b-versatile | ❌ Disabled — 403 geo-blocked from SA |
| fireworks | 3 | scoring fallback | llama-v3p3-70b-instruct | ✅ Active (~1-2s/call, reliable) |
| openrouter | 4 | scoring fallback | llama-3.3-70b:free | ✅ NEW (B-24) — 50/day free, proxies through US (no geo-blocks) |
| openai | 6 | scoring last resort | gpt-4o-mini | Paid fallback |
| gemini | 1 | enrichment | gemini-2.5-flash | ⚠️ Free tier quota hit (20/day limit) — falls back to openai |
| openai | 2 | enrichment fallback | gpt-4o-mini | Paid fallback (~$0.0003/article) |

**Cerebras model history:** llama-3.3-70b deprecated ~Feb 16 → qwen-3-32b ❌ 404 → qwen-3-235b-a22b ❌ 404 → gpt-oss-120b ❌ incompatible (no .content field) → llama3.1-8b (8B fallback) → AIProviderAdapter patched → gpt-oss-120b ✅ current.
**AIProviderAdapter fix (2026-02-19):** `content: msg.content || msg.reasoning || ''` — handles both standard and reasoning model output.
**Available models on this account:** gpt-oss-120b ✅ 120B production | llama3.1-8b ✅ 8B fallback | qwen-3-32b ❌ 404 | qwen-3-235b-a22b-instruct-2507 ❌ 404 | zai-glm-4.7 ❌ 404
**Scoring cascade (B-24):** cerebras/gpt-oss-120b (2000/day) → fireworks (205/day) → openrouter (50/day, free) → openai (paid, last resort). Groq disabled (SA geo-block).

---

## RUN HISTORY

| Run | Date | Status | Sources | Articles | Duration |
|-----|------|--------|---------|----------|----------|
| 171 | 2026-02-19 | ✅ completed | 308/421 | 1,089 | 22.1 min |
| 170 | 2026-02-17 | ❌ failed | 0/0 | 0 | — |
| 169 | 2026-02-16 | ✅ completed | 251/274 | 219 | 21.7 min |
| 168 | 2026-02-15 | ✅ completed | 259/274 | 80 | 16.0 min |
| 167 | 2026-02-15 | ✅ completed | 230/254 | 53 | 14.9 min |

**Run 171 article backfill (72h lookback):**
- Feb 16: 241 | Feb 17: 308 | Feb 18: 498 | Feb 19: 205

---

## SCORING RESULTS

### B-25 verification run (2026-02-24, scoring-only)

| Category | Count | Avg Q | Pass |
|----------|-------|-------|------|
| PMO_POTENTIAL | 1 | 62 | 1 |
| AI_GENERAL | 26 | 61 | 20 |
| REJECT | 6 | — | — |
| **TOTAL** | 33 | — | **21** |

**✅ 33/33 scored, 0 parse failures** (B-25 text markers working). All via cerebras/gpt-oss-120b. No fallback strategies needed.

### Run 171 baseline (2026-02-19)

| Category | Count | Avg Q | Pass |
|----------|-------|-------|------|
| PMO_RELATED | 1 | 60 | 1 |
| PMO_POTENTIAL | 1 | 80 | 1 |
| AI_GENERAL | 77 | 78 | 76 |
| REJECT | 21 | — | — |
| **TOTAL** | 100 | — | **78** |

---

## PMO CATCH RATE DIAGNOSIS (Run 171)

**Verdict: Not a filtering bug — source base had very few PMO+AI articles in this 72h window.**

| Metric | Count | Notes |
|--------|-------|-------|
| Discovered | 1,089 | 72h lookback |
| PMO-keyword articles | 9 | 0.8% of discovered |
| PMO-keyword passed AI gate | 8/9 | 1 killed: "Agile Manifesto turns 25" (sim_ai=0.158) |
| Killed by AI gate overall | 696 | sim_ai < 0.25 — working as designed |
| Prefilter pass rate | 31.9% | 347/1,089 |

**Root cause:** Source base simply didn't surface PMO+AI content in this period. 72h backfill skewed toward Feb 18 news (498 articles) which was heavy AI_GENERAL.

**What was investigated:**
- AI gate (0.25) is not over-blocking PMO content — only 1 PMO article killed, arguably correct
- Several AI_GENERAL articles could be borderline PMO_POTENTIAL ("enterprise AI governance", "agentic AI projects stall") — classification prompt arguably correct per current rules
- Lowering AI gate NOT recommended — would re-introduce non-AI content leak

**Action:** Monitor over next 3-5 runs. If PMO catch rate stays <3/100, revisit source additions for PMO+AI outlets.

---

## SOURCE HEALTH (post B-27 expansion, 2026-02-24)

| Type | Enabled | Disabled | Total |
|------|---------|----------|-------|
| RSS | 362 | 97 | 459 |
| Google | 62 | 13 | 75 |
| TheNewsAPI | 10 | 0 | 10 |
| GDELT | 0 | 20 | 20 |
| **TOTAL** | **434** | **130** | **564** |

**Cleanup applied this session (42 feeds disabled):**
- Section A (19 dead): McKinsey QuantumBlack AI, Google Cloud AI Blog, Stanford HAI News, Analytics Vidhya, John Goodpasture Blog, PM Basics, PMStudent, Benedict Evans, Designer News, Height Blog, YouTube: Matt Wolfe, YouTube: The AI Advantage, BCG on AI, Zapier Blog AI, Zapier Blog, Notion AI Blog, Red Hat AI Blog, InfoWorld AI, Meta AI Blog
- GDELT (20): All disabled — 0% success rate, wasted ~5 min per run
- Email-only newsletters (3): TLDR AI, Superhuman AI (Zain Kahn), The Neuron

**Fix list applied:** `Automation/fix-list-2026-02-19.sql` — Sections A, C, D applied ✅

**Feeds hitting 20s timeout cap (working as designed):** Silicon Republic, n8n Blog

---

## CATEGORY THRESHOLDS (Option B — LIVE)

| Category | Quality Min | AI_GENERAL cap |
|----------|-------------|----------------|
| PMO_RELATED | >=50 | — |
| PMO_POTENTIAL | >=50 | — |
| AI_GENERAL | >=50 | 10/20 (50% hard cap) |

Configurable in `Automation/config/display-thresholds.js`

---

## FIXES SUMMARY

| # | Fix | Date | Status |
|---|-----|------|--------|
| 1-7 | Various pipeline fixes | Feb 4 | ✅ Done |
| 8-11 | Enrichment, scoring, prefilter, console | Feb 5 | ✅ Done |
| 12 | Display stage missing article IDs | Feb 10 | ✅ Done |
| 13 | Tiered thresholds for 3-category display | Feb 10 | ✅ Done |
| 14 | Option B: Two-Pass Scoring (all 4 phases) | Feb 11-12 | ✅ Done |
| 15 | Display db.prepare crash in run-manual-console | Feb 12 | ✅ Done |
| 16 | Gemini provider support in AIProviderAdapter.js | Feb 12 | ✅ Done |
| 17 | Gemini model name stale (2.0-flash-exp → 2.5-flash) | Feb 12 | ✅ Done |
| 18 | Deploy function missing displayed-articles.json | Feb 12 | ✅ Done |
| 19 | Stale cards: JSON generated before display step | Feb 12 | ✅ Done |
| 20 | Enrichment keyword validator too strict (=3 → >=3) | Feb 13 | ✅ Done |
| 21 | Disable 3 arxiv RSS feeds (ids 129,130,131) | Feb 14 | ✅ Done |
| 22 | Add AI score gate to prefilter (sim_ai < 0.15 → Reject) | Feb 14 | ✅ Done |
| 23 | Display FIFO floor safeguard | Feb 14 | ✅ Done |
| 24 | Fix FIFO currentDisplay query (remove NULL filters) | Feb 14 | ✅ Done |
| 25 | Non-AI article leak (disable Slack, raise AI gate 0.15→0.25) | Feb 14 | ✅ Done |
| 26 | Deploy step added to run-manual-console.js | Feb 15 | ✅ Done |
| 27 | Job posting filter in prefilter_titles.py (3 regex patterns) | Feb 15 | ✅ Done |
| 28 | Pipeline consolidation: run-pipeline.js + EventReporter + DB tables | Feb 15 | ✅ Done |
| 29 | RobustRSSParser: 20s hard cap per feed (fixed pipeline hang) | Feb 19 | ✅ Done |
| 30 | run-daily-pipeline.js: --lookback=N hours arg (72h recovery) | Feb 19 | ✅ Done |
| 31 | AI_GENERAL cap enforcement: Phase 1.5 in ArticleDisplayManager | Feb 19 | ✅ Done |
| 32 | Cerebras model: llama-3.3-70b → llama3.1-8b (deprecated model) | Feb 19 | ✅ Done |
| 33 | Source cleanup: 42 feeds disabled (19 dead + 20 GDELT + 3 newsletters) | Feb 19 | ✅ Done |
| 34 | B-09: Provider alert — AIRouter consecutive failure tracking, PROVIDER ALERT at N=5, `provider-alerts.log` | Feb 19 | ✅ Done |
| 35 | B-10: Auto-open log — bat files spawn PowerShell live-tail window, all output → `pipeline-output.log` | Feb 19 | ✅ Done |
| 36 | Cerebras gpt-oss-120b: AIProviderAdapter patched (.content \|\| .reasoning), DB updated | Feb 19 | ✅ Done |
| 37 | B-04: Voting buttons — article_votes table, VotesAPI (port 3334), vote bars on cards, VotesModule IIFE | Feb 19 | ✅ Done |
| 38 | SPEC-CARD-LAYOUT-OPTION-A: Badge row inline, unified footer (votes + share), remove tags/date rows, plain TLDR bullets | Feb 20 | ✅ Done |
| 39 | B-03: Gold-standard SEO — title, description, OG/Twitter tags (1200×630), Organization + WebSite + CollectionPage JSON-LD, robots.txt (AI crawler allowlist), sitemap.xml, webmanifest | Feb 20 | ✅ Done |
| 40 | SPEC-MOBILE-FIX-v1: mobile-fixes.css (loaded last) — 1-col mobile/2-col tablet/3-col desktop grid, hero axis labels hidden ≤768px, quadrant min() sizing, section title flex-wrap, card overflow protection, footer wrap ≤400px. Cache busted all 6 CSS files (?v=2). push-bust.ps1 updated to bust all CSS refs. | Feb 20 | ✅ Done |
| 41 | SPEC-MOBILE-FIX-v2: Skeleton loader regression fix — removed `display: grid !important` from all 3 `.insights-grid` breakpoint blocks in mobile-fixes.css. JS can now override display to hide skeleton/show real cards. grid-template-columns !important retained for layout. | Feb 20 | ✅ Done |
| 42 | SPEC-SITE-RECOVERY-v1: CSS href corruption fix — push-bust.ps1 regex bug corrupted all 6 CSS hrefs to `href="=SHA"`. Restored bare filenames in index.html, deployed via fixed push-bust.ps1 (robust single-pass regex). Live verified: all 6 CSS files 200 OK, hrefs read `filename.css?v=32129f3`. | Feb 20 | ✅ Done |
| 43 | SPEC-MOBILE-FIX-v3: (1) Maintenance banner (amber, fixed top, dismissable, z-index 9999, header/body offset inline style). (2) hideVoteBar fix — hides only .footer-votes + .footer-divider, not entire .card-footer-a (share buttons remain visible when API unreachable). (3) mobile-fixes.css: hero stack column ≤767px, card-footer-a display:flex always on mobile, 34px tappable share/vote btns. Live verified: all checks pass. | Feb 20 | ✅ Done |
| 44 | SPEC-VOTES-CLOUDFLARE-WORKER: Cloudflare Worker + D1 votes API. Worker: smartpmo-votes (ggpera account). DB: smartpmo-votes-db (bcfdf75e). URL: https://smartpmo-votes.ggpera.workers.dev. 23 votes migrated from local SQLite. API_BASE in index.html updated from localhost:3334. /health ✅ healthy, /votes/68054 ✅ upvotes:2. Votes now work globally on desktop + mobile. Local VotesAPI retired. | Feb 20 | ✅ Done |
| 45 | SPEC-CARD-PUB-DATE: Published date in card footer centre (Option A). `formatCardDate()` (compact "25 Feb 26"). Footer: votes \| date \| share. `.footer-date` flex:1 centred. Fixed: removed `margin-left:auto` from `.footer-share` in styles-v2.css + mobile-fixes.css (conflicted with flex:1 date, was hiding share buttons). | Feb 21 | ✅ Done |
| 46 | FIX-SPEC-CARD-FOOTER-SHARE-BUTTONS: Footer left/right group layout — `.footer-left` (votes + divider + date) + `.footer-right` (5 share icons). `justify-content: space-between` on `.card-footer-a`. No `margin-left:auto`. `overflow:visible`. `hideVoteBar` updated to hide `.footer-left` (fallback to old selectors for curated cards). mobile-fixes.css: removed conflicting mobile overrides, added spec CSS block. | Feb 21 | ✅ Done |
| 47 | FIX-SPEC-CARD-FOOTER-OVERFLOW: footer-left flexible (`flex:1 1 auto`, `min-width:0`), footer-right rigid (`flex-shrink:0`). Compact button sizes (26px desktop/32px mobile). **Renamed `share-btn` → `shr-icon`** across index.html, styles-v2.css, mobile-fixes.css — class was being hidden by ad blocker filter lists (`EasyList`). Share buttons now visible on all breakpoints. | Feb 21 | ✅ Done |
| 48 | B-05: Assessment page + Hero Layout B. **New files:** `assessment/index.html`, `section-assessment-page.css`, `js/section-assessment-page.js` — 15-question IIFE assessment (3 sections, 2-axis scoring, 4 quadrants, maturity levels, copy/email results). **Hero redesign:** Layout B 3-band stacked (headline → copy+quadrant grid → newsletter+report). Removed: old 3-question modal, bottom sheet, result popup, email modal, assessment-flow.css/js, separate newsletter section. `hero-assessment.js` reduced to tooltip-only. Nav: "Take Assessment" → `/assessment` link. push-bust.ps1 updated. | Feb 21 | ✅ Done |
| 49 | Hero desktop visual polish — CSS-only. Tightened Band 1→2 gap (~150px → ~40px), dual radial glow background (cyan/purple), quadrant grid ambient box-shadow, headline 3.25→3.5rem + weight 900 + text-shadow glow, dot-grid texture overlay (::before), staggered CSS fade-up animation (3 bands 0s/0.15s/0.3s), CTA button cyan glow + hover intensify, visual-wrapper padding 40→20px, Band 3 padding 3→2rem. Mobile: dot grid lighter (opacity 0.5, 24px), text-shadow removed on headline. | Feb 21 | ✅ Done |
| 50 | Hero desktop polish (4 fixes) — (1) Band-1 max-width 900→1200px for visual centering. (2) Band-1 top padding 2.5→1rem. (3) Quadrant tooltips: overflow:visible on .hero-quad + .hero-quadrant-grid, tooltip repositioned as floating card (320px wide, quadrant-specific anchoring, bold coloured title). (4) "Assessment" nav link added to desktop + mobile menus. | Feb 21 | ✅ Done |
| 51 | Hero desktop layout restructure + tooltip fix — DESKTOP ONLY (min-width:769px). (1) Band-1 left-aligned (text-align:left, max-width:1400px, padding matched to Band-2) creating unified two-column layout. (2) Headline 3.5→2.75rem, subheadline 1.25→1.1rem. (3) Band-2 top padding removed, gap 3→2rem. (4) Quadrant grid 400→360px. (5) Replaced per-cell tooltips with single grid-level tooltip (#heroGridTooltip) — centered overlay on grid, 340px wide, border color + title color per quadrant via data-quad attribute. Old .hero-tooltip divs removed from HTML. hero-assessment.js v5.0. Mobile accordion untouched. | Feb 21 | ✅ Done |
| 52 | Hero desktop final layout fix — DESKTOP ONLY. (1) Moved .hero-subheadline from Band 1 into Band 2 copy (first child) — fixes centred subheadline. (2) Band 2 align-items:center→start — grid top-aligns with text. (3) .hero-headline margin-bottom:0 — eliminates Band 1→2 gap. (4) Explicit .hero-subheadline text-align:left + margin-bottom:1rem in desktop override. (5) Removed redundant "Assessment" nav link from desktop + mobile menus (CTA button sufficient). Mobile untouched. | Feb 21 | ✅ Done |
| 53 | Hero headline into Band 2 — DESKTOP ONLY. Moved `<h1>` from Band 1 into `.hero-band-2-copy` as first child. Deleted Band 1 div. All hero content now in single two-column Band 2. Desktop override: padding 1rem 4rem 2rem, align-items:start (grid top-aligns with headline). headline font-size 2.75rem, margin-bottom 0.5rem. Mobile unaffected — Band 2 stacks to 1fr with text-align:center on .hero-band-2-copy. | Feb 21 | ✅ Done |
| 54 | B-01: About page — `website/about/index.html` (self-contained, inline `<style>`). 8 sections: title, problem (stat callout with sources), who built this, what you get (cyan bullet list), how it works, 3 category cards, why share, CTA block (dual buttons) + back link. Inter font throughout (headings + body), 760px max-width. About nav link added to `assessment/index.html` (desktop + mobile). `index.html` already had correct `/about` link. JSON-LD AboutPage schema. Post-deploy tweaks: removed pipeline chip flow graphic, removed career path chip flow, removed proprietary sentence, switched headings from Spectral to Inter, removed Spectral font import. Deployed via push-bust.ps1. | Feb 22 | ✅ Done |
| 55 | B-02: Weekly Newsletter — `Automation/newsletter/send-weekly-newsletter.js`. Queries top 20 articles (7-day lookback, category-priority: PMO_RELATED > PMO_POTENTIAL > AI_GENERAL, quality_score DESC). Builds email-safe HTML (table layout, 600px max, dark theme #0a0e1a, inline styles, Outlook conditionals). Cards: category badge (green/amber/blue) + read time + price + title link + TLDR bullets + date. CTAs: Visit SmartPMO.ai + Take Assessment. Footer: unsubscribe via `{{UnsubscribeURL}}`. Sends via EmailOctopus v1.6 API (POST /campaigns + /campaigns/{id}/send). Subscriber count check: warn 2000+, block 2450+. `--dry-run` flag saves HTML preview to `Automation/newsletter/output/`. Logs to `weekly_newsletters` DB table. `run-newsletter.bat` for Task Scheduler (Fridays 07:45 SAST). Quarterly report signup: replaced broken button+input with EmailOctopus embedded form (form ID placeholder — create in dashboard). Legacy `05-newsletter-engine/` archived to `_archive/05-newsletter-engine-legacy/`. Dry-run tested: 20 articles (1 PMO_RELATED + 3 PMO_POTENTIAL + 16 AI_GENERAL), 3 subscribers, 49.9 KB HTML. | Feb 23 | ✅ Done |
| 56 | B-25: Text scoring output — prompts v1.2 (classification + quality) replace JSON output with text markers (CATEGORY:/SCORE:/REASONING:). ScoringEngine.js: `parseClassification()` + `parseQualityScore()` with 3-strategy fallback (text → JSON → bare keyword). `max_tokens` 200→500. `parseJSON()` retained as fallback. **Result:** 33/33 scored (100% success vs 14% on Run 177). | Feb 24 | ✅ Done |
| 57 | B-24: OpenRouter provider — Added as priority 4 scoring fallback (between fireworks and openai). `case 'openrouter':` in AIProviderAdapter.js (OpenAI-compatible, baseURL `openrouter.ai/api/v1`). DB: `ai_providers` row id=8, model `meta-llama/llama-3.3-70b-instruct:free`, 50/day free. Groq disabled (SA geo-block). `.env`: `OPENROUTER_API_KEY` added. API key verified valid (`/auth/key` → `is_free_tier:true`). Free model under upstream load at time of testing (429s) — transient, cascade handles it. | Feb 24 | ✅ Done |
| 58 | B-16: Console consolidation — Absorbed port 3333 (pipeline runner) into port 8080 (management console). Added WebSocket + pipeline endpoints (`/api/pipeline/*`) to `01-Management-Console/public/server.js`. New `pipeline-runner-tab.js` module (ES module, fire theme, 7 stages incl. deploy). `console.html`: Pipeline Runner as first/default tab. `ws` npm dependency added. Old console renamed to `Automation/console-RETIRED/`. **Scheduler auto-console:** `run-daily-pipeline.js` `--trigger=scheduler` now spawns console server, opens browser, triggers pipeline via API (live WebSocket progress). Falls back to direct run if console fails. No Task Scheduler changes needed. Tested: server auto-start, API status 200, port detection. | Feb 24 | ✅ Done |
| 59 | B-27: Blog Source Expansion — 55 new RSS sources added (validated from 69 proposed, 14 failed: 7× 404 + 7× non-XML). Config: `Automation/config/new-feeds-b27.json`. Validator: `Automation/scripts/validate-new-feeds.js`. SQL: `Automation/scripts/insert-b27-feeds.sql`. Tiers: T1=13, T2=31, T4=11. Categories: A=11, B=44. `added_by='spec-b27'`. Smoke test: 14 articles from 11 new sources on first discovery run. Rollback: `UPDATE source_registry SET enabled=0 WHERE added_by='spec-b27'` | Feb 24 | ✅ Done |

---

## KNOWN BUGS / NON-FATAL ERRORS

| Issue | File | Impact |
|-------|------|--------|
| `newsletter_card` column missing | StatsGenerator.js | Non-fatal error in Step 6.5 — stats still generate |
| `step4_articles_enriched` column missing | MetricsCollector / daily_runs | Non-fatal error in Step 8 — metrics still save |
| Enrichment JSON parse failures (~2-3/14) | ContentEnricher / Gemini | Intermittent — Gemini returns markdown wrapper. Non-fatal, article skipped |
| Health check "No pipeline run today" | HealthCheck.js | Reads daily_runs table (stale schema). Run 171 not reflected correctly |
| Scoring: only 1 PMO_RELATED in 100 | ScoringEngine | Low PMO catch rate — diagnosed (see below). Monitor next 3-5 runs |
| Gemini free tier: 20 calls/day limit | AIProviderAdapter / gemini | Enrichment hits 429 after ~20 calls. Falls back to openai ($0.0003/article). Non-fatal. |

---

## PIPELINE INFRASTRUCTURE

### Runners

| File | Purpose | When to use |
|------|---------|-------------|
| `Automation/run-daily-pipeline.js` | Production runner (B-16: `--trigger=scheduler` auto-starts console + browser) | Direct runs, scheduler, `--lookback=N` for recovery |
| `Automation/run-pipeline.js` | Consolidated runner (test mode, run registry) | Scheduler (via run-daily.bat) |
| `Automation/run-manual-console.js` | Manual console-triggered run | When console server is running |

### Batch files
- `run-daily.bat` → calls `node run-pipeline.js --trigger=scheduler` (with VPN disconnect/reconnect)
- `run-daily-NO-VPN.bat` → calls `node run-pipeline.js --trigger=scheduler >> daily-run.log 2>&1`

### Key skip flags
```
node run-daily-pipeline.js --skip-discovery --skip-prefilter --skip-scoring
node run-daily-pipeline.js --lookback=72   # 72h recovery
node run-pipeline.js --test --skip-discovery  # test mode (shadow DB, no deploy)
```

### Scheduler
- **Task:** Windows Task Scheduler (`PMO-Discovery-Main`), daily 4:00 AM SAST
- **Calls:** `cmd.exe /c cd /d Automation && node run-daily-pipeline.js --trigger=scheduler >> pipeline-output.log 2>&1`
- **B-16 auto-console:** `--trigger=scheduler` now starts console server (port 8080), opens browser, triggers pipeline via API for live WebSocket progress. Falls back to direct run if console fails to start.

---

## OPTION B: TWO-PASS SCORING

| | Before | After (Option B) |
|---|---------|----------|
| Scoring | 1 pass: score (0-100) = category proxy | 2 passes: classification + quality |
| Category | Derived from score ranges | Direct AI classification |
| Quality | None (score IS category) | Independent 0-100 per category |
| Fetch gate | `pmo_score >= 70` (blocks AI_GENERAL) | Per-category quality threshold (>=50) |
| Display | Tiered thresholds on pmo_score | Category-priority FIFO with quality floor |

---

## PROMPT VERSION HISTORY

| Type | Version | ID | Status | Key Change |
|------|---------|-----|--------|------------|
| classification | v1.0 | 11 | ❌ Deactivated | Portfolio false positives, BOTH rule ignored |
| classification | v1.1 | 13 | ❌ Deactivated | Portfolio disambiguation, audience-aware AI_GENERAL |
| classification | v1.2 | 16 | ✅ Active | Text output format (CATEGORY:/REASONING:) — fixes reasoning model JSON failures |
| quality | v1.0 | 12 | ❌ Deactivated | Scores cluster 70-80, no short article penalty |
| quality | v1.1 | 14 | ❌ Deactivated | Distribution targets, point-based scoring, URL signals |
| quality | v1.2 | 17 | ✅ Active | Text output format (SCORE:/REASONING:) — fixes reasoning model JSON failures |
| enrichment | v1.2 | 7 | ❌ Deactivated | Fabricates PMO connections in TLDRs |
| enrichment | v1.3 | 15 | ✅ Active | TLDRs reflect what article ACTUALLY says |

---

## KEY FILES

| File | Purpose |
|------|---------|
| `Automation/run-daily-pipeline.js` | Main pipeline runner (production) |
| `Automation/run-pipeline.js` | Consolidated runner with test mode + run registry |
| `Automation/lib/EventReporter.js` | Dual-logging event system |
| `Automation/modules/ArticleDisplayManager.js` | FIFO display with category cap (Phase 1.5 cap fix applied) |
| `Automation/modules/ScoringEngine.js` | Two-pass scoring (classification + quality) |
| `Automation/modules/RobustRSSParser.js` | RSS parser with 20s hard cap per feed |
| `Automation/modules/ContentFetcher.js` | Category quotas + quality threshold fetch |
| `Automation/modules/ContentEnricher.js` | Gemini enrichment + keyword validation |
| `Automation/modules/AIProviderAdapter.js` | Multi-provider (cerebras, fireworks, openrouter, groq, cohere, gemini, openai) |
| `01-Management-Console/public/server.js` | Unified management console (port 8080) + WebSocket + pipeline endpoints |
| `01-Management-Console/public/console-modules/pipeline-runner-tab.js` | Pipeline Runner tab (B-16: replaces port 3333 console) |
| `Automation/Advanced-Pre-Filter/prefilter_titles.py` | Semantic prefilter (AI gate 0.25, job posting filter) |
| `Automation/config/display-thresholds.js` | Shared config (thresholds, quotas, slots) |
| `Automation/config/new-feeds-b27.json` | B-27: 69 blog source definitions (name, URL, tier, category) |
| `Automation/scripts/validate-new-feeds.js` | B-27: RSS feed validator (HTTP check, XML parse, SQL generation) |
| `Automation/scripts/insert-b27-feeds.sql` | B-27: 55 validated INSERT statements (rollback in header) |
| `Automation/fix-list-2026-02-19.sql` | SQL to disable 18+ dead sources — REVIEW BEFORE RUNNING |
| `02-discovery-engine/pmo_insights.db` | SQLite database (main) |
| `STATUS.md` | This file |

---

## DEFERRED WORK

| Item | Spec | Priority |
|------|------|----------|
| ~~Fix 47: Card footer overflow — share buttons invisible~~ | ✅ DONE — Fix 47 deployed, `share-btn` → `shr-icon` | — |
| ~~Hero Redesign: Layout B stacked narrative~~ | ✅ DONE — Fix 48-53 | — |
| ~~Assessment scoring + quadrant write-ups~~ | ✅ DONE — Fix 48 | — |
| ~~Assessment page (/assessment)~~ | ✅ DONE — Fix 48 | — |
| ~~B-01: About page (/about)~~ | ✅ DONE — Fix 54 deployed | — |
| ~~Console server HTTP endpoints~~ | ✅ DONE — B-16 consolidated into port 8080 | — |
| PM2 ecosystem config fixes (§10) | SPEC-PIPELINE-CONSOLIDATION.md | Low |
| Rename old runners to .deprecated.js (§12) | SPEC-PIPELINE-CONSOLIDATION.md | Low |
| ~~Console dashboard panels~~ | ✅ DONE — B-16 Pipeline Runner tab in management console | — |
| Metrics fix (§4) | SPEC-CONSOLE-UPGRADE-RECOVERY.md | Low |
| ~~Monitor gpt-oss-120b classification quality~~ | ✅ DONE — B-25 run 33/33 success, text markers fix parsing | — |
| ~~Monitor PMO catch rate — if <3/100 over 5 runs, add PMO+AI sources~~ | ✅ DONE — B-27 added 55 new sources (11 Cat-A intersection) | — |
| Watch Section B feeds (Morning Brew, Project Smart) — 3 more runs before disabling | fix-list-2026-02-19.sql | Low |
| B-04 Phase 2: inject vote counts into daily-cards.json at pipeline time | SPEC-B04-VOTING-BUTTONS.md §2 | Low |
| ~~B-04: Deploy VotesAPI publicly~~ | ✅ DONE — Cloudflare Worker live, API_BASE updated | — |
| Fix StatsGenerator `newsletter_card` column error | StatsGenerator.js | Low |
| Fix MetricsCollector `step4_articles_enriched` error | daily_runs schema | Low |
| Fix HealthCheck "No pipeline run today" (stale daily_runs schema) | HealthCheck.js | Low |

---

## LAST UPDATED

**Date:** 2026-02-24 SAST
**By:** Chat + Code
**Actions this session:**

1. ✅ **B-27: Blog Source Expansion** — Added 55 new RSS blog sources from "AI × PMO blog discovery 166" research report. Created `Automation/config/new-feeds-b27.json` (69 entries), `Automation/scripts/validate-new-feeds.js` (RSS validator with 15s timeout, redirect following, XML/Atom detection), `Automation/scripts/insert-b27-feeds.sql` (55 validated INSERTs), `Automation/scripts/run-insert-b27.js` (DB inserter with verification). Validation: 55 PASS, 14 FAIL (7× HTTP 404: Project Flux, Every.to, Workday, Filestage, AuditBoard, FutureTools, The AI Opportunity; 7× non-XML: Digital.ai, tl;dv, IDC, Google Workspace, ABBYY, Bizzdesign, The BA Guide), 0 TIMEOUT. Tier breakdown: T1=13 (8 Cat-A intersection + 5 Cat-B thought leaders), T2=31 (enterprise AI, SaaS tools, Substacks), T4=11 (niche Substacks). All tagged `added_by='spec-b27'`. Zero URL duplicates. Total enabled: 362 RSS / 434 all types (was 307 / 379). Smoke test: 14 articles from 11 new sources discovered on first run. Operations log entry added. Rollback: `UPDATE source_registry SET enabled=0 WHERE added_by='spec-b27'`.

**Previous session (Feb 24):**

1. ✅ **B-12: Discovery schedule audit** — Verified: Task Scheduler fires daily at 6:00 AM SAST via `node run-daily-pipeline.js`. 5 consecutive runs confirmed (Feb 20–24). Feb 24: 200 discovered, 193 scored. **Issue found:** Scheduler calls `node run-daily-pipeline.js` directly (no bat file), so `pipeline-output.log` has been empty since Feb 15 — no log capture. **Fix:** Change Task Scheduler action to `cmd.exe /c cd /d D:\PMO-Brain-2.0-Modular\Automation && node run-daily-pipeline.js --trigger=scheduler >> pipeline-output.log 2>&1`.

2. ✅ **B-16: Console consolidation — IMPLEMENTED** — Absorbed port 3333 pipeline runner into port 8080 management console. Changes: (a) `01-Management-Console/public/server.js`: added `http`/`ws`/`fs`/`spawn` imports, WebSocket server (`wss`), pipeline endpoints (`/api/pipeline/status`, `/api/pipeline/run`, `/api/pipeline/stop`, `/api/pipeline/cards`), replaced `app.listen()` with `server.listen()`, graceful shutdown kills child pipeline. (b) NEW `pipeline-runner-tab.js`: ES module with fire-theme scoped CSS, 7 pipeline stages (discovery→prefilter→scoring→fetch→display→cards→deploy), WebSocket auto-reconnect (3s), Run/Stop buttons, live log stream (3000 max), errors/warnings section with copy-all, generated cards preview, full run log copy-to-clipboard. (c) `console.html`: Pipeline Runner as first tab (default), keyboard shortcut Ctrl+1, module loader updated. (d) `ws` npm package installed in `01-Management-Console`. (e) `Automation/console/` renamed to `Automation/console-RETIRED/`. (f) **Scheduler auto-console:** Added `runViaConsole()` to `run-daily-pipeline.js` — when `--trigger=scheduler`, spawns console server (detached), waits for port 8080, opens browser, triggers pipeline via POST `/api/pipeline/run`, polls `/api/pipeline/status` until done (30min max). Falls back to direct `runDailyPipeline()` if console fails. No Task Scheduler changes needed — existing task calls same command. (g) Updated `launchers/launch-console.bat` + `run-daily.bat` + `run-daily-NO-VPN.bat` to use port 8080. **Tested:** server auto-starts from spawn, API returns 200 with valid JSON, port detection works.

3. ✅ **B-24: OpenRouter provider** — Implemented SPEC-B24-OPENROUTER-PROVIDER.md. Added `OPENROUTER_API_KEY` to `.env`. Inserted `openrouter` row in `ai_providers` (id=8, priority 4, model `meta-llama/llama-3.3-70b-instruct:free`, 50/day free). Bumped cohere→5, openai→6. Added `case 'openrouter':` to `AIProviderAdapter.js` (`initializeClient` + `complete` switch). OpenAI-compatible client with `baseURL: openrouter.ai/api/v1`. API key verified valid via `/auth/key` (`is_free_tier:true`, `usage:0`). Free model under transient upstream 429s at time of testing — pipeline cascade handles gracefully. Groq remains disabled (SA geo-block). **New cascade:** cerebras(1) → fireworks(3) → openrouter(4) → openai(6).

4. ✅ **B-25: Text Scoring Output** — Replaced JSON output format with text markers in scoring prompts. Classification prompt v1.2 (id=16): `CATEGORY:` + `REASONING:` markers. Quality prompt v1.2 (id=17): `SCORE:` + `REASONING:` markers. v1.1 prompts (id=13, 14) deactivated. ScoringEngine.js: added `parseClassification()` and `parseQualityScore()` with 3-strategy fallback chain (text markers → JSON → bare keyword). `parseJSON()` retained as fallback, marked deprecated as primary parser. `max_tokens` bumped 200→500 for both passes (reasoning models need space for chain-of-thought before answer). **Verified:** Scoring-only run — 33/33 articles scored (100% success), 0 parse failures. Deployed to smartpmo.ai via git push.

**Previous session (Feb 23):**

1. ✅ **B-02: Weekly Newsletter** — Built `Automation/newsletter/send-weekly-newsletter.js`.

**Previous session (Feb 22):**

1. ✅ **B-01: About page** — Created `website/about/index.html`. 8 sections, Inter font, 760px max-width. JSON-LD AboutPage schema. About nav link on all pages.

**Previous session (Feb 21):**

1. ✅ **Fix 53: Hero headline into Band 2** — DESKTOP ONLY. Moved `<h1>` from Band 1 into `.hero-band-2-copy` as first child. Deleted Band 1 div entirely. All hero content now in single two-column Band 2 container. Desktop override: `padding: 1rem 4rem 2rem`, `align-items: start` (grid top-aligns with headline). Headline `font-size: 2.75rem`, `margin-bottom: 0.5rem`. Mobile unaffected — Band 2 stacks to 1fr with `text-align: center`. Deployed via push-bust.ps1.

2. ✅ **Fix 47: FIX-SPEC-CARD-FOOTER-OVERFLOW** — (a) CSS: footer-left flexible (`flex:1 1 auto, min-width:0`), footer-right rigid (`flex-shrink:0`). Compact button sizes (26px desktop / 32px mobile). Gap reduced (2px share, 6px footer). (b) **Root cause discovery:** `share-btn` class was globally hidden by ad blocker filter lists (EasyList). Renamed to `shr-icon` across all 3 production files (index.html, styles-v2.css, mobile-fixes.css). (c) **Verified live:** Desktop 3-col, mobile 1-col, tablet 2-col — all 5 share icons visible, votes + date on left, no overflow, no clipping. Zero new console errors.

2. ✅ **Fix 46: FIX-SPEC-CARD-FOOTER-SHARE-BUTTONS** — Footer left/right group layout. `.footer-left` (votes + divider + date) + `.footer-right` (all 5 share icons). `justify-content: space-between` on `.card-footer-a !important`, `overflow: visible !important`. No `margin-left: auto`. `hideVoteBar` updated to target `.footer-left` (hides votes + date, keeps share visible; falls back to old selectors for curated cards). mobile-fixes.css: replaced conflicting mobile overrides with spec-compliant block. Deployed via push-bust.ps1.

2. ✅ **Fix 38: SPEC-CARD-LAYOUT-OPTION-A** — Badge row inline (category + read-time + dynamic badge), unified card-footer-a (votes left, divider, share icons right), removed keyword tags + date rows + separate vote/share rows, plain TLDR bullets (no bold first item). VotesModule selectors migrated .vote-bar → .card-footer-a throughout (getVoteBars, hideVoteBar, attachDelegation, MutationObserver).
2. ✅ **Fix 39: B-03 Gold-standard SEO** — Optimised title, meta description, robots (max-snippet/-image/-video), canonical, full OG tags (10) with image dimensions, Twitter/X Card (7 tags), Mobile/PWA meta (5), favicon chain (PNG + apple-touch + manifest). 3× JSON-LD: Organization (Knowledge Panel), WebSite, CollectionPage. New files: sitemap.xml (daily, lastmod 2026-02-20), robots.txt (GPTBot/ClaudeBot/PerplexityBot/Google-Extended all allowed), site.webmanifest (standalone PWA, cyan theme). No JS or pipeline files touched.
3. ✅ **Fix 40: SPEC-MOBILE-FIX-v1** — Created `mobile-fixes.css` (loaded last, all `!important`): 1-col grid ≤639px / 2-col 640-1023px / 3-col ≥1024px; hero y/x-axis labels hidden ≤768px; quadrant grid `min()` sizing; section title `flex-wrap`; card `overflow-wrap: anywhere`; footer wrap ≤400px; html/body `overflow-x: hidden`. Cache busted all 6 CSS files (`?v=2`). Updated `push-bust.ps1` to bust all CSS refs (was only busting styles-v2.css).
7. ✅ **Fix 44: SPEC-VOTES-CLOUDFLARE-WORKER** — Cloudflare Worker + D1 votes API fully deployed. Worker `smartpmo-votes` on Cloudflare edge (ggpera account). D1 database `smartpmo-votes-db` (ID: bcfdf75e). Worker URL: `https://smartpmo-votes.ggpera.workers.dev`. 23 existing votes migrated from local SQLite. `API_BASE` in index.html updated from `localhost:3334` → Worker URL. **Live verified:** `/health` → `{"status":"healthy","db":"connected"}` ✅ · `/votes/68054` → `{"upvotes":2,"downvotes":0}` ✅. Votes now work globally on desktop + mobile. Local `start-votes-api.bat` retired.

6. ✅ **Fix 43: SPEC-MOBILE-FIX-v3** — (1) Amber maintenance banner: fixed top, z-index 9999, dismissable ×, header pushed down 38px desktop / 52px mobile, body padding-top adjusted. (2) `hideVoteBar` now hides only `.footer-votes` + `.footer-divider` — share buttons remain visible when VotesAPI unreachable. (3) `mobile-fixes.css`: hero `flex-direction: column` ≤767px (copy above quadrant), `.card-footer-a` always `display:flex` on mobile, 34px min tappable targets for share/vote buttons. **Live verified:** all 6 CSS 200 OK (`?v=5168e21`), maintenance-banner + updated hideVoteBar + hero-copy + card-footer-a all confirmed in live HTML/CSS.

5. ✅ **Fix 42: SPEC-SITE-RECOVERY-v1** — CSS href corruption: push-bust.ps1 regex was matching `href="[^"]*FILENAME[^"]*"` but the `?v=` append produced `=SHA` instead of `filename.css?v=SHA`. Restored bare hrefs in index.html, redeployed via corrected push-bust.ps1. **Live verified:** all 6 CSS 200 OK, hrefs `filename.css?v=32129f3`, cards rendering, mobile-fixes.css has correct grid-template-columns rules.

4. ✅ **Fix 41: SPEC-MOBILE-FIX-v2** — Skeleton loader regression: `display: grid !important` in mobile-fixes.css was blocking JS from hiding skeleton cards. Removed `display` from all 3 `.insights-grid` breakpoint blocks — JS `element.style.display` can now override again. `grid-template-columns !important` retained. Deployed via push-bust.ps1 (cache-busted).

**Previous sessions (Feb 19):**
- Run 171 recovery (72h lookback), RobustRSSParser 20s cap, source cleanup (42 feeds), Cerebras model fix, gpt-oss-120b AIProviderAdapter patch, B-04 voting buttons

**Previous session (Feb 15):**
- Pipeline consolidation (run-pipeline.js + EventReporter + DB tables), deploy step, job posting filter

---

**Both Chat and Code read this file first. Keep it current.**
