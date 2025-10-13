// ============================================================================
// REAL WORLD DAILY DISCOVERY - Run Once Per Day Manually
// ============================================================================
// NO SIMULATION - Real 24-hour discovery
// Run this script once per day for 3-5 days to test
// Each run appends to master log
// ============================================================================

require('dotenv').config({ quiet: true });
const axios = require('axios');
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

// Load YOUR existing configurations
const curatedRSSSources = require('./config/curated-rss-sources.js');

const parser = new Parser({
    timeout: 10000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // YOUR 82-85 curated RSS feeds
    rssFeeds: curatedRSSSources,
    
    // YOUR Google search queries (top 20 for testing)
    googleQueries: [
        // General AI
        '"latest AI tools 2025" OR "new artificial intelligence apps"',
        '"AI automation platforms" OR "AI workflow automation tools"',
        '"AI productivity tools" OR "AI workplace efficiency apps"',
        '"AI SaaS launches" OR "new AI SaaS platform"',
        
        // PMO Direct
        '"AI project portfolio management" -whitepaper -thesis',
        '"AI project scheduling optimization" OR "AI project planning software"',
        '"AI project risk assessment tools" OR "AI risk forecasting PMO"',
        '"AI project analytics dashboards" OR "AI PMO reporting tools"',
        '"AI project automation workflows" OR "AI PMO automation"',
        '"AI project management platforms 2025"',
        
        // PMO Inference
        '"AI in portfolio governance" OR "AI-driven compliance monitoring"',
        '"AI workforce allocation tools" OR "AI resource scheduling enterprise"',
        '"AI project risk forecasting" OR "machine learning uncertainty modeling"',
        '"AI stakeholder sentiment analysis enterprise"',
        '"AI workflow orchestration enterprise" OR "AI task automation"',
        '"AI organizational change management" OR "AI transformation playbook"',
        
        // Enterprise AI
        '"AI enterprise adoption trends" OR "AI digital transformation"',
        '"AI-driven decision support systems enterprise"',
        '"AI-powered dashboards enterprise" OR "AI business dashboards"',
        '"AI-powered reporting dashboards enterprise"'
    ],
    
    // GDELT keywords (most relevant to PMO)
    gdeltKeywords: [
        'PMO artificial intelligence',
        'AI project management',
        'AI project portfolio',
        'AI governance enterprise',
        'AI workflow automation',
        'AI decision making enterprise',
        'AI productivity tools',
        'AI business intelligence'
    ],
    
    // Log directory
    logDir: './discovery-trial-logs',
    
    // Master log files (append to these each day)
    masterLogFile: 'master-discovery-log.txt',
    masterCsvFile: 'master-discoveries.csv',
    dailySummaryFile: 'daily-summaries.txt'
};

// ============================================================================
// MAIN DISCOVERY - RUNS ONCE
// ============================================================================

async function runDailyDiscovery() {
    const runDate = new Date();
    const dateStr = runDate.toISOString().split('T')[0];
    const timeStr = runDate.toTimeString().split(' ')[0];
    
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          REAL WORLD DAILY DISCOVERY TEST                  ║');
    console.log('║          Searching LAST 24 HOURS Only                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📅 Date: ${dateStr}`);
    console.log(`⏰ Time: ${timeStr}`);
    console.log(`🔍 Searching articles published in last 24 hours\n`);
    
    // Create log directory
    if (!fs.existsSync(CONFIG.logDir)) {
        fs.mkdirSync(CONFIG.logDir);
    }
    
    // Open master log files for APPENDING
    const masterLogPath = path.join(CONFIG.logDir, CONFIG.masterLogFile);
    const masterCsvPath = path.join(CONFIG.logDir, CONFIG.masterCsvFile);
    const summaryPath = path.join(CONFIG.logDir, CONFIG.dailySummaryFile);
    
    const logStream = fs.createWriteStream(masterLogPath, { flags: 'a' });
    const csvStream = fs.createWriteStream(masterCsvPath, { flags: 'a' });
    const summaryStream = fs.createWriteStream(summaryPath, { flags: 'a' });
    
    // Write CSV header only if file is new
    if (!fs.existsSync(masterCsvPath) || fs.statSync(masterCsvPath).size === 0) {
        csvStream.write('Run_Date,Run_Time,Source,Tier,Title,URL,Published_Date,Source_Name\n');
    }
    
    // Log run start
    log(logStream, '\n' + '='.repeat(80));
    log(logStream, `DISCOVERY RUN: ${dateStr} ${timeStr}`);
    log(logStream, '='.repeat(80));
    log(logStream, `RSS Feeds: ${CONFIG.rssFeeds.length}`);
    log(logStream, `GDELT Keywords: ${CONFIG.gdeltKeywords.length}`);
    log(logStream, `Google Queries: ${CONFIG.googleQueries.length}`);
    log(logStream, `TheNewsAPI: ${process.env.THE_NEWS_API_KEY ? 'ENABLED' : 'DISABLED'}`);
    log(logStream, `Google API: ${process.env.GOOGLE_API_KEY ? 'ENABLED' : 'DISABLED'}`);
    log(logStream, '');
    
    const allArticles = [];
    const startTime = Date.now();
    
    // SOURCE 1: RSS Feeds
    console.log(`\n📡 SOURCE 1: RSS FEEDS (${CONFIG.rssFeeds.length} sources)`);
    console.log('─'.repeat(60));
    log(logStream, `📡 RSS FEEDS (${CONFIG.rssFeeds.length} sources):`);
    const rssArticles = await discoverRSS(logStream, csvStream, dateStr, timeStr);
    allArticles.push(...rssArticles);
    console.log(`✓ Found: ${rssArticles.length} articles from last 24 hours\n`);
    log(logStream, `Total: ${rssArticles.length} articles\n`);
    
    // SOURCE 2: GDELT
    console.log(`🌍 SOURCE 2: GDELT DOC API (${CONFIG.gdeltKeywords.length} keywords)`);
    console.log('─'.repeat(60));
    log(logStream, `🌍 GDELT DOC API (${CONFIG.gdeltKeywords.length} keywords):`);
    const gdeltArticles = await discoverGDELT(logStream, csvStream, dateStr, timeStr);
    allArticles.push(...gdeltArticles);
    console.log(`✓ Found: ${gdeltArticles.length} articles from last 24 hours\n`);
    log(logStream, `Total: ${gdeltArticles.length} articles\n`);
    
    // SOURCE 3: TheNewsAPI (if enabled)
    let newsArticles = [];
    if (process.env.THE_NEWS_API_KEY) {
        console.log(`📰 SOURCE 3: THENEWSAPI (${CONFIG.gdeltKeywords.length} keywords)`);
        console.log('─'.repeat(60));
        log(logStream, `📰 THENEWSAPI (${CONFIG.gdeltKeywords.length} keywords):`);
        newsArticles = await discoverTheNewsAPI(logStream, csvStream, dateStr, timeStr);
        allArticles.push(...newsArticles);
        console.log(`✓ Found: ${newsArticles.length} articles from last 24 hours\n`);
        log(logStream, `Total: ${newsArticles.length} articles\n`);
    } else {
        console.log(`📰 SOURCE 3: THENEWSAPI - SKIPPED (no API key)\n`);
        log(logStream, '📰 THENEWSAPI: SKIPPED (no API key)\n');
    }
    
    // SOURCE 4: Google Search (if enabled)
    let googleArticles = [];
    if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_CSE_ID) {
        console.log(`🔎 SOURCE 4: GOOGLE SEARCH (${CONFIG.googleQueries.length} queries)`);
        console.log('─'.repeat(60));
        log(logStream, `🔎 GOOGLE SEARCH (${CONFIG.googleQueries.length} queries):`);
        googleArticles = await discoverGoogle(logStream, csvStream, dateStr, timeStr);
        allArticles.push(...googleArticles);
        console.log(`✓ Found: ${googleArticles.length} articles from last 24 hours\n`);
        log(logStream, `Total: ${googleArticles.length} articles\n`);
    } else {
        console.log(`🔎 SOURCE 4: GOOGLE SEARCH - SKIPPED (no API key)\n`);
        log(logStream, '🔎 GOOGLE SEARCH: SKIPPED (no API key)\n');
    }
    
    // Remove duplicates
    const uniqueArticles = removeDuplicates(allArticles);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Summary
    const summary = [
        '\n' + '═'.repeat(60),
        `📊 DISCOVERY SUMMARY - ${dateStr}`,
        '═'.repeat(60),
        `RSS Feeds:        ${rssArticles.length} articles`,
        `GDELT API:        ${gdeltArticles.length} articles`,
        `TheNewsAPI:       ${newsArticles.length} articles`,
        `Google Search:    ${googleArticles.length} articles`,
        '─'.repeat(60),
        `TOTAL:            ${allArticles.length} articles`,
        `UNIQUE:           ${uniqueArticles.length} articles`,
        `Duration:         ${duration}s`,
        '═'.repeat(60),
        ''
    ].join('\n');
    
    console.log(summary);
    log(logStream, summary);
    summaryStream.write(`\n[${dateStr} ${timeStr}]\n${summary}`);
    
    log(logStream, 'DISCOVERY RUN COMPLETED\n');
    
    logStream.end();
    csvStream.end();
    summaryStream.end();
    
    console.log('✅ Discovery complete!\n');
    console.log(`📄 Master log:     ${masterLogPath}`);
    console.log(`📊 Master CSV:     ${masterCsvPath}`);
    console.log(`📋 Daily summary:  ${summaryPath}\n`);
    console.log('💡 Run this script again tomorrow to continue testing!\n');
}

// ============================================================================
// DISCOVERY SOURCES
// ============================================================================

async function discoverRSS(logStream, csvStream, dateStr, timeStr) {
    const articles = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    let successCount = 0;
    let errorCount = 0;
    let totalFound = 0;
    
    for (const feedSource of CONFIG.rssFeeds) {
        try {
            const feed = await parser.parseURL(feedSource.url);
            
            let foundCount = 0;
            for (const item of feed.items) {
                const pubDate = new Date(item.pubDate || item.isoDate);
                
                // Only articles from last 24 hours
                if (pubDate >= yesterday) {
                    const article = {
                        source: 'RSS',
                        tier: feedSource.tier || 'unknown',
                        sourceName: feedSource.name,
                        title: item.title,
                        url: item.link,
                        publishedDate: pubDate.toISOString().split('T')[0]
                    };
                    
                    articles.push(article);
                    writeCsv(csvStream, dateStr, timeStr, article);
                    foundCount++;
                }
            }
            
            if (foundCount > 0) {
                totalFound += foundCount;
                console.log(`  ✓ ${feedSource.name}: ${foundCount}`);
                log(logStream, `  ✓ ${feedSource.name}: ${foundCount} articles`);
            }
            successCount++;
            
        } catch (error) {
            errorCount++;
            log(logStream, `  ✗ ${feedSource.name}: ${error.message}`);
        }
    }
    
    log(logStream, `  Summary: ${successCount} feeds OK, ${errorCount} errors, ${totalFound} total articles`);
    
    return articles;
}

async function discoverGDELT(logStream, csvStream, dateStr, timeStr) {
    const articles = [];
    
    for (const keyword of CONFIG.gdeltKeywords) {
        try {
            console.log(`  Searching: "${keyword}"`);
            log(logStream, `  Searching: "${keyword}"`);
            
            const url = `https://api.gdeltproject.org/api/v2/doc/doc?` +
                `query=${encodeURIComponent(keyword)}&` +
                `mode=artlist&` +
                `maxrecords=250&` +
                `format=json&` +
                `timespan=24h`;
            
            const response = await axios.get(url, { timeout: 15000 });
            
            if (response.data && response.data.articles) {
                console.log(`    ✓ ${response.data.articles.length} results`);
                log(logStream, `    ✓ ${response.data.articles.length} results`);
                
                for (const item of response.data.articles) {
                    const article = {
                        source: 'GDELT',
                        tier: 'gdelt',
                        sourceName: item.domain || 'Unknown',
                        title: item.title,
                        url: item.url,
                        publishedDate: parseGDELTDate(item.seendate)
                    };
                    
                    articles.push(article);
                    writeCsv(csvStream, dateStr, timeStr, article);
                }
            } else {
                console.log(`    ✗ No results`);
                log(logStream, `    ✗ No results`);
            }
            
            await sleep(1000);
            
        } catch (error) {
            console.log(`    ✗ Error: ${error.message}`);
            log(logStream, `    ✗ Error: ${error.message}`);
        }
    }
    
    return articles;
}

async function discoverTheNewsAPI(logStream, csvStream, dateStr, timeStr) {
    const articles = [];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const publishedAfter = yesterday.toISOString();
    
    for (const keyword of CONFIG.gdeltKeywords) {
        try {
            console.log(`  Searching: "${keyword}"`);
            log(logStream, `  Searching: "${keyword}"`);
            
            const url = `https://api.thenewsapi.com/v1/news/all?` +
                `api_token=${process.env.THE_NEWS_API_KEY}&` +
                `search=${encodeURIComponent(keyword)}&` +
                `published_after=${publishedAfter}&` +
                `language=en&` +
                `limit=100`;
            
            const response = await axios.get(url, { timeout: 15000 });
            
            if (response.data && response.data.data) {
                console.log(`    ✓ ${response.data.data.length} results`);
                log(logStream, `    ✓ ${response.data.data.length} results`);
                
                for (const item of response.data.data) {
                    const pubDate = new Date(item.published_at);
                    
                    const article = {
                        source: 'TheNewsAPI',
                        tier: 'newsapi',
                        sourceName: item.source || 'Unknown',
                        title: item.title,
                        url: item.url,
                        publishedDate: pubDate.toISOString().split('T')[0]
                    };
                    
                    articles.push(article);
                    writeCsv(csvStream, dateStr, timeStr, article);
                }
            } else {
                console.log(`    ✗ No results`);
                log(logStream, `    ✗ No results`);
            }
            
            await sleep(1000);
            
        } catch (error) {
            console.log(`    ✗ Error: ${error.message}`);
            log(logStream, `    ✗ Error: ${error.message}`);
        }
    }
    
    return articles;
}

async function discoverGoogle(logStream, csvStream, dateStr, timeStr) {
    const articles = [];
    
    // Calculate yesterday's date for after: filter
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const query of CONFIG.googleQueries) {
        try {
            // Add after: and before: filters
            const dateQuery = `${query} after:${yesterdayStr} before:${todayStr}`;
            
            console.log(`  Query: "${query.substring(0, 50)}..."`);
            log(logStream, `  Query: "${dateQuery}"`);
            
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
                console.log(`    ✓ ${response.data.items.length} results`);
                log(logStream, `    ✓ ${response.data.items.length} results`);
                successCount++;
                
                for (const item of response.data.items) {
                    const article = {
                        source: 'Google',
                        tier: 'google',
                        sourceName: item.displayLink || 'Unknown',
                        title: item.title,
                        url: item.link,
                        publishedDate: extractPublishDate(item) || todayStr
                    };
                    
                    articles.push(article);
                    writeCsv(csvStream, dateStr, timeStr, article);
                }
            } else {
                console.log(`    ✗ No results`);
                log(logStream, `    ✗ No results`);
            }
            
            // Rate limiting - Google has strict limits
            await sleep(1100);
            
        } catch (error) {
            errorCount++;
            console.log(`    ✗ Error: ${error.message}`);
            log(logStream, `    ✗ Error: ${error.message}`);
            
            // If rate limited, stop trying
            if (error.response?.status === 429) {
                console.log(`    ⚠️  Rate limit hit - stopping Google searches`);
                log(logStream, `    ⚠️  Rate limit hit - stopping Google searches`);
                break;
            }
        }
    }
    
    log(logStream, `  Summary: ${successCount} queries OK, ${errorCount} errors`);
    
    return articles;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function log(stream, message) {
    const timestamp = new Date().toISOString();
    stream.write(`[${timestamp}] ${message}\n`);
}

function writeCsv(stream, dateStr, timeStr, article) {
    const row = [
        dateStr,
        timeStr,
        article.source,
        article.tier,
        `"${article.title.replace(/"/g, '""')}"`,
        article.url,
        article.publishedDate,
        `"${article.sourceName.replace(/"/g, '""')}"`
    ].join(',');
    
    stream.write(row + '\n');
}

function removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
        if (seen.has(article.url)) {
            return false;
        }
        seen.add(article.url);
        return true;
    });
}

function parseGDELTDate(seendate) {
    if (!seendate || seendate.length < 8) return new Date().toISOString().split('T')[0];
    
    const year = seendate.substring(0, 4);
    const month = seendate.substring(4, 6);
    const day = seendate.substring(6, 8);
    
    return `${year}-${month}-${day}`;
}

function extractPublishDate(item) {
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN DISCOVERY
// ============================================================================

runDailyDiscovery()
    .then(() => {
        console.log('✅ Run this again tomorrow for Day 2!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error during discovery:', error);
        process.exit(1);
    });