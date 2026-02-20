# SmartPMO.ai — Product Backlog

**Created:** 2026-02-19
**Last Updated:** 2026-02-20 SAST

---

## Priority Key
- 🔴 **HIGH** — Required for launch or critical to product value
- 🟡 **MEDIUM** — Important but not blocking launch
- 🟢 **LOW** — Nice-to-have, defer post-launch

---

| # | Priority | Feature | Description | Added |
|---|----------|---------|-------------|-------|
| B-01 | 🔴 HIGH | About page | Build About/Mission page from content in `smartpmo-mission.md` and `website content/`. Explains who built this, why, how the AI discovery engine works. Critical for credibility. | 2026-02-19 |
| B-02 | 🔴 HIGH | Newsletter operational | Get weekly digest actually sending via EmailOctopus. Engine code in `05-newsletter-engine/`. Even simple "top 5 cards this week" format. Primary retention mechanism. | 2026-02-19 |
| B-03 | ✅ DONE | SEO basics | Gold-standard SEO implemented: optimised title/description, full OG/Twitter tags with dimensions, Organization + WebSite + CollectionPage JSON-LD, robots.txt with AI crawler allowlist, sitemap.xml with lastmod, webmanifest, favicon chain, performance hints. | 2026-02-19 |
| B-04 | 🔴 HIGH | Voting/usefulness buttons | Readers vote on how useful each article card was (thumbs up/down or 1-5 scale). Captures engagement signal, feeds back into scoring quality improvement. | 2026-02-19 |
| B-05 | 🔴 HIGH | Full AI-PMO assessment | Replace hero 30-second mini-assessment with full assessment flow. Design exists in design spec docs (not yet implemented). Drop hero mini-assessment entirely. | 2026-02-19 |
| B-09 | ✅ DONE | Provider health auto-detection | AIRouter.js: tracks consecutive failures per provider. At 5 failures fires `⚠️ PROVIDER ALERT` to console + `provider-alerts.log`. Resets on success. `getProviderAlertState()` exposed for health checks. | 2026-02-19 |
| B-10 | ✅ DONE | Auto-open log on pipeline run | run-daily.bat + run-daily-NO-VPN.bat: clear pipeline-output.log, spawn PowerShell live-tail window (Get-Content -Wait), then redirect all pipeline output to pipeline-output.log. Both scheduled and manual runs covered. | 2026-02-19 |
| B-11 | 🟡 MEDIUM | Manual vote seeding via console | Admin CLI script or local-only API endpoint to manually set upvote/downvote counts for any article. Used to seed initial engagement at launch. Localhost-only restriction (no auth token needed). | 2026-02-19 |
| B-06 | 🟡 MEDIUM | Article archive page | Show previous days' cards at `/archive`. Data in `daily_insights` table. Yesterday's 20 articles currently vanish — waste of curated content. | 2026-02-19 |
| B-07 | 🟡 MEDIUM | Category filtering on main page | Let visitors filter displayed cards by PMO_RELATED / PMO_POTENTIAL / AI_GENERAL. Currently all 20 cards look identical in presentation. | 2026-02-19 |
| B-08 | 🟢 LOW | Parallel RSS processing | Process 5-10 RSS feeds concurrently instead of sequentially. Would cut RSS phase from ~25 min to ~5 min. Current 22 min is acceptable. | 2026-02-19 |

---

## Completed / Moved to Fixes
Items that started as backlog but got implemented are tracked in `status.md` Fixes Summary table.
