# SPEC-B27-BLOG-SOURCE-EXPANSION.md

**Created:** 2026-02-24
**Status:** READY FOR CODE
**Backlog:** B-27 (new)
**Contracts:** PMO-ENGINE-DESIGN-CONTRACT.md §4 (Fallback), §7 (Configuration), §9 (Dependencies)

---

## 1. Objective

Add 69 new RSS blog sources to the discovery pipeline from the "AI × PMO blog discovery 166" research report. These are blogs with **confirmed RSS feeds** that produce content at the AI+PMO intersection (Category A) or AI content applicable to PMO professionals (Category B / PMO_POTENTIAL).

**Non-goals:** This spec does NOT modify any existing sources, pipeline logic, scoring, prefiltering, or display. It only INSERTs new rows into `source_registry`.

---

## 2. Impact Assessment

| Aspect | Current | After | Risk |
|--------|---------|-------|------|
| RSS sources (enabled) | 307 | 376 | LOW — 22% increase |
| Discovery time | ~22 min | ~25-28 min (est.) | LOW — 20s cap per feed, runs once daily at 4 AM |
| Prefilter load | ~100/run | ~120-140/run (est.) | LOW — prefilter handles variable input |
| Scoring load | ~80/run | ~90-110/run (est.) | LOW — within cerebras 2000/day limit |
| Existing sources | Unchanged | Unchanged | NONE — INSERT only, no UPDATE |

---

## 3. Tier Assignment Logic

Based on existing tier structure:
- **Tier 1** (104 sources): Core PMO + top AI thought leaders
- **Tier 2** (130 sources): Secondary/supporting AI and PMO
- **Tier 4** (28 sources): PMO community + broader tech

New source tiers assigned by:
- **Tier 1**: Category A direct intersection blogs (rarest, highest value) + top Category B thought leaders with strong PMO inference
- **Tier 2**: Category B enterprise AI, productivity tools, meeting tools, Substacks, adjacent discipline platforms
- **Tier 4**: Category B niche/lower frequency sources

---

## 4. Source List — 69 Blogs with Confirmed RSS

### 4.1 TIER 1 — Direct Intersection + Top Thought Leaders (15 sources)

| # | source_name | source_url | category | notes |
|---|------------|------------|----------|-------|
| 1 | Project Flux (James Garner) | https://projectflux.beehiiv.com/feed | A | Chair of Project Data Analytics Taskforce — AI + project controls |
| 2 | Data Science PM | https://www.datascience-pm.com/feed/ | A | Managing data science projects — bridging AI, Agile, PM |
| 3 | Epicflow Blog | https://www.epicflow.com/feed/ | A | AI-driven multi-project resource management, predictive analytics |
| 4 | Thoughtworks Insights | https://www.thoughtworks.com/rss/insights.xml | A | Global consultancy — AI-powered software delivery, agentic AI |
| 5 | Hive Blog | https://hive.com/blog/feed/ | A | PM tool with AI assistant — AI impact on PM and task automation |
| 6 | Cprime Blog | https://www.cprime.com/feed/ | A | Enterprise agility — AI transformation, strategic portfolio mgmt |
| 7 | ITSM.tools | https://itsm.tools/feed/ | A | Independent ITSM analyst — AI in IT service management |
| 8 | Emergent Journal | https://blog.emergentconsultants.com/feed/ | A | AI in change management with practical ROI data |
| 9 | Decision Intelligence (Cassie Kozyrkov) | https://decision.substack.com/feed | B | Former Google Chief Decision Scientist — AI-assisted judgment |
| 10 | Marily's AI Product Academy | https://marily.substack.com/feed | B | #1 AI PM resource — AI product management guides |
| 11 | Almost Timely News (Christopher Penn) | https://almosttimely.substack.com/feed | B | 5P Framework for AI transformation — Purpose, People, Process |
| 12 | Dion Hinchcliffe | https://dionhinchcliffe.com/feed/ | B | VP Constellation Research — enterprise digital transformation |
| 13 | Every.to | https://every.to/feed | B | Deep AI productivity workflows — how AI changes knowledge work |
| 14 | Exponential View (Azeem Azhar) | https://www.exponentialview.co/feed | B | 84K+ subscribers — how AI reshapes business and work |
| 15 | Enterprise AI Governance (Oliver Patel) | https://oliverpatel.substack.com/feed | B | AI governance frameworks mapping to PMO governance |

### 4.2 TIER 2 — Strong PMO_POTENTIAL (42 sources)

