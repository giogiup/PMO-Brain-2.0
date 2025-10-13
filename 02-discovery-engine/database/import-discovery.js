const DatabaseManager = require('./DatabaseManager');
const fs = require('fs').promises;
const path = require('path');
const DiscoveryLogger = require('../src/DiscoveryLogger');

async function importLatestDiscovery() {
    const logger = new DiscoveryLogger();
    await logger.initialize();
    
    const db = new DatabaseManager('../pmo_insights.db');
    await db.initialize();
    
    const stagingDir = path.join(__dirname, '../staging');
    const files = await fs.readdir(stagingDir);
    const discoveryFiles = files.filter(f => f.startsWith('discovery-') && f.endsWith('.json'));
    const latestFile = discoveryFiles.sort().pop();
    
    if (!latestFile) {
        console.log('No discovery files found');
        return;
    }
    
    const data = JSON.parse(await fs.readFile(path.join(stagingDir, latestFile), 'utf-8'));
    
    const insights = data.articles.map(a => ({
        title: a.title,
        url: a.url,
        content: a.summary,
        pmo_relevance_score: 0,
        source_tier: a.source.tier,
        source_name: a.source.name
    }));
    
    const dbPath = path.resolve(__dirname, '../pmo_insights.db');
    await logger.logImportStart(dbPath, insights.length);
    
    let inserted = 0;
    let duplicates = 0;
    const progressInterval = Math.ceil(insights.length / 4);
    
    for (let i = 0; i < insights.length; i++) {
        try {
            await db.storeDailyInsights([insights[i]]);
            inserted++;
        } catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                duplicates++;
            }
        }
        
        // Log progress every 25%
        if ((i + 1) % progressInterval === 0 || i === insights.length - 1) {
            await logger.logImportProgress(i + 1, insights.length);
        }
    }
    
    await logger.logImportComplete(inserted, duplicates, insights.length);
    
console.log(`Imported ${inserted} articles (${duplicates} duplicates skipped)`);
    
    await db.close(); // ← ADD THIS LINE
}

importLatestDiscovery()
    .catch(console.error)
    .finally(() => process.exit()); // ← ADD THIS LINE