const DatabaseManager = require('./modules/DatabaseManager');
const path = require('path');

(async () => {
    const dbPath = path.join(__dirname, '..', '02-discovery-engine', 'pmo_insights.db');
    const db = new DatabaseManager(dbPath);
    await db.initialize();

    console.log('\n=== Creating Share Tracking Table ===\n');

    try {
        // Create share_tracking table
        await db.run(`
            CREATE TABLE IF NOT EXISTS share_tracking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id INTEGER NOT NULL,
                share_type TEXT NOT NULL,
                shared_at DATETIME NOT NULL,
                FOREIGN KEY (card_id) REFERENCES daily_insights(id)
            )
        `);
        console.log('✓ Created share_tracking table');

        // Create indexes
        await db.run('CREATE INDEX IF NOT EXISTS idx_share_tracking_card ON share_tracking(card_id)');
        console.log('✓ Created index on card_id');

        await db.run('CREATE INDEX IF NOT EXISTS idx_share_tracking_date ON share_tracking(shared_at)');
        console.log('✓ Created index on shared_at');

        await db.run('CREATE INDEX IF NOT EXISTS idx_share_tracking_type ON share_tracking(share_type)');
        console.log('✓ Created index on share_type');

        console.log('\n✅ Share tracking schema created successfully!\n');

    } catch (error) {
        console.error('✗ Error creating schema:', error.message);
        process.exit(1);
    }

    await db.close();
})();