**Agile/Delivery consultancies:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 16 | Digital.ai Catalyst Blog | https://digital.ai/feed/ | A |
| 17 | AgileSparks Blog | https://agilesparks.com/feed/ | A |
| 18 | Eficode Blog | https://www.eficode.com/blog/rss.xml | A |
| 19 | Hups Blog (Henrik Kniberg) | https://hups.com/blog/rss.xml | A |
| 20 | iSixSigma | https://www.isixsigma.com/feed/ | A |

**AI meeting/collaboration tools:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 21 | tl;dv Blog | https://tldv.io/blog/feed/ | B |
| 22 | Krisp Blog | https://krisp.ai/blog/feed/ | B |

**Enterprise AI strategy:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 23 | Constellation Research Blog | https://www.constellationr.com/rss.xml | B |
| 24 | IDC Blog | https://blogs.idc.com/feed/ | B |
| 25 | AWS Enterprise Strategy | https://aws.amazon.com/blogs/enterprise-strategy/feed/ | B |
| 26 | Workday Blog | https://blog.workday.com/feed | B |
| 27 | Whatfix Blog | https://whatfix.com/blog/feed/ | B |
| 28 | Marketing AI Institute | https://www.marketingaiinstitute.com/blog/rss.xml | B |

**SaaS work management / reporting:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 29 | Toggl Blog | https://toggl.com/blog/feed | B |
| 30 | Everhour Blog | https://everhour.com/blog/feed/ | B |
| 31 | Google Workspace Blog | https://workspace.google.com/blog/feed | B |
| 32 | Document360 Blog | https://document360.com/blog/feed/ | B |
| 33 | Taskade Blog | https://www.taskade.com/blog/feed/ | B |
| 34 | Filestage Blog | https://filestage.io/blog/feed/ | B |
| 35 | Superhuman Email Blog | https://blog.superhuman.com/rss/ | B |

**Adjacent disciplines (BPM, EA, GRC, BA):**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 36 | Pipefy Blog | https://www.pipefy.com/blog/feed/ | B |
| 37 | FlowForma Blog | https://www.flowforma.com/blog/rss.xml | B |
| 38 | ABBYY Blog | https://www.abbyy.com/blog/feed/ | B |
| 39 | Ardoq Blog | https://www.ardoq.com/blog/rss.xml | B |
| 40 | Bizzdesign Blog | https://bizzdesign.com/blog/feed/ | B |
| 41 | BMC Blogs | https://www.bmc.com/blogs/feed | B |
| 42 | The BA Guide | https://thebaguide.com/feed/ | B |
| 43 | AuditBoard Blog | https://auditboard.com/blog/rss.xml | B |
| 44 | USC Consulting Group | https://usccg.com/feed/ | B |

**AI productivity / no-code tools:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 45 | FutureTools Weekly | https://www.futuretools.io/feed | B |
| 46 | AI Tools Business | https://aitoolsbusiness.com/feed/ | B |
| 47 | NoCoders | https://nocoders.substack.com/feed | B |

**Substacks — enterprise AI / future of work:**

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 48 | GAI Insights (Paul Baier) | https://gaiinsights.substack.com/feed | B |
| 49 | AI Realized Now | https://airealizednow.substack.com/feed | B |
| 50 | Enterprise AI Trends (John Hwang) | https://nextword.substack.com/feed | B |
| 51 | AI in Business (John Desmond) | https://aiinbusiness.substack.com/feed | B |
| 52 | Work3 Future of Work | https://wrk3.substack.com/feed | B |
| 53 | FullStack HR | https://www.fullstackhr.io/feed | B |
| 54 | AI Adopters Club | https://aiadopters.club/feed | B |
| 55 | Platforms AI BigTech (Sangeet Choudary) | https://platforms.substack.com/feed | B |
| 56 | Why Try AI (Daniel Nest) | https://whytryai.substack.com/feed | B |
| 57 | Geek Way (Andrew McAfee MIT) | https://geekway.substack.com/feed | B |

### 4.3 TIER 4 — Niche / Lower Frequency (12 sources)

