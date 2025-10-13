// ============================================================================
// CONTENT FETCHER - Jina AI Integration
// Fetches full article content for top-scored articles
// FIXED: Removed double Promise wrapping, added comprehensive error logging
// ============================================================================

const axios = require('axios');

class ContentFetcher {
    constructor(db, config = {}) {
        this.db = db;
        this.jinaApiKey = process.env.JINA_API_KEY;
        this.config = {
            fetch_top_articles_count: config.fetch_top_articles_count || 20,
            fetch_batch_size: config.fetch_batch_size || 5,
            ...config
        };
        
        if (!this.jinaApiKey) {
            throw new Error('JINA_API_KEY not found in environment variables');
        }
    }

    async run(runDate) {
        console.log('Starting content fetch...\n');
        
        try {
            // Get top scored articles that haven't been fetched - FIXED: Direct db.all() call
            const articles = await this.db.all(`
                SELECT id, title, url, pmo_score
                FROM daily_insights
                WHERE published_date = ?
                AND pmo_score >= 70
                AND content_fetched = 0
                ORDER BY pmo_score DESC
                LIMIT ?
            `, [runDate, this.config.fetch_top_articles_count]);
            
            if (articles.length === 0) {
                console.log('⚠️  No articles to fetch (all may be already fetched or no high-quality articles)\n');
                return { fetched: 0, failed: 0, total: 0 };
            }
            
            console.log(`📥 Fetching content for ${articles.length} articles...\n`);
            
            let fetched = 0;
            let failed = 0;
            
            // Process in batches
            const batchSize = this.config.fetch_batch_size;
            for (let i = 0; i < articles.length; i += batchSize) {
                const batch = articles.slice(i, Math.min(i + batchSize, articles.length));
                
                await Promise.all(batch.map(async (article) => {
                    try {
                        const content = await this.fetchContent(article.url);
                        await this.saveContent(article.id, content);
                        fetched++;
                        console.log(`✓ [${fetched + failed}/${articles.length}] Fetched: ${article.title.substring(0, 60)}...`);
                    } catch (error) {
                        failed++;
                        console.error(`✗ [${fetched + failed}/${articles.length}] Failed: ${article.title.substring(0, 60)}...`);
                        console.error(`  Error: ${error.message}`);
                        await this.logFetchError(article.id, error.message);
                    }
                }));
                
                // Rate limiting - wait between batches
                if (i + batchSize < articles.length) {
                    await this.sleep(2000);
                }
            }
            
            console.log(`\n✅ Fetch summary:`);
            console.log(`   ${fetched}/${articles.length} articles fetched successfully`);
            console.log(`   ${failed}/${articles.length} articles failed\n`);
            
            return {
                fetched,
                failed,
                total: articles.length
            };
            
        } catch (error) {
            console.error('\n❌ Content fetch failed with error:');
            console.error(error);
            throw error;
        }
    }

    async fetchContent(url) {
        try {
            const response = await axios.get(`https://r.jina.ai/${url}`, {
                headers: {
                    'Authorization': `Bearer ${this.jinaApiKey}`,
                    'X-Return-Format': 'text'
                },
                timeout: 30000
            });
            
            if (!response.data || response.data.length < 100) {
                throw new Error('Content too short or empty');
            }
            
            return response.data;
            
        } catch (error) {
            if (error.response) {
                throw new Error(`Jina API error: ${error.response.status} - ${error.response.statusText}`);
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout (30s)');
            } else {
                throw new Error(`Network error: ${error.message}`);
            }
        }
    }

    async saveContent(articleId, content) {
        try {
            await this.db.run(`
                UPDATE daily_insights
                SET full_content = ?,
                    content_fetched = 1,
                    fetch_date = CURRENT_TIMESTAMP,
                    content_length = ?
                WHERE id = ?
            `, [content, content.length, articleId]);
            
        } catch (error) {
            console.error(`  Database error saving content for article ${articleId}:`);
            console.error(`  ${error.message}`);
            throw error;
        }
    }

    async logFetchError(articleId, errorMessage) {
        try {
            await this.db.run(`
                UPDATE daily_insights
                SET fetch_error = ?,
                    fetch_attempts = fetch_attempts + 1
                WHERE id = ?
            `, [errorMessage, articleId]);
            
        } catch (error) {
            // Don't fail pipeline if logging fails, but report it
            console.error(`  Warning: Could not log fetch error for article ${articleId}`);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ContentFetcher;