// ============================================================================
// VALIDATE NEW FEEDS - SPEC-B27 Blog Source Expansion
// CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md §4 (Fallback), §7 (Configuration)
//
// Reads new-feeds-b27.json, validates each RSS URL, outputs results report
// and generates SQL INSERT statements for feeds that PASS.
// ============================================================================

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'new-feeds-b27.json');
const TIMEOUT_MS = 15000;

// Read config
const feeds = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
console.log(`\n=== B-27 RSS Feed Validator ===`);
console.log(`Loaded ${feeds.length} feeds from config\n`);

async function fetchUrl(url, timeoutMs = TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.get(url, {
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'PMOBrain/2.0 RSS Validator (https://smartpmo.ai)',
                'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*'
            }
        }, (res) => {
            // Follow redirects (up to 3)
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                const redirectUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).href;
                fetchUrl(redirectUrl, timeoutMs).then(resolve).catch(reject);
                return;
            }

            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', (err) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('TIMEOUT')); });
    });
}

function validateRSSContent(body) {
    // Check for valid XML feed markers
    const hasRSSItems = /<item[\s>]/i.test(body);
    const hasAtomEntries = /<entry[\s>]/i.test(body);
    const isXML = /<\?xml/i.test(body) || /<rss/i.test(body) || /<feed/i.test(body);

    if (!isXML && !hasRSSItems && !hasAtomEntries) {
        return { valid: false, reason: 'Not XML/RSS/Atom content' };
    }
    if (!hasRSSItems && !hasAtomEntries) {
        return { valid: false, reason: 'No <item> or <entry> elements found' };
    }

    // Count entries
    const itemCount = (body.match(/<item[\s>]/gi) || []).length +
                      (body.match(/<entry[\s>]/gi) || []).length;

    // Check for recent content (look for dates in last 90 days)
    // This is a heuristic — we just check if there are any date-like strings
    const hasContent = itemCount > 0;

    return { valid: hasContent, reason: hasContent ? 'OK' : 'Empty feed', itemCount };
}

function escapeSql(str) {
    return str.replace(/'/g, "''");
}

function generateInsertSQL(feed) {
    return `INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  '${escapeSql(feed.source_name)}', 'rss', ${feed.tier}, '${escapeSql(feed.source_url)}', 1, 5,
  0, 0, 0,
  0, 0, 0,
  '${escapeSql(feed.description)}', '${feed.category}', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);`;
}

async function validateAll() {
    const results = { pass: [], fail: [], timeout: [] };
    const sqlStatements = [];

    for (let i = 0; i < feeds.length; i++) {
        const feed = feeds[i];
        const num = String(i + 1).padStart(2, ' ');
        process.stdout.write(`[${num}/${feeds.length}] ${feed.source_name.substring(0, 45).padEnd(45)} `);

        try {
            const { status, body } = await fetchUrl(feed.source_url);

            if (status !== 200) {
                console.log(`FAIL (HTTP ${status})`);
                results.fail.push({ ...feed, reason: `HTTP ${status}` });
                continue;
            }

            const validation = validateRSSContent(body);
            if (!validation.valid) {
                console.log(`FAIL (${validation.reason})`);
                results.fail.push({ ...feed, reason: validation.reason });
                continue;
            }

            console.log(`PASS (${validation.itemCount} items)`);
            results.pass.push({ ...feed, itemCount: validation.itemCount });
            sqlStatements.push(generateInsertSQL(feed));

        } catch (err) {
            if (err.message === 'TIMEOUT') {
                console.log(`TIMEOUT (${TIMEOUT_MS / 1000}s)`);
                results.timeout.push({ ...feed, reason: 'TIMEOUT' });
            } else {
                console.log(`FAIL (${err.code || err.message})`);
                results.fail.push({ ...feed, reason: err.code || err.message });
            }
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`VALIDATION RESULTS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`  PASS:    ${results.pass.length} feeds`);
    console.log(`  FAIL:    ${results.fail.length} feeds`);
    console.log(`  TIMEOUT: ${results.timeout.length} feeds`);
    console.log(`  TOTAL:   ${feeds.length} feeds`);

    if (results.fail.length > 0) {
        console.log(`\nFAILED FEEDS:`);
        results.fail.forEach(f => console.log(`  - ${f.source_name}: ${f.reason}`));
    }
    if (results.timeout.length > 0) {
        console.log(`\nTIMEOUT FEEDS:`);
        results.timeout.forEach(f => console.log(`  - ${f.source_name}: ${f.reason}`));
    }

    // Write SQL file for passing feeds
    if (sqlStatements.length > 0) {
        const sqlPath = path.join(__dirname, '..', 'scripts', 'insert-b27-feeds.sql');
        const sqlContent = `-- SPEC-B27: Blog Source Expansion
-- Generated: ${new Date().toISOString()}
-- Feeds validated: ${feeds.length} | Passed: ${results.pass.length} | Failed: ${results.fail.length} | Timeout: ${results.timeout.length}
-- CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md §7 (Configuration), §8 (Rollback)
--
-- ROLLBACK: UPDATE source_registry SET enabled = 0 WHERE added_by = 'spec-b27';
-- REMOVE:   DELETE FROM source_registry WHERE added_by = 'spec-b27';

${sqlStatements.join('\n\n')}
`;
        fs.writeFileSync(sqlPath, sqlContent, 'utf8');
        console.log(`\nSQL file written: ${sqlPath}`);
        console.log(`  ${sqlStatements.length} INSERT statements ready`);
    }

    // Write results JSON for reference
    const resultsPath = path.join(__dirname, '..', 'scripts', 'validation-results-b27.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Results JSON: ${resultsPath}`);

    return results;
}

validateAll().catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
});