| # | source_name | source_url | category |
|---|------------|------------|----------|
| 58 | The Digital Leader (John Rossman) | https://thedigitalleader.substack.com/feed | B |
| 59 | The AI Leadership Edge | https://theaileadershipedge.substack.com/feed | B |
| 60 | AI Disruption (Meng Li) | https://aidisruption.substack.com/feed | B |
| 61 | The AI Opportunity | https://theaiopportunities.substack.com/feed | B |
| 62 | Organizational AI Weekly | https://organizationalai.substack.com/feed | B |
| 63 | AI Workplace Wellness | https://aiworkplacewellness.substack.com/feed | B |
| 64 | The Maverick Mapmaker (Jurgen Appelo) | https://substack.jurgenappelo.com/feed | B |
| 65 | Honest AI | https://honestai.substack.com/feed | B |
| 66 | The AI Optimist | https://aioptimist.substack.com/feed | B |
| 67 | AI Agents Simplified | https://aiagentssimplified.substack.com/feed | B |
| 68 | Level Up with AI | https://levelupwithai.substack.com/feed | B |
| 69 | Wonder Tools (Jeremy Caplan) | https://wondertools.substack.com/feed | B |

---

## 5. Implementation Steps

### Step 1: RSS Validation Script

Create `Automation/scripts/validate-new-feeds.js` that:
1. Reads each RSS URL from a JSON config file
2. HTTP GET with 15s timeout
3. Checks: HTTP 200, valid XML, contains `<item>` or `<entry>`, has at least 1 entry from last 90 days
4. Outputs report: `PASS` / `FAIL` / `TIMEOUT` per feed
5. Generates SQL INSERT statements ONLY for feeds that PASS

**Why:** Avoids inserting dead URLs on day one. Research report RSS URLs may have changed.

### Step 2: Insert Validated Sources

Run generated SQL against `pmo_insights.db`. Each INSERT follows this template:

```sql
INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority, 
  total_runs, total_articles_found, total_articles_inserted, 
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  '{source_name}', 'rss', {tier}, '{rss_url}', 1, 5,
  0, 0, 0,
  0, 0, 0,
  '{description}', '{A or B}', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);
```

Fields:
- `source_type`: Always `'rss'`
- `enabled`: `1` (only validated feeds get inserted)
- `priority`: `5` (default — same as all existing sources)
- `added_by`: `'spec-b27'` for traceability
- `category`: `'A'` (intersection) or `'B'` (PMO_POTENTIAL)
- All counters initialised to 0

### Step 3: Verification Query

After insert, run:

```sql
-- Count new sources
SELECT COUNT(*) as new_sources FROM source_registry WHERE added_by = 'spec-b27';

-- Confirm no duplicates by URL
SELECT source_url, COUNT(*) as dupes 
FROM source_registry 
WHERE enabled = 1 
GROUP BY source_url 
HAVING COUNT(*) > 1;

-- Confirm total enabled RSS count
SELECT COUNT(*) as total_enabled_rss FROM source_registry WHERE enabled = 1 AND source_type = 'rss';
```

### Step 4: Smoke Test

Run a discovery-only pipeline pass:

```bash
node run-daily-pipeline.js --skip-prefilter --skip-scoring --lookback=24
```

Verify:
- New sources appear in discovery log
- No errors from new feeds crash the pipeline
- RobustRSSParser 20s cap handles any slow new feeds gracefully
- Total discovered article count increases vs previous run

---

## 6. Validation Feed Config File

Create `Automation/config/new-feeds-b27.json` containing all 69 entries:

```json
[
  {
    "source_name": "Project Flux (James Garner)",
    "source_url": "https://projectflux.beehiiv.com/feed",
    "tier": 1,
    "category": "A",
    "description": "AI and data analytics in project delivery and project controls"
  },
  // ... remaining 68 entries
]
```

The validation script reads this file. Code generates the full JSON from the tables in §4.

---

## 7. What This Spec Does NOT Touch

- **No changes** to `RobustRSSParser.js` — existing 20s cap handles new feeds
- **No changes** to `ScoringEngine.js` — new articles score through existing cascade
- **No changes** to `ArticleDisplayManager.js` — display logic unchanged
- **No changes** to `prefilter_titles.py` — prefilter handles variable input
- **No changes** to any existing source_registry rows — INSERT only
- **No changes** to `run-daily-pipeline.js` or batch files
- **No changes** to website, console, or deployment

---

## 8. Rollback

If new sources cause issues:

```sql
-- Disable all B-27 sources
UPDATE source_registry SET enabled = 0 WHERE added_by = 'spec-b27';

-- Or remove entirely
DELETE FROM source_registry WHERE added_by = 'spec-b27';
```

---

## 9. Success Criteria

After 3 pipeline runs with new sources:
1. No pipeline crashes or timeout increases >5 min
2. New sources appear in discovery logs
3. At least 10+ articles from new sources pass prefilter
4. At least 3+ articles from Category A sources score as PMO_RELATED or PMO_POTENTIAL
5. Zero impact on existing source performance
