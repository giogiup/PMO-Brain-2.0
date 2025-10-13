// emergency-import.js
// Quick fix to import today's discovery file with proper duplicate checking
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

class EmergencyImporter {
    constructor(dbPath = 'D:/PMO-Brain-2.0-Modular/02-discovery-engine/pmo_insights.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        console.log('🔧 Emergency importer starting...');
        console.log(`📍 Database path: ${this.dbPath}`);
        console.log(`📍 Full path: ${path.resolve(this.dbPath)}`);
        
        this.db = new sqlite3.Database(this.dbPath);
        
        // Check table structure
        console.log('🔍 Checking table structure...');
        return new Promise((resolve, reject) => {
            this.db.all("PRAGMA table_info(daily_insights)", (err, rows) => {
                if (err) {
                    console.error('❌ Error checking table:', err.message);
                    reject(err);
                } else {
                    console.log('📋 Table columns:');
                    rows.forEach(row => console.log(`  - ${row.name} (${row.type})`));
                    resolve(true);
                }
            });
        });
    }

    async checkUrlExists(url) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT id FROM daily_insights WHERE url = ? LIMIT 1', [url], (err, row) => {
                if (err) reject(err);
                else resolve(!!row);
            });
        });
    }

    async insertArticle(article) {
        return new Promise((resolve, reject) => {
            // Extract published date
            let publishedDate = new Date().toISOString().split('T')[0];
            if (article.publishedDate) {
                publishedDate = article.publishedDate.split('T')[0];
            }

            const insertSQL = `
                INSERT INTO daily_insights 
                (published_date, discovered_at, title, url, pmo_score, 
                 pmo_application, pmbok_area, content_summary, full_content, featured_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(insertSQL, [
                publishedDate,
                new Date().toISOString(),
                article.title || 'Untitled',
                article.url || '',
                0, // Will be scored later
                'General',
                'General', 
                article.summary || '',
                JSON.stringify(article),
                0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    async importDiscoveryFile(filePath) {
        try {
            console.log(`📥 Reading discovery file: ${filePath}`);
            
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const discoveryData = JSON.parse(fileContent);
            
            let imported = 0;
            let duplicates = 0;
            let errors = 0;
            
            // Process articles array
            const articles = discoveryData.articles || [];
            console.log(`📊 Processing ${articles.length} articles...`);
            
            for (const article of articles) {
                try {
                    // Skip if no URL
                    if (!article.url) {
                        console.log(`⚠️  Skipping article with no URL: ${article.title}`);
                        errors++;
                        continue;
                    }
                    
                    // Check if URL already exists
                    const exists = await this.checkUrlExists(article.url);
                    if (exists) {
                        console.log(`🔄 Duplicate URL: ${article.url}`);
                        duplicates++;
                        continue;
                    }
                    
                    // Insert new article
                    await this.insertArticle(article);
                    imported++;
                    
                    if (imported % 10 === 0) {
                        console.log(`📈 Progress: ${imported} imported, ${duplicates} duplicates, ${errors} errors`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing article: ${error.message}`);
                    errors++;
                }
            }
            
            console.log('\n🎉 Import Complete!');
            console.log(`✅ Imported: ${imported}`);
            console.log(`🔄 Duplicates: ${duplicates}`);
            console.log(`❌ Errors: ${errors}`);
            console.log(`📊 Total processed: ${imported + duplicates + errors}`);
            
            return { imported, duplicates, errors };
            
        } catch (error) {
            console.error('💥 Import failed:', error.message);
            throw error;
        }
    }

    async close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database closed');
        }
    }
}

// Main execution
async function main() {
    const importer = new EmergencyImporter();
    
    try {
        await importer.initialize();
        
        // Find today's discovery file
        const stagingDir = '../staging';
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-') && f.endsWith('.json'));
        
        if (files.length === 0) {
            console.log('❌ No discovery files found in staging directory');
            return;
        }
        
        // Use the most recent file
        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        console.log(`🎯 Using file: ${latestFile}`);
        
        await importer.importDiscoveryFile(filePath);
        
    } catch (error) {
        console.error('💥 Emergency import failed:', error.message);
    } finally {
        await importer.close();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = EmergencyImporter;