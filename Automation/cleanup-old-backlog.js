// ============================================================================
// BACKLOG CLEANUP SCRIPT
// ============================================================================
// Purpose: Delete articles >5 days old that haven't been processed
// Reason: Old articles lose relevance, no point scoring them
// ============================================================================

const path = require('path');
const DatabaseManager = require('./modules/DatabaseManager');

const CONFIG = {
    dbPath: path.join(__dirname, '../02-discovery-engine/pmo_insights.db'),
    daysOld: 5,
    dryRun: process.argv.includes('--dry-run')
};

async function cleanupOldBacklog() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         BACKLOG CLEANUP - DELETE OLD ARTICLES                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = new DatabaseManager(CONFIG.dbPath);
    await db.initialize();

    try {
        // Count articles to delete
        const countResult = await db.get(`
            SELECT COUNT(*) as count
            FROM daily_insights
            WHERE discovered_at < date('now', '-${CONFIG.daysOld} days')
            AND pmo_score IS NULL
            AND prefilter_passed = 0
        `);

        console.log(`📊 Articles older than ${CONFIG.daysOld} days (unprocessed): ${countResult.count}`);

        if (countResult.count === 0) {
            console.log('\n✅ No old articles to delete. Backlog is clean!\n');
            return;
        }

        // Show sample of what will be deleted
        const samples = await db.all(`
            SELECT id, title, discovered_at
            FROM daily_insights
            WHERE discovered_at < date('now', '-${CONFIG.daysOld} days')
            AND pmo_score IS NULL
            AND prefilter_passed = 0
            ORDER BY discovered_at DESC
            LIMIT 5
        `);

        console.log('\n📋 Sample of articles to delete:');
        samples.forEach((article, i) => {
            console.log(`   ${i + 1}. [${article.discovered_at}] ${article.title.substring(0, 60)}...`);
        });

        if (CONFIG.dryRun) {
            console.log('\n⚠️  DRY RUN MODE - No articles will be deleted');
            console.log(`   Remove --dry-run flag to actually delete ${countResult.count} articles\n`);
            return;
        }

        // Delete old articles
        console.log(`\n🗑️  Deleting ${countResult.count} old articles...`);

        const result = await db.run(`
            DELETE FROM daily_insights
            WHERE discovered_at < date('now', '-${CONFIG.daysOld} days')
            AND pmo_score IS NULL
            AND prefilter_passed = 0
        `);

        console.log(`✅ Deleted ${countResult.count} articles older than ${CONFIG.daysOld} days`);

        // Show remaining backlog
        const remaining = await db.get(`
            SELECT COUNT(*) as count
            FROM daily_insights
            WHERE pmo_score IS NULL
            AND prefilter_passed = 0
        `);

        console.log(`\n📊 Remaining backlog: ${remaining.count} articles`);

        // Log operation
        await db.logOperation(
            'backlog-cleanup',
            'automation',
            'success',
            `Deleted ${countResult.count} articles older than ${CONFIG.daysOld} days`,
            JSON.stringify({ deleted: countResult.count, remaining: remaining.count })
        );

        console.log('\n✅ Cleanup complete!\n');

    } catch (error) {
        console.error('\n❌ Cleanup failed:', error.message);
        await db.logOperation(
            'backlog-cleanup',
            'automation',
            'failed',
            `Cleanup failed: ${error.message}`,
            error.stack
        );
        throw error;
    } finally {
        await db.close();
    }
}

// Run
if (require.main === module) {
    cleanupOldBacklog()
        .then(() => {
            console.log('✅ Script completed successfully!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Script failed with error:\n', error);
            process.exit(1);
        });
}

module.exports = cleanupOldBacklog;
