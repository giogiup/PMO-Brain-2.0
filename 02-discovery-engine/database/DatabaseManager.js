// database/DatabaseManager.js
// SQLite database manager for PMO Brain 2.0 insights
// Updated: All 'date' references changed to 'published_date'

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

class DatabaseManager {
    constructor(dbPath = './database/pmo_insights.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    /**
     * Initialize database connection and create tables
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            console.log('🗄️  Initializing database...');
            
            // Ensure database directory exists
            const dbDir = path.dirname(this.dbPath);
            await fs.mkdir(dbDir, { recursive: true });
            
            // Connect to database
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables
            await this.createTables();
            
            console.log('✅ Database initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error.message);
            return false;
        }
    }

    /**
     * Create database tables
     * @returns {Promise<void>}
     */
    async createTables() {
        const createInsightsTable = `
            CREATE TABLE IF NOT EXISTS daily_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                published_date TEXT NOT NULL,
                discovered_at DATETIME,
                title TEXT NOT NULL,
                url TEXT UNIQUE NOT NULL,
                source TEXT,
                ai_technology TEXT,
                pmo_score REAL,
                pmo_application TEXT,
                pmbok_area TEXT,
                content_summary TEXT,
                full_content TEXT,
                featured_status BOOLEAN DEFAULT 0,
                newsletter_included BOOLEAN DEFAULT 0,
                website_published BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createNewslettersTable = `
            CREATE TABLE IF NOT EXISTS weekly_newsletters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_start TEXT NOT NULL,
                week_end TEXT NOT NULL,
                subject TEXT NOT NULL,
                content_html TEXT NOT NULL,
                insights_count INTEGER,
                subscriber_count INTEGER,
                broadcast_id TEXT,
                sent_at DATETIME,
                open_rate REAL,
                click_rate REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const createIndexes = `
            CREATE INDEX IF NOT EXISTS idx_insights_published_date ON daily_insights(published_date);
            CREATE INDEX IF NOT EXISTS idx_insights_discovered_at ON daily_insights(discovered_at);
            CREATE INDEX IF NOT EXISTS idx_insights_pmo_score ON daily_insights(pmo_score);
            CREATE INDEX IF NOT EXISTS idx_insights_featured ON daily_insights(featured_status);
            CREATE INDEX IF NOT EXISTS idx_newsletters_week ON weekly_newsletters(week_start, week_end);
        `;

        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(createInsightsTable);
                this.db.run(createNewslettersTable);
                this.db.run(createIndexes, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    /**
     * Import discovery results from JSON file
     * @param {string} jsonFilePath - Path to discovery JSON file
     * @returns {Promise<Object>} Import result
     */
    async importDiscoveryFile(jsonFilePath) {
        try {
            console.log(`📥 Importing discovery file: ${jsonFilePath}`);
            
            const fileContent = await fs.readFile(jsonFilePath, 'utf8');
            const discoveryData = JSON.parse(fileContent);
            
            let imported = 0;
            let skipped = 0;
            let errors = 0;
            
            // Process each source's articles
            for (const [source, articles] of Object.entries(discoveryData)) {
                if (!Array.isArray(articles)) continue;
                
                for (const article of articles) {
                    try {
                        const result = await this.saveInsight(article, source);
                        if (result.success) {
                            imported++;
                        } else {
                            skipped++;
                        }
                    } catch (error) {
                        console.error(`Error importing article: ${error.message}`);
                        errors++;
                    }
                }
            }
            
            console.log(`✅ Import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`);
            
            return {
                success: true,
                imported,
                skipped,
                errors,
                total: imported + skipped + errors
            };
            
        } catch (error) {
            console.error('❌ Import failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save a single insight to database
     * @param {Object} article - Article data
     * @param {string} source - Source name
     * @returns {Promise<Object>} Save result
     */
    async saveInsight(article, source) {
        return new Promise((resolve) => {
            // Extract published date or use today as fallback
            let publishedDate = new Date().toISOString().split('T')[0];
            if (article.publishedDate) {
                publishedDate = article.publishedDate.split('T')[0];
            }
            
            const insight = {
                published_date: publishedDate,
                discovered_at: new Date().toISOString(),
                title: article.title || 'Untitled',
                url: article.url || article.link || '',
                source: source || 'Unknown',
                ai_technology: article.aiTechnology || article.ai_technology || 'General AI',
                pmo_score: article.pmoScore || article.pmo_score || 0,
                pmo_application: article.pmoApplication || article.pmo_application || 'General',
                pmbok_area: article.pmbokArea || article.pmbok_area || 'General',
                content_summary: article.summary || article.content_summary || article.description || '',
                full_content: JSON.stringify(article),
                featured_status: (article.pmoScore || article.pmo_score || 0) >= 8 ? 1 : 0
            };

            const insertSQL = `
                INSERT OR IGNORE INTO daily_insights 
                (published_date, discovered_at, title, url, source, ai_technology, pmo_score, pmo_application, 
                 pmbok_area, content_summary, full_content, featured_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(insertSQL, [
                insight.published_date, insight.discovered_at, insight.title, insight.url, insight.source,
                insight.ai_technology, insight.pmo_score, insight.pmo_application,
                insight.pmbok_area, insight.content_summary, insight.full_content,
                insight.featured_status
            ], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT') {
                        resolve({ success: false, reason: 'duplicate' });
                    } else {
                        resolve({ success: false, reason: 'error', error: err.message });
                    }
                } else {
                    resolve({ success: true, id: this.lastID });
                }
            });
        });
    }

    /**
     * Store daily insights from discovery engine
     * @param {Array} insights - Array of insights from discovery/analysis
     * @param {string} publishedDate - Published date string (YYYY-MM-DD) - optional
     * @returns {Promise<number>} Number of insights stored
     */
    async storeDailyInsights(insights, publishedDate = null) {
        try {
            console.log(`📝 Storing ${insights.length} insights...`);
            
            let stored = 0;
            let skipped = 0;
            
            for (const insight of insights) {
                try {
                    const result = await this.saveInsight({
                        title: insight.title || 'No title',
                        url: insight.url,
                        publishedDate: insight.published_date || publishedDate,
                        pmoScore: insight.pmoRelevanceScore || insight.score || insight.pmo_score || 0,
                        aiTechnology: insight.aiTechnology || '',
                        pmoApplication: insight.pmoApplication || insight.pmo_application || '',
                        pmbokArea: insight.pmobokArea || insight.pmbok_area || '',
                        summary: insight.content || insight.summary || insight.content_summary || '',
                        ...insight
                    }, insight.sourceTier || insight.sourceName || insight.source || 'unknown');
                    
                    if (result.success) {
                        stored++;
                    } else {
                        skipped++;
                    }
                } catch (err) {
                    console.warn(`⚠️  Error with insight: ${insight.url}`);
                    skipped++;
                }
            }
            
            console.log(`✅ Stored ${stored} insights, skipped ${skipped}`);
            return stored;

        } catch (error) {
            console.error('❌ Error storing insights:', error.message);
            return 0;
        }
    }

    /**
     * Get top insights for a date range (for newsletters)
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)  
     * @param {number} limit - Number of insights to return
     * @returns {Promise<Array>} Top insights
     */
    async getTopInsights(startDate, endDate, limit = 20) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM daily_insights 
                WHERE published_date >= ? AND published_date <= ?
                ORDER BY pmo_score DESC, created_at DESC
                LIMIT ?
            `;

            this.db.all(query, [startDate, endDate, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Get rolling insights for website (10 today + 40 from last 4 days)
     * @param {number} days - Number of days to look back
     * @param {number} limit - Maximum number of insights
     * @returns {Promise<Array>} Rolling insights
     */
    async getRollingInsights(days = 5, limit = 50) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM daily_insights 
                WHERE published_date >= date('now', '-${days} days')
                ORDER BY published_date DESC, pmo_score DESC
                LIMIT ?
            `;

            this.db.all(query, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📊 Retrieved ${rows.length} rolling insights`);
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Get daily top insights for website feature
     * @param {string} publishedDate - Published date (YYYY-MM-DD)
     * @param {number} limit - Number of insights
     * @returns {Promise<Array>} Top daily insights
     */
    async getDailyTop(publishedDate = new Date().toISOString().split('T')[0], limit = 10) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM daily_insights 
                WHERE published_date = ?
                ORDER BY pmo_score DESC
                LIMIT ?
            `;

            this.db.all(query, [publishedDate, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`🔥 Retrieved ${rows.length} top daily insights for ${publishedDate}`);
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Get highest scoring insight for social media
     * @param {string} publishedDate - Published date (YYYY-MM-DD)
     * @returns {Promise<Object>} Highest scoring insight
     */
    async getDailyHighlight(publishedDate = new Date().toISOString().split('T')[0]) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM daily_insights 
                WHERE published_date = ?
                ORDER BY pmo_score DESC
                LIMIT 1
            `;

            this.db.get(query, [publishedDate], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        console.log(`⭐ Daily highlight: ${row.title} (Score: ${row.pmo_score})`);
                    }
                    resolve(row);
                }
            });
        });
    }

    /**
     * Get insights for weekly newsletter compilation
     * @param {string} weekStart - Week start date (YYYY-MM-DD)
     * @returns {Promise<Object>} Newsletter data
     */
    async getWeeklyNewsletterData(weekStart) {
        try {
            const weekEnd = this.getWeekEndDate(weekStart);
            const insights = await this.getTopInsights(weekStart, weekEnd, 20);
            
            // Get total insights count for the week
            const totalCount = await this.getTotalInsightsCount(weekStart, weekEnd);
            
            return {
                weekStart,
                weekEnd,
                insights: insights.map(insight => ({
                    ...insight,
                    // Parse full content for additional data if needed
                    originalData: JSON.parse(insight.full_content || '{}')
                })),
                totalInsights: totalCount,
                subject: `PMO AI Insights - Week of ${new Date(weekStart).toLocaleDateString()}`
            };
            
        } catch (error) {
            console.error('❌ Error getting weekly newsletter data:', error.message);
            throw error;
        }
    }

    /**
     * Get top insights for weekly newsletter (not yet included)
     * @param {string} weekStart - Week start date
     * @param {string} weekEnd - Week end date
     * @param {number} limit - Number of insights
     * @returns {Promise<Array>} Weekly insights
     */
    async getWeeklyTop(weekStart, weekEnd, limit = 10) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT * FROM daily_insights 
                WHERE published_date >= ? AND published_date <= ?
                AND newsletter_included = 0
                ORDER BY pmo_score DESC
                LIMIT ?
            `;

            this.db.all(query, [weekStart, weekEnd, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📰 Retrieved ${rows.length} insights for newsletter (${weekStart} to ${weekEnd})`);
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Get total insights count for date range
     * @param {string} startDate - Start date
     * @param {string} endDate - End date
     * @returns {Promise<number>} Count
     */
    async getTotalInsightsCount(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) as count 
                FROM daily_insights 
                WHERE published_date >= ? AND published_date <= ?
            `;

            this.db.get(query, [startDate, endDate], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.count : 0);
                }
            });
        });
    }

    /**
     * Mark insights as included in newsletter
     * @param {Array<number>} insightIds - IDs of insights to mark
     * @param {number} newsletterId - Newsletter ID
     * @returns {Promise<boolean>} Success status
     */
    async markInsightsInNewsletter(insightIds, newsletterId) {
        return new Promise((resolve, reject) => {
            const placeholders = insightIds.map(() => '?').join(',');
            const query = `
                UPDATE daily_insights 
                SET newsletter_included = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})
            `;

            this.db.run(query, insightIds, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Mark insights as sent in newsletter
     * @param {Array<number>} insightIds - Array of insight IDs
     * @returns {Promise<number>} Number of insights marked
     */
    async markNewsletterSent(insightIds) {
        return new Promise((resolve, reject) => {
            const placeholders = insightIds.map(() => '?').join(',');
            const query = `
                UPDATE daily_insights 
                SET newsletter_included = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (${placeholders})
            `;

            this.db.run(query, insightIds, function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`✅ Marked ${this.changes} insights as sent in newsletter`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * Save newsletter send record
     * @param {Object} newsletterData - Newsletter data
     * @param {Object} sendResult - ConvertKit send result
     * @returns {Promise<number>} Newsletter ID
     */
    async saveNewsletterRecord(newsletterData, sendResult) {
        return new Promise((resolve, reject) => {
            const insertSQL = `
                INSERT INTO weekly_newsletters 
                (week_start, week_end, subject, content_html, insights_count, 
                 subscriber_count, broadcast_id, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;

            this.db.run(insertSQL, [
                newsletterData.weekStart,
                newsletterData.weekEnd,
                newsletterData.subject,
                '', // We can store HTML content if needed
                newsletterData.insights.length,
                sendResult.subscriberCount || 0,
                sendResult.broadcastId || null
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Store newsletter record
     * @param {Object} newsletterData - Newsletter data
     * @returns {Promise<number>} Newsletter ID
     */
    async storeNewsletter(newsletterData) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO weekly_newsletters (
                    week_start, week_end, subject, content_html, 
                    insights_count, subscriber_count, sent_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [
                newsletterData.weekStart,
                newsletterData.weekEnd,
                newsletterData.subject,
                newsletterData.content || '',
                newsletterData.totalInsights || 0,
                newsletterData.subscriberCount || 0,
                new Date().toISOString()
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📧 Newsletter record stored with ID: ${this.lastID}`);
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database stats
     */
    async getStats() {
        try {
            const insightsCount = await this.getTotalInsightsCount('1900-01-01', '2100-01-01');
            
            const newslettersCount = await new Promise((resolve, reject) => {
                this.db.get('SELECT COUNT(*) as count FROM weekly_newsletters', (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });

            const avgScore = await new Promise((resolve, reject) => {
                this.db.get('SELECT AVG(pmo_score) as avg_score FROM daily_insights', (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.avg_score?.toFixed(2) : 0);
                });
            });

            const highQualityCount = await new Promise((resolve, reject) => {
                this.db.get('SELECT COUNT(*) as count FROM daily_insights WHERE pmo_score >= 7', (err, row) => {
                    if (err) reject(err);
                    else resolve(row ? row.count : 0);
                });
            });

            const topSources = await new Promise((resolve, reject) => {
                this.db.all(`
                    SELECT source, COUNT(*) as count 
                    FROM daily_insights 
                    GROUP BY source 
                    ORDER BY count DESC 
                    LIMIT 10
                `, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });

            return {
                totalInsights: insightsCount,
                newslettersSent: newslettersCount,
                avgScore: avgScore,
                highQualityInsights: highQualityCount,
                topSources: topSources
            };

        } catch (error) {
            console.error('❌ Error getting stats:', error.message);
            return {
                totalInsights: 0,
                newslettersSent: 0,
                avgScore: 0,
                highQualityInsights: 0,
                topSources: []
            };
        }
    }

    /**
     * Helper: Get week end date from week start
     * @param {string} weekStart - Week start date (YYYY-MM-DD)
     * @returns {string} Week end date (YYYY-MM-DD)
     */
    getWeekEndDate(weekStart) {
        const startDate = new Date(weekStart);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return endDate.toISOString().split('T')[0];
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            this.db.close();
            console.log('🔒 Database connection closed');
        }
    }
}

module.exports = DatabaseManager;