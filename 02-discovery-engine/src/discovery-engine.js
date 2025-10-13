// PMO Brain 2.0 - Enhanced Discovery Engine
// File: 02-discovery-engine/src/discovery-engine.js

const axios = require('axios');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const DiscoveryLogger = require('./DiscoveryLogger');

// Import RSS sources from external config
const rssSourcesConfig = require('../config/curated-rss-sources');

// Import search engine modules
const GoogleSearchEngine = require('../search-engines/GoogleSearchEngine');

class PMOBrainEnhancedDiscoveryEngine {
    constructor(config = {}) {
        this.config = {
            enableRSS: true,
            enableGoogle: true,
            maxArticlesPerSource: 8,
            timeFilterHours: 24,
            ...config
        };

        this.parser = new Parser({
            customFields: {
                feed: ['lastBuildDate', 'language'],
                item: ['pubDate', 'author', 'category']
            }
        });

        this.sources = [];
        this.isRunning = false;
        this.startTime = Date.now();
        this.logger = new DiscoveryLogger();

        this.stats = {
            totalSources: 0,
            activeSources: 0,
            articlesDiscovered: 0,
            lastRunTime: null,
            frontierSources: 0,
            businessSources: 0,
            pmoSources: 0,
            rssArticles: 0,
            googleArticles: 0,
            rssSuccessCount: 0,
            rssFailCount: 0
        };

        this.maxDailyArticles = 25;
        this.minDailyArticles = 3;

        // Initialize search engines
        this.searchEngines = {
            google: this.config.enableGoogle ? new GoogleSearchEngine() : null
        };
    }

    async initialize() {
        console.log('Initializing Enhanced PMO Brain Discovery Engine...');
        
        await this.logger.initialize();
        await this.loadEnhancedSources();
        await this.validateSources();
        this.setupDailyPolling();
        
        console.log(`Discovery Engine initialized with ${this.sources.length} RSS sources`);
        console.log(`Frontier Sources: ${this.stats.frontierSources}`);
        console.log(`Business Sources: ${this.stats.businessSources}`);
        console.log(`PMO Sources: ${this.stats.pmoSources}`);
        console.log(`Search Engines: Google=${this.config.enableGoogle}`);
        
        if (this.searchEngines.google) {
            await this.searchEngines.google.initialize();
        }
    }

    async loadEnhancedSources() {
        try {
            this.sources = rssSourcesConfig.map(feed => ({
                id: feed.name.toLowerCase().replace(/\s+/g, '-'),
                name: feed.name,
                url: feed.url,
                rssUrl: feed.url,
                tier: feed.tier,
                authority: 'Medium',
                discoveryMethod: 'rss',
                isActive: true,
                hasValidRSS: true,
                focusAreas: ['AI', 'PMO']
            })) || [];
            this.stats.totalSources = this.sources.length;
            
            this.stats.frontierSources = this.sources.filter(s => 
                ['ai-news', 'industry'].includes(s.tier)).length;
            this.stats.businessSources = this.sources.filter(s => 
                ['business', 'startup'].includes(s.tier)).length;
            this.stats.pmoSources = this.sources.filter(s => 
                s.tier === 'pmo').length;
                
            console.log(`Loaded ${this.sources.length} RSS sources from config`);
        } catch (error) {
            console.error('Error loading RSS sources:', error);
            this.sources = [];
        }
    }

    async validateSources() {
        let validCount = 0;
        for (const source of this.sources) {
            if (source.url && source.name && source.tier) {
                validCount++;
            }
        }
        this.stats.activeSources = validCount;
        console.log(`Validated ${validCount}/${this.sources.length} RSS sources`);
    }

    setupDailyPolling() {
        console.log('Daily polling setup ready (use node-cron for scheduling)');
    }

    scheduleDailyDiscovery() {
        console.log('Daily discovery scheduling ready');
    }

    async runFullDiscovery() {
        if (this.isRunning) {
            console.log('Discovery already running');
            return null;
        }

        try {
            this.isRunning = true;
            this.startTime = Date.now();
            
            console.log('\nStarting Enhanced Full Discovery...');
            console.log(`Time filter: Last ${this.config.timeFilterHours} hours`);
            
            const allArticles = [];
            
            // 1. RSS Discovery
            if (this.config.enableRSS) {
                console.log('Starting RSS discovery...');
                await this.logger.logRSSStart(this.sources.length);
                const rssArticles = await this.discoverFromAllTiers();
                allArticles.push(...rssArticles);
                this.stats.rssArticles = rssArticles.length;
                await this.logger.logRSSComplete(
                    this.stats.rssArticles, 
                    this.stats.rssSuccessCount, 
                    this.stats.rssFailCount
                );
            }
            
            // 2. Search Engine Discovery
            const searchArticles = await this.discoverFromSearchEngines();
            allArticles.push(...searchArticles);
            
            // 3. Remove duplicates and save
            const uniqueArticles = this.removeDuplicates(allArticles);
            this.stats.articlesDiscovered = uniqueArticles.length;
            this.stats.lastRunTime = new Date().toISOString();
            
            const discoveryResults = {
                articles: uniqueArticles,
                stats: this.stats,
                timestamp: new Date().toISOString(),
                requestId: `discovery-${Date.now()}`
            };
            
            await this.saveDiscoveryResults(discoveryResults);
            
            const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
            console.log(`\nEnhanced Discovery Complete in ${duration}s`);
            console.log(`Total Articles: ${uniqueArticles.length}`);
            console.log(`RSS: ${this.stats.rssArticles}`);
            console.log(`Google: ${this.stats.googleArticles}`);
            
            await this.logger.logDiscoveryComplete(
                this.stats.rssArticles,
                this.stats.googleArticles,
                uniqueArticles.length,
                duration
            );
            
            return discoveryResults;
            
        } catch (error) {
            console.error('Discovery error:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    async discoverFromSearchEngines() {
        const allSearchArticles = [];
        
        if (this.config.enableGoogle && this.searchEngines.google) {
            console.log('Starting Google search discovery...');
            try {
                const googleArticles = await this.searchEngines.google.discover();
                allSearchArticles.push(...googleArticles);
                this.stats.googleArticles = googleArticles.length;
                console.log(`Google: ${googleArticles.length} articles`);
            } catch (error) {
                console.error('Google search error:', error.message);
                this.stats.googleArticles = 0;
            }
        } else {
            this.stats.googleArticles = 0;
        }

        console.log(`Search Discovery Complete: ${allSearchArticles.length} total articles`);
        return allSearchArticles;
    }

    async discoverFromAllTiers() {
        const allArticles = [];
        
        const tier1Articles = await this.discoverFromTier('ai-news');
        const industryArticles = await this.discoverFromTier('industry');
        allArticles.push(...tier1Articles, ...industryArticles);
        
        const businessArticles = await this.discoverFromTier('business');
        const startupArticles = await this.discoverFromTier('startup');
        allArticles.push(...businessArticles, ...startupArticles);
        
        const pmoArticles = await this.discoverFromTier('pmo');
        allArticles.push(...pmoArticles);
        
        const microsoftArticles = await this.discoverFromTier('microsoft');
        allArticles.push(...microsoftArticles);
        
        return allArticles;
    }

    async discoverFromTier(tierName) {
        const tierSources = this.sources.filter(source => source.tier === tierName);
        const tierArticles = [];
        
        console.log(`Discovering from ${tierName} tier (${tierSources.length} sources)`);
        
        for (const source of tierSources) {
            try {
                const articles = await this.pollRSSSource(source);
                tierArticles.push(...articles);
                
                const titles = articles.map(a => a.title);
                await this.logger.logRSSSuccess(source.name, source.url, articles.length, titles);
                this.stats.rssSuccessCount++;
                
            } catch (error) {
                console.error(`Error polling ${source.name}:`, error.message);
                await this.logger.logRSSFailed(source.name, source.url, error.message);
                this.stats.rssFailCount++;
            }
        }
        
        console.log(`${tierName}: ${tierArticles.length} articles discovered`);
        return tierArticles;
    }

    async pollRSSSource(source) {
        try {
            const feed = await this.parser.parseURL(source.url);
            const articles = [];
            
            for (const item of feed.items.slice(0, this.config.maxArticlesPerSource)) {
                if (!this.isRecent(item.pubDate, this.config.timeFilterHours)) {
                    continue;
                }
                
                if (!this.intelligentFiltering(item)) {
                    continue;
                }
                
                const article = {
                    title: item.title,
                    url: item.link,
                    summary: item.contentSnippet || item.description || '',
                    publishedDate: this.parseDate(item.pubDate),
                    author: item.creator || item.author || 'Unknown',
                    source: {
                        name: source.name,
                        tier: source.tier,
                        authority: this.getSourceAuthority(source.name),
                        focusAreas: source.focusAreas || ['AI', 'PMO']
                    },
                    discoveryMethod: 'RSS',
                    discoveredAt: new Date().toISOString()
                };
                
                articles.push(article);
            }
            
            return articles;
            
        } catch (error) {
            throw new Error(`RSS polling failed: ${error.message}`);
        }
    }

    intelligentFiltering(item) {
        return this.hasAIOrBusinessRelevance(item);
    }

    hasAIOrBusinessRelevance(item) {
        const title = (item.title || '').toLowerCase();
        const content = (item.contentSnippet || item.description || '').toLowerCase();
        const fullText = `${title} ${content}`;
        
        const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'automation', 'chatgpt', 'generative'];
        const pmoKeywords = ['project', 'management', 'pmo', 'agile', 'scrum', 'planning', 'team', 'stakeholder'];
        
        const hasAI = aiKeywords.some(keyword => fullText.includes(keyword));
        const hasPMO = pmoKeywords.some(keyword => fullText.includes(keyword));
        
        return hasAI || hasPMO;
    }

    isRecent(pubDate, hoursAgo = 24) {
        if (!pubDate) return true;
        
        const articleDate = new Date(pubDate);
        const cutoffDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
        
        return articleDate >= cutoffDate;
    }

    getSourceAuthority(sourceName) {
        const highAuthority = ['harvard business review', 'mckinsey', 'mit technology review', 'stanford'];
        const mediumAuthority = ['techcrunch', 'wired', 'forbes', 'bloomberg'];
        
        const name = sourceName.toLowerCase();
        if (highAuthority.some(auth => name.includes(auth))) return 'High';
        if (mediumAuthority.some(auth => name.includes(auth))) return 'Medium';
        return 'Standard';
    }

    removeDuplicates(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.url || article.title;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    async saveDiscoveryResults(results) {
        const stagingDir = path.join(__dirname, '../staging');
        await fs.mkdir(stagingDir, { recursive: true });
        
        const filename = `discovery-${Date.now()}.json`;
        const filepath = path.join(stagingDir, filename);
        
        await fs.writeFile(filepath, JSON.stringify(results, null, 2));
        console.log(`Results saved to: ${filename}`);
    }

    parseDate(dateString) {
        if (!dateString) return new Date().toISOString();
        try {
            const parsed = new Date(dateString);
            return parsed.getTime() ? parsed.toISOString() : new Date().toISOString();
        } catch {
            return new Date().toISOString();
        }
    }

    async start() {
        if (this.isRunning) {
            console.log('Discovery Engine already running');
            return;
        }
        
        this.isRunning = true;
        console.log('Enhanced PMO Brain Discovery Engine started');
        console.log(`Monitoring ${this.stats.activeSources} RSS sources across multiple tiers`);
        console.log(`Search engines: Google=${this.config.enableGoogle}`);
        console.log(`Daily target: ${this.minDailyArticles}-${this.maxDailyArticles} articles`);
    }

    async stop() {
        this.isRunning = false;
        console.log('Enhanced PMO Brain Discovery Engine stopped');
    }

    getStats() {
        return {
            ...this.stats,
            uptime: this.isRunning ? Date.now() - this.startTime : 0,
            sources: {
                total: this.sources.length,
                active: this.sources.filter(s => s.isActive).length,
                rssEnabled: this.sources.filter(s => s.hasValidRSS).length,
                byTier: {
                    frontier: this.stats.frontierSources,
                    business: this.stats.businessSources,
                    pmo: this.stats.pmoSources,
                    tools: this.sources.filter(s => s.tier === 'tools').length
                }
            },
            searchEngines: {
                google: { enabled: this.config.enableGoogle, articles: this.stats.googleArticles }
            },
            targets: {
                dailyMin: this.minDailyArticles,
                dailyMax: this.maxDailyArticles,
                weeklyTarget: 20
            }
        };
    }
}

module.exports = { PMOBrainEnhancedDiscoveryEngine };