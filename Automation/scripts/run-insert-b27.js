// Run insert-b27-feeds.sql against pmo_insights.db
// CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md §7, §9
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', '02-discovery-engine', 'pmo_insights.db');
const SQL_PATH = path.join(__dirname, 'insert-b27-feeds.sql');

const db = new Database(DB_PATH);
const sql = fs.readFileSync(SQL_PATH, 'utf8');

// Split into individual statements
const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.startsWith('INSERT'));

console.log(`Executing ${statements.length} INSERT statements...`);

let inserted = 0;
let errors = 0;

const insertMany = db.transaction(() => {
    for (const stmt of statements) {
        try {
            db.exec(stmt + ';');
            inserted++;
        } catch (err) {
            console.error(`ERROR: ${err.message}`);
            console.error(`Statement: ${stmt.substring(0, 100)}...`);
            errors++;
        }
    }
});

insertMany();

console.log(`\nDone: ${inserted} inserted, ${errors} errors`);

// Verification queries
console.log('\n--- VERIFICATION ---');

const newCount = db.prepare("SELECT COUNT(*) as cnt FROM source_registry WHERE added_by = 'spec-b27'").get();
console.log(`B-27 sources inserted: ${newCount.cnt}`);

const byTier = db.prepare("SELECT tier, COUNT(*) as cnt FROM source_registry WHERE added_by = 'spec-b27' GROUP BY tier ORDER BY tier").all();
console.log('By tier:', byTier.map(r => `T${r.tier}=${r.cnt}`).join(', '));

const byCat = db.prepare("SELECT category, COUNT(*) as cnt FROM source_registry WHERE added_by = 'spec-b27' GROUP BY category ORDER BY category").all();
console.log('By category:', byCat.map(r => `${r.category}=${r.cnt}`).join(', '));

const dupes = db.prepare("SELECT source_url, COUNT(*) as dupes FROM source_registry WHERE enabled = 1 GROUP BY source_url HAVING COUNT(*) > 1").all();
console.log(`URL duplicates (enabled): ${dupes.length}`);
if (dupes.length > 0) {
    dupes.forEach(d => console.log(`  DUPE: ${d.source_url} (${d.dupes}x)`));
}

const totalEnabled = db.prepare("SELECT COUNT(*) as cnt FROM source_registry WHERE enabled = 1 AND source_type = 'rss'").get();
console.log(`Total enabled RSS sources: ${totalEnabled.cnt}`);

const totalAll = db.prepare("SELECT COUNT(*) as cnt FROM source_registry WHERE enabled = 1").get();
console.log(`Total enabled sources (all types): ${totalAll.cnt}`);

// Log to operations_log per Design Contract §8.2
try {
    db.prepare(`INSERT INTO operations_log (operation, details, timestamp) VALUES (?, ?, datetime('now'))`).run(
        'B-27 Source Expansion',
        `Inserted ${inserted} new RSS sources (55 validated of 69 proposed). Tier breakdown: ${byTier.map(r => 'T' + r.tier + '=' + r.cnt).join(', ')}. Category: ${byCat.map(r => r.category + '=' + r.cnt).join(', ')}. 14 feeds failed validation (7 HTTP 404, 7 non-XML). Rollback: UPDATE source_registry SET enabled=0 WHERE added_by='spec-b27'`
    );
    console.log('\nOperations log entry added.');
} catch (err) {
    console.log(`Operations log skipped: ${err.message}`);
}

db.close();
