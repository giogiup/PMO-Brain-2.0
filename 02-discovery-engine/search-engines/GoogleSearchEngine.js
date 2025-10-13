// PMO Brain 2.0 - Google Search Engine Module (Optimized)
// File: 02-discovery-engine/search-engines/GoogleSearchEngine.js

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const DiscoveryLogger = require('../src/DiscoveryLogger');

class GoogleSearchEngine {
    constructor() {
        this.apiKey = process.env.GOOGLE_API_KEY;
        this.searchEngineId = process.env.GOOGLE_CSE_ID;
        this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
        this.resultsPerQuery = 10;
        this.queryDelay = 1000; // 1 second between queries
        this.logger = new DiscoveryLogger();
        
        // 75 Google queries organized by category (reduced from 90)
        this.queries = {
            // General AI (22 queries - removed funding/infrastructure)
            generalAI: [
                '"latest AI tools 2025" OR "new artificial intelligence apps" qdr:d',
                '"AI software launches today" OR "new AI platform release" qdr:d',
                '"AI automation platforms" OR "AI workflow automation tools" qdr:d',
                '"AI orchestration platforms" OR "AI agent frameworks" qdr:d',
                '"AI productivity tools" OR "AI workplace efficiency apps" qdr:d',
                '"AI business dashboards" OR "AI analytics platforms" qdr:d',
                '"AI team collaboration software" OR "AI enterprise collaboration tools" qdr:d',
                '"AI cost forecasting tools" OR "AI financial planning automation" qdr:d',
                '"AI knowledge base platforms" OR "AI documentation tools" qdr:d',
                '"AI SaaS launches" OR "new AI SaaS platform" qdr:d',
                '"AI enterprise software updates" OR "AI enterprise tools" qdr:d',
                '"AI developer platforms" OR "AI SDK release" qdr:d',
                '"AI cybersecurity tools" OR "AI threat detection platforms" qdr:d',
                '"AI data visualization tools" OR "AI analytics dashboards" qdr:d',
                '"AI CRM tools" OR "AI sales automation" qdr:d',
                '"AI HR platforms" OR "AI workforce management" qdr:d',
                '"AI ERP integration tools" OR "AI enterprise resource planning" qdr:d',
                '"AI open source projects trending" qdr:d',
                '"AI generative design tools" OR "AI creative platforms" qdr:d',
                '"AI automation case studies" OR "AI enterprise adoption" qdr:d',
                '"AI industry reports 2025" OR "AI market insights" qdr:d',
                '"AI enterprise adoption trends" OR "AI digital transformation" qdr:d'
            ],
            
            // Explicit PMO / Project Management + AI (30 queries - all kept)
            pmoDirect: [
                '"AI project portfolio management" -whitepaper -thesis qdr:d',
                '"AI project scheduling optimization" OR "AI project planning software" qdr:d',
                '"AI project risk assessment tools" OR "AI risk forecasting PMO" qdr:d',
                '"AI project estimation techniques" OR "AI-driven cost estimation" qdr:d',
                '"AI project analytics dashboards" OR "AI PMO reporting tools" qdr:d',
                '"AI project automation workflows" OR "AI PMO automation" qdr:d',
                '"AI agile methodology project management" qdr:d',
                '"AI project delivery optimization" OR "AI PMO efficiency" qdr:d',
                '"AI project resource optimization software" qdr:d',
                '"AI project stakeholder communication tools" qdr:d',
                '"AI project documentation automation" qdr:d',
                '"AI project governance tools" OR "AI PMO governance" qdr:d',
                '"AI project performance tracking" OR "AI PMO KPIs" qdr:d',
                '"AI project scheduling assistant" OR "AI PMO assistant" qdr:d',
                '"AI project management platforms 2025" qdr:d',
                '"AI project planning templates" OR "AI PMO templates" qdr:d',
                '"AI project collaboration tools" OR "AI PMO collaboration" qdr:d',
                '"AI project workflow automation" OR "AI PMO workflow" qdr:d',
                '"AI project delivery case examples" qdr:d',
                '"AI project tracking software" OR "AI PMO tracking" qdr:d',
                '"AI project prioritization tools" OR "AI PMO prioritization" qdr:d',
                '"AI project monitoring tools" OR "AI PMO monitoring" qdr:d',
                '"AI project lifecycle management tools" qdr:d',
                '"AI project reporting automation" OR "AI PMO reporting automation" qdr:d',
                '"AI project delivery analytics" OR "AI PMO analytics" qdr:d',
                '"AI project management SaaS tools" qdr:d',
                '"AI project management enterprise solutions" qdr:d',
                '"AI project management startups 2025" qdr:d',
                '"AI project management vendor comparison" qdr:d',
                '"AI project management implementation tools" qdr:d'
            ],
            
            // Inference Queries (23 queries - removed some generic ones)
            pmoInference: [
                '"AI in portfolio governance" OR "AI-driven compliance monitoring" qdr:d',
                '"machine learning project oversight" OR "AI decision audit trail" qdr:d',
                '"AI workforce allocation tools" OR "AI resource scheduling enterprise" qdr:d',
                '"predictive analytics team capacity planning" qdr:d',
                '"AI project risk forecasting" OR "machine learning uncertainty modeling" qdr:d',
                '"AI-driven cost forecasting project delivery" qdr:d',
                '"generative AI project templates" OR "AI automated documentation" qdr:d',
                '"AI knowledge base platforms for teams" qdr:d',
                '"AI stakeholder sentiment analysis enterprise" qdr:d',
                '"AI meeting summarization tools" OR "AI meeting notes automation" qdr:d',
                '"AI workflow orchestration enterprise" OR "AI task automation" qdr:d',
                '"AI task prioritization tools" OR "AI productivity prioritization" qdr:d',
                '"AI organizational change management" OR "AI transformation playbook" qdr:d',
                '"AI adoption strategies project leaders" qdr:d',
                '"AI-driven decision support systems enterprise" qdr:d',
                '"AI predictive analytics project delivery" qdr:d',
                '"AI-powered dashboards enterprise" OR "AI business dashboards" qdr:d',
                '"AI-driven resource allocation enterprise" qdr:d',
                '"AI-powered templates enterprise workflows" qdr:d',
                '"AI-driven governance frameworks enterprise" qdr:d',
                '"AI-powered communication tools enterprise" qdr:d',
                '"AI-driven collaboration platforms enterprise" qdr:d',
                '"AI-powered reporting dashboards enterprise" qdr:d'
            ]
        };
        
        this.stats = {
            totalQueries: 0,
            successfulQueries: 0,
            failedQueries: 0,
            totalResults: 0,
            startTime: null,
            endTime: null
        };
    }

    async initialize() {
        if (!this.apiKey || !this.searchEngineId) {
            throw new Error('Google API credentials not found. Set GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables.');
        }
        
        console.log('🔍 Google Search Engine initialized');
        console.log(`📊 Configured with ${this.getTotalQueryCount()} queries (optimized for PMO relevance)`);
        console.log(`⚙️ ${this.resultsPerQuery} results per query, ${this.queryDelay}ms delay between queries`);
        
        await this.logger.initialize();
    }

    getTotalQueryCount() {
        return Object.values(this.queries).flat().length;
    }

    async discover() {
        this.stats.startTime = new Date();
        this.stats.totalQueries = this.getTotalQueryCount();
        
        console.log('🚀 Starting Google Search discovery (optimized)...');
        await this.logger.logGoogleStart(this.stats.totalQueries);
        
        const allResults = [];
        
        // Process each category of queries
        for (const [category, queries] of Object.entries(this.queries)) {
            console.log(`📂 Processing ${category} queries (${queries.length} queries)`);
            await this.logger.logGoogleCategory(category, queries.length);
            
            for (let i = 0; i < queries.length; i++) {
                const query = queries[i];
                const queryStart = Date.now();
                
                try {
                    console.log(`🔍 Query ${i + 1}/${queries.length} (${category}): ${query.substring(0, 50)}...`);
                    
                    const results = await this.searchGoogle(query, category);
                    allResults.push(...results);
                    this.stats.successfulQueries++;
                    this.stats.totalResults += results.length;
                    
                    const duration = (Date.now() - queryStart) / 1000;
                    const titles = results.map(r => r.title);
                    await this.logger.logGoogleSuccess(query, results.length, duration, titles);
                    
                    // Add delay between queries (except for the last query)
                    if (i < queries.length - 1) {
                        await this.delay(this.queryDelay);
                    }
                    
                } catch (error) {
                    this.stats.failedQueries++;
                    console.error(`❌ Query failed: ${error.message}`);
                    await this.logger.logGoogleFailed(query, error.message);
                    
                    // Continue with next query after error
                    continue;
                }
            }
            
            // Small delay between categories
            await this.delay(500);
        }
        
        this.stats.endTime = new Date();
        const duration = ((this.stats.endTime - this.stats.startTime) / 1000).toFixed(1);
        
        console.log(`✅ Google Search discovery complete in ${duration}s`);
        console.log(`📊 Results: ${this.stats.totalResults} articles from ${this.stats.successfulQueries}/${this.stats.totalQueries} queries`);
        
        await this.logger.logGoogleComplete(this.stats.totalResults, this.stats.totalQueries, duration);
        
        return allResults;
    }

    async searchGoogle(query, category = 'unknown') {
        try {
            const params = {
                key: this.apiKey,
                cx: this.searchEngineId,
                q: query,
                num: this.resultsPerQuery,
                lr: 'lang_en'
            };

            const response = await axios.get(this.baseUrl, { 
                params,
                timeout: 10000
            });
            
            if (!response.data.items) {
                return [];
            }

            return response.data.items.map(item => ({
                title: item.title,
                url: item.link,
                summary: item.snippet || '',
                publishedDate: this.extractPublishDate(item) || new Date().toISOString(),
                author: this.extractAuthor(item) || 'Unknown',
                source: {
                    name: this.extractSourceName(item),
                    tier: 'search',
                    authority: this.classifyAuthority(item.displayLink),
                    focusAreas: ['AI', 'PMO']
                },
                discoveryMethod: 'Google Search',
                searchQuery: query,
                searchCategory: category,
                discoveredAt: new Date().toISOString()
            }));
            
        } catch (error) {
            if (error.response?.status === 429) {
                throw new Error('Rate limit exceeded - too many requests');
            } else if (error.response?.status === 403) {
                throw new Error('API quota exceeded or invalid credentials');
            } else {
                throw new Error(`Search failed: ${error.message}`);
            }
        }
    }

    extractPublishDate(item) {
        if (item.pagemap?.metatags) {
            for (const meta of item.pagemap.metatags) {
                if (meta['article:published_time']) return meta['article:published_time'];
                if (meta['datePublished']) return meta['datePublished'];
                if (meta['publishedDate']) return meta['publishedDate'];
                if (meta['date']) return meta['date'];
            }
        }
        return null;
    }

    extractAuthor(item) {
        if (item.pagemap?.metatags) {
            for (const meta of item.pagemap.metatags) {
                if (meta['author']) return meta['author'];
                if (meta['article:author']) return meta['article:author'];
            }
        }
        return null;
    }

    extractSourceName(item) {
        const domain = item.displayLink || item.link;
        return domain.replace(/^www\./, '').split('.')[0]
            .split('/')
            .filter(part => part.length > 0)[0] || 'Unknown Source';
    }

    classifyAuthority(displayLink) {
        if (!displayLink) return 'Standard';
        
        const domain = displayLink.toLowerCase();
        
        const highAuthority = [
            'harvard.edu', 'mit.edu', 'stanford.edu',
            'mckinsey.com', 'bcg.com', 'bain.com',
            'hbr.org', 'sloanreview.mit.edu',
            'nature.com', 'science.org'
        ];
        
        const mediumAuthority = [
            'techcrunch.com', 'wired.com', 'arstechnica.com',
            'forbes.com', 'bloomberg.com', 'reuters.com',
            'wsj.com', 'ft.com', 'economist.com',
            'venturebeat.com', 'zdnet.com', 'cnet.com'
        ];
        
        if (highAuthority.some(auth => domain.includes(auth))) return 'High';
        if (mediumAuthority.some(auth => domain.includes(auth))) return 'Medium';
        return 'Standard';
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            ...this.stats,
            queriesPerCategory: Object.fromEntries(
                Object.entries(this.queries).map(([category, queries]) => [category, queries.length])
            )
        };
    }
}

module.exports = GoogleSearchEngine;