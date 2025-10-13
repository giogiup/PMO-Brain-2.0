// ============================================================================
// DISCOVERY ENGINE - Discovers articles from 179 sources
// ============================================================================

const axios = require('axios');
const Parser = require('rss-parser');

class DiscoveryEngine {
    constructor(db, config) {
        this.db = db;
        this.config = config;
this.parser = new Parser({
    timeout: 30000,  // Also fixes #5: 10s → 30s
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
});
        
        this.stats = {
            sourcesAttempted: 0,
            sourcesSucceeded: 0,
            sourcesFailed: 0,
            articlesFound: 0,
            articlesInserted: 0,
            duplicatesSkipped: 0
        };
    }
    
    async run() {
    const startTime = Date.now();
    const runDate = new Date().toISOString().split('T')[0];
    
    console.log('Starting discovery...\n');
    
    // Create the run record and get runId
    const runId = await this.db.createRun('discovery', 'discovery-engine');
    this.runId = runId;
    
    console.log(`📋 Created run ID: ${runId}\n`);
    
    // Get all enabled sources from database
    const sources = await this.db.getEnabledSources();
    console.log(`📡 Loaded ${sources.length} enabled sources from database\n`);
    
    // Group sources by type
    const rssSources = sources.filter(s => s.source_type === 'rss');
    const gdeltSources = sources.filter(s => s.source_type === 'gdelt');
    const newsApiSources = sources.filter(s => s.source_type === 'thenewsapi');
    const googleSources = sources.filter(s => s.source_type === 'google');
    
    console.log(`  RSS: ${rssSources.length} sources`);
    console.log(`  GDELT: ${gdeltSources.length} queries`);
    console.log(`  TheNewsAPI: ${newsApiSources.length} queries`);
    console.log(`  Google: ${googleSources.length} queries\n`);
    
    // Run discovery for each source type
    await this.discoverRSS(rssSources, runId);
    await this.discoverGDELT(gdeltSources, runId);
    await this.discoverTheNewsAPI(newsApiSources, runId);
    await this.discoverGoogle(googleSources, runId);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    return {
        runId: runId,
        ...this.stats,
        duration: duration
    };
}
    
    // ========================================================================
    // RSS FEEDS
    // ========================================================================
    
    async discoverRSS(sources, runId) {
        if (sources.length === 0) return;
        
        console.log(`📡 Discovering from ${sources.length} RSS feeds...`);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        for (const source of sources) {
            this.stats.sourcesAttempted++;
            const detailId = await this.db.createRunDetail(runId, source.id);
            
            let articlesFound = 0;
            let articlesInserted = 0;
            
            try {
                const feed = await this.parser.parseURL(source.source_url);
                
                for (const item of feed.items) {
                    const pubDate = new Date(item.pubDate || item.isoDate);
                    
                    // Only articles from last 24 hours
                    if (pubDate >= yesterday) {
                        articlesFound++;
                        
                        const article = {
                            title: item.title,
                            url: item.link,
                            publishedDate: pubDate.toISOString().split('T')[0],
                            tier: source.tier
                        };
                        
                        const articleId = await this.db.insertArticle(article, source.id, runId);
                        
                        if (articleId) {
                            articlesInserted++;
                            await this.db.createPipelineEntry(articleId, article.publishedDate);
                        } else {
                            this.stats.duplicatesSkipped++;
                        }
                    }
                }
                
                this.stats.sourcesSucceeded++;
                this.stats.articlesFound += articlesFound;
                this.stats.articlesInserted += articlesInserted;
                
                await this.db.updateRunDetail(detailId, 'success', articlesFound, articlesInserted);
                await this.db.updateSourceStats(source.id, articlesFound, articlesInserted, true);
                
                if (articlesFound > 0) {
                    console.log(`  ✓ ${source.source_name}: ${articlesInserted} new (${articlesFound} total)`);
                }
                
            } catch (error) {
                this.stats.sourcesFailed++;
                await this.db.updateRunDetail(detailId, 'failed', 0, 0, error.message);
                await this.db.updateSourceStats(source.id, 0, 0, false);
                console.log(`  ✗ ${source.source_name}: ${error.message.substring(0, 50)}`);
            }
            
            // Rate limiting: 100ms between RSS fetches
            await this.sleep(100);
        }
        
        console.log(`  Summary: ${this.stats.sourcesSucceeded}/${sources.length} RSS feeds successful\n`);
    }
    
    // ========================================================================
    // GDELT DOC API
    // ========================================================================
    
    async discoverGDELT(sources, runId) {
        if (sources.length === 0) return;
        
        console.log(`🌍 Discovering from GDELT (${sources.length} queries)...`);
        
        for (const source of sources) {
            this.stats.sourcesAttempted++;
            const detailId = await this.db.createRunDetail(runId, source.id);
            
            let articlesFound = 0;
            let articlesInserted = 0;
            
            try {
                const config = JSON.parse(source.config_json || '{}');
                const query = config.query || source.source_name;
                
                const url = `https://api.gdeltproject.org/api/v2/doc/doc?` +
                    `query=${encodeURIComponent(query)}&` +
                    `mode=artlist&` +
                    `maxrecords=250&` +
                    `format=json&` +
                    `timespan=24h`;
                
                const response = await axios.get(url, { timeout: 15000 });
                
                if (response.data && response.data.articles) {
                    for (const item of response.data.articles) {
                        articlesFound++;
                        
                        const article = {
                            title: item.title,
                            url: item.url,
                            publishedDate: this.parseGDELTDate(item.seendate),
                            tier: source.tier
                        };
                        
                        const articleId = await this.db.insertArticle(article, source.id, runId);
                        
                        if (articleId) {
                            articlesInserted++;
                            await this.db.createPipelineEntry(articleId, article.publishedDate);
                        } else {
                            this.stats.duplicatesSkipped++;
                        }
                    }
                }
                
                this.stats.sourcesSucceeded++;
                this.stats.articlesFound += articlesFound;
                this.stats.articlesInserted += articlesInserted;
                
                await this.db.updateRunDetail(detailId, 'success', articlesFound, articlesInserted);
                await this.db.updateSourceStats(source.id, articlesFound, articlesInserted, true);
                
                console.log(`  ✓ "${query}": ${articlesInserted} new (${articlesFound} total)`);
                
            } catch (error) {
                this.stats.sourcesFailed++;
                await this.db.updateRunDetail(detailId, 'failed', 0, 0, error.message);
                await this.db.updateSourceStats(source.id, 0, 0, false);
                console.log(`  ✗ GDELT query: ${error.message.substring(0, 50)}`);
            }
            
            // Rate limiting: 1000ms between GDELT calls
            await this.sleep(1000);
        }
        
        console.log(`  Summary: ${this.stats.sourcesSucceeded}/${sources.length} GDELT queries successful\n`);
    }
    
    // ========================================================================
    // THENEWSAPI
    // ========================================================================
    
    async discoverTheNewsAPI(sources, runId) {
        if (sources.length === 0 || !process.env.THE_NEWS_API_KEY) {
            if (sources.length > 0) {
                console.log('⚠️  TheNewsAPI sources configured but no API key found\n');
            }
            return;
        }
        
        console.log(`📰 Discovering from TheNewsAPI (${sources.length} queries)...`);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const publishedAfter = yesterday.toISOString().split('T')[0];
        
        for (const source of sources) {
            this.stats.sourcesAttempted++;
            const detailId = await this.db.createRunDetail(runId, source.id);
            
            let articlesFound = 0;
            let articlesInserted = 0;
            
            try {
                const config = JSON.parse(source.config_json || '{}');
                const query = config.query || source.source_name;
                
                const url = `https://api.thenewsapi.com/v1/news/all?` +
                    `api_token=${process.env.THE_NEWS_API_KEY}&` +
                    `search=${encodeURIComponent(query)}&` +
                    `published_after=${publishedAfter}&` +
                    `language=en&` +
                    `limit=100`;
                
                const response = await axios.get(url, { timeout: 15000 });
                
                if (response.data && response.data.data) {
                    for (const item of response.data.data) {
                        articlesFound++;
                        
                        const pubDate = new Date(item.published_at);
                        
                        const article = {
                            title: item.title,
                            url: item.url,
                            publishedDate: pubDate.toISOString().split('T')[0],
                            tier: source.tier
                        };
                        
                        const articleId = await this.db.insertArticle(article, source.id, runId);
                        
                        if (articleId) {
                            articlesInserted++;
                            await this.db.createPipelineEntry(articleId, article.publishedDate);
                        } else {
                            this.stats.duplicatesSkipped++;
                        }
                    }
                }
                
                this.stats.sourcesSucceeded++;
                this.stats.articlesFound += articlesFound;
                this.stats.articlesInserted += articlesInserted;
                
                await this.db.updateRunDetail(detailId, 'success', articlesFound, articlesInserted);
                await this.db.updateSourceStats(source.id, articlesFound, articlesInserted, true);
                
                console.log(`  ✓ "${query}": ${articlesInserted} new (${articlesFound} total)`);
                
            } catch (error) {
                this.stats.sourcesFailed++;
                await this.db.updateRunDetail(detailId, 'failed', 0, 0, error.message);
                await this.db.updateSourceStats(source.id, 0, 0, false);
                console.log(`  ✗ NewsAPI query: ${error.message.substring(0, 50)}`);
            }
            
            // Rate limiting: 1000ms between API calls
            await this.sleep(1000);
        }
        
        console.log(`  Summary: ${this.stats.sourcesSucceeded}/${sources.length} NewsAPI queries successful\n`);
    }
    
    // ========================================================================
    // GOOGLE CUSTOM SEARCH
    // ========================================================================
    
    async discoverGoogle(sources, runId) {
        if (sources.length === 0 || !process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_ID) {
            if (sources.length > 0) {
                console.log('⚠️  Google sources configured but API credentials missing\n');
            }
            return;
        }
        
        console.log(`🔎 Discovering from Google (${sources.length} queries)...`);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        for (const source of sources) {
            this.stats.sourcesAttempted++;
            const detailId = await this.db.createRunDetail(runId, source.id);
            
            let articlesFound = 0;
            let articlesInserted = 0;
            
            try {
                const config = JSON.parse(source.config_json || '{}');
                const query = config.query || source.source_name;
                
                // Add date filters
                const dateQuery = `${query} after:${yesterdayStr} before:${todayStr}`;
                
                const url = `https://www.googleapis.com/customsearch/v1`;
                const params = {
                    key: process.env.GOOGLE_API_KEY,
                    cx: process.env.GOOGLE_CSE_ID,
                    q: dateQuery,
                    num: 10,
                    lr: 'lang_en'
                };
                
                const response = await axios.get(url, { params, timeout: 10000 });
                
                if (response.data && response.data.items) {
                    for (const item of response.data.items) {
                        articlesFound++;
                        
                        const article = {
                            title: item.title,
                            url: item.link,
                            publishedDate: this.extractPublishDate(item) || todayStr,
                            tier: source.tier
                        };
                        
                        const articleId = await this.db.insertArticle(article, source.id, runId);
                        
                        if (articleId) {
                            articlesInserted++;
                            await this.db.createPipelineEntry(articleId, article.publishedDate);
                        } else {
                            this.stats.duplicatesSkipped++;
                        }
                    }
                }
                
                this.stats.sourcesSucceeded++;
                this.stats.articlesFound += articlesFound;
                this.stats.articlesInserted += articlesInserted;
                
                await this.db.updateRunDetail(detailId, 'success', articlesFound, articlesInserted);
                await this.db.updateSourceStats(source.id, articlesFound, articlesInserted, true);
                
                console.log(`  ✓ "${query.substring(0, 40)}...": ${articlesInserted} new`);
                
            } catch (error) {
                this.stats.sourcesFailed++;
                await this.db.updateRunDetail(detailId, 'failed', 0, 0, error.message);
                await this.db.updateSourceStats(source.id, 0, 0, false);
                
                // Check for rate limit
                if (error.response?.status === 429) {
                    console.log(`  ⚠️  Google rate limit hit - stopping searches`);
                    break;
                }
                
                console.log(`  ✗ Google query: ${error.message.substring(0, 50)}`);
            }
            
            // Rate limiting: 1100ms between Google calls (strict)
            await this.sleep(1100);
        }
        
        console.log(`  Summary: ${this.stats.sourcesSucceeded}/${sources.length} Google queries successful\n`);
    }
    
    // ========================================================================
    // UTILITIES
    // ========================================================================
    
    parseGDELTDate(seendate) {
        if (!seendate || seendate.length < 8) {
            return new Date().toISOString().split('T')[0];
        }
        
        const year = seendate.substring(0, 4);
        const month = seendate.substring(4, 6);
        const day = seendate.substring(6, 8);
        
        return `${year}-${month}-${day}`;
    }
    
    extractPublishDate(item) {
        if (item.pagemap?.metatags) {
            for (const meta of item.pagemap.metatags) {
                if (meta['article:published_time']) return meta['article:published_time'].split('T')[0];
                if (meta['datePublished']) return meta['datePublished'].split('T')[0];
                if (meta['publishedDate']) return meta['publishedDate'].split('T')[0];
                if (meta['date']) return meta['date'].split('T')[0];
            }
        }
        return null;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = DiscoveryEngine;