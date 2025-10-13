// DiscoveryModule.js
// VERSION: 2.251006c
// CHANGES: Added source tracking to discovery_sources table

const { PMOBrainEnhancedDiscoveryEngine } = require('./discovery-engine');
const DatabaseManager = require('../database/DatabaseManager');
const path = require('path');
const fs = require('fs');

class DiscoveryModule {
  constructor(config = {}) {
    this.config = {
      enableRSS: config.enableRSS !== false,
      enableGoogle: config.enableGoogle !== false,
      dataPath: config.dataPath || path.join(__dirname, '../data'),
      dbPath: config.dbPath || path.join(__dirname, '../pmo_insights.db'),
      ...config
    };

    this.engine = null;
    this.database = null;
    this.isDatabaseReady = false;
  }

  async initialize() {
    console.log('🔧 Initializing Discovery Module with Database & Source Tracking...');
    
    // Initialize database
    this.database = new DatabaseManager(this.config.dbPath);
    await this.database.initialize();
    this.isDatabaseReady = true;

    // Initialize discovery engine
    this.engine = new PMOBrainEnhancedDiscoveryEngine(this.config);
    await this.engine.initialize();

    console.log('✅ Discovery Module ready with database integration');
  }

  async runDiscoveryAndStore() {
    if (!this.isDatabaseReady) {
      await this.initialize();
    }

    const runDate = new Date().toISOString().split('T')[0];
    console.log(`\n🚀 Starting discovery run for ${runDate}...`);

    try {
      // Run discovery engine
      const discoveryResults = await this.engine.discover();
      
      // Track sources and insert articles
      await this.processDiscoveryResults(discoveryResults, runDate);
      
      // Save JSON backup
      await this.saveJsonBackup(discoveryResults);

      return {
        success: true,
        stats: discoveryResults.stats,
        runDate: runDate
      };

    } catch (error) {
      console.error('❌ Discovery failed:', error);
      throw error;
    }
  }

  async processDiscoveryResults(discoveryResults, runDate) {
    const { articles, stats } = discoveryResults;
    
    console.log('\n📊 Processing discovery results with source tracking...');
    
    // Group articles by source for tracking
    const sourceGroups = this.groupArticlesBySource(articles);
    
    // Track each source and insert articles
    for (const [sourceKey, sourceArticles] of Object.entries(sourceGroups)) {
      const source = sourceArticles[0].source; // Get source info from first article
      const sourceType = sourceArticles[0].discoveryMethod === 'RSS' ? 'rss' : 'google';
      
      await this.trackSource(runDate, sourceType, source, sourceArticles);
    }
    
    // Insert all articles into database
    const dbArticles = this.convertDiscoveryToDatabaseFormat(articles);
    const insertedCount = await this.database.insertArticles(dbArticles);
    
    console.log(`✅ Inserted ${insertedCount} articles into database`);
    
    return insertedCount;
  }

  groupArticlesBySource(articles) {
    const groups = {};
    
    for (const article of articles) {
      // Create unique key for each source
      const sourceKey = article.discoveryMethod === 'RSS' 
        ? `rss_${article.source.name}`
        : `google_${article.searchQuery}`;
      
      if (!groups[sourceKey]) {
        groups[sourceKey] = [];
      }
      
      groups[sourceKey].push(article);
    }
    
    return groups;
  }

  async trackSource(runDate, sourceType, source, articles) {
    const startTime = Date.now();
    const articlesFound = articles.length;
    
    try {
      // For RSS sources
      if (sourceType === 'rss') {
        const sourceName = source.name;
        const sourceUrl = source.url || null;
        
        // Count how many were actually inserted (not duplicates)
        const articlesInserted = await this.countNewArticles(articles);
        
        const executionTime = Date.now() - startTime;
        
        await this.database.db.run(`
          INSERT INTO discovery_sources (
            run_date, source_type, source_name, source_url, 
            articles_found, articles_inserted, status, 
            execution_time_ms, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          runDate,
          sourceType,
          sourceName,
          sourceUrl,
          articlesFound,
          articlesInserted,
          'success',
          executionTime,
          new Date(startTime).toISOString(),
          new Date().toISOString()
        ]);
        
        console.log(`  ✅ ${sourceName}: ${articlesFound} found, ${articlesInserted} new`);
      }
      
      // For Google search queries
      if (sourceType === 'google') {
        const searchQuery = articles[0].searchQuery;
        const articlesInserted = await this.countNewArticles(articles);
        const executionTime = Date.now() - startTime;
        
        await this.database.db.run(`
          INSERT INTO discovery_sources (
            run_date, source_type, source_name, source_url, 
            articles_found, articles_inserted, status, 
            execution_time_ms, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          runDate,
          sourceType,
          searchQuery,
          null, // Google searches don't have a single URL
          articlesFound,
          articlesInserted,
          'success',
          executionTime,
          new Date(startTime).toISOString(),
          new Date().toISOString()
        ]);
        
        console.log(`  🔍 "${searchQuery}": ${articlesFound} found, ${articlesInserted} new`);
      }
      
    } catch (error) {
      console.error(`  ❌ Error tracking source:`, error.message);
      
      // Log failed source
      await this.database.db.run(`
        INSERT INTO discovery_sources (
          run_date, source_type, source_name, 
          articles_found, articles_inserted, status, 
          error_message, started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        runDate,
        sourceType,
        source.name || articles[0].searchQuery,
        0,
        0,
        'failed',
        error.message,
        new Date(startTime).toISOString(),
        new Date().toISOString()
      ]);
    }
  }

  async countNewArticles(articles) {
    // Check database to see which articles are actually new
    let newCount = 0;
    
    for (const article of articles) {
      const existing = await this.database.db.get(
        'SELECT id FROM daily_insights WHERE url = ?',
        [article.url]
      );
      
      if (!existing) {
        newCount++;
      }
    }
    
    return newCount;
  }

  convertDiscoveryToDatabaseFormat(articles) {
    const discoveryTime = new Date().toISOString();
    
    return articles.map(article => {
      // Use article's published date, fallback to discovery time
      let publishedDate;
      if (article.publishedDate) {
        publishedDate = article.publishedDate.split('T')[0];
      } else {
        publishedDate = discoveryTime.split('T')[0];
        console.warn(`⚠️ No published date for "${article.title}"`);
      }

      return {
        published_date: publishedDate,
        discovered_at: discoveryTime,
        title: article.title || 'Untitled',
        url: article.url || '',
        content_summary: article.summary || article.description || '',
        pmbok_area: article.pmbok_area || this.inferPMBOKArea(article),
        source_name: article.source?.name || 'Unknown',
        source_tier: article.source?.tier || 'unknown',
        source_authority: article.source?.authority || 'Standard'
      };
    });
  }

  inferPMBOKArea(article) {
    const text = `${article.title} ${article.summary}`.toLowerCase();
    
    if (text.includes('risk') || text.includes('threat')) return 'Risk Management';
    if (text.includes('schedule') || text.includes('timeline')) return 'Schedule Management';
    if (text.includes('cost') || text.includes('budget')) return 'Cost Management';
    if (text.includes('quality') || text.includes('standard')) return 'Quality Management';
    if (text.includes('resource') || text.includes('team')) return 'Resource Management';
    if (text.includes('communication') || text.includes('stakeholder')) return 'Communications Management';
    if (text.includes('procurement') || text.includes('vendor')) return 'Procurement Management';
    
    return 'Integration Management';
  }

  async saveJsonBackup(discoveryResults) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `discovery-backup-${timestamp}.json`;
      const filepath = path.join(this.config.dataPath, filename);
      
      // Ensure data directory exists
      if (!fs.existsSync(this.config.dataPath)) {
        fs.mkdirSync(this.config.dataPath, { recursive: true });
      }
      
      await fs.promises.writeFile(filepath, JSON.stringify(discoveryResults, null, 2));
      console.log(`💾 JSON backup saved: ${filename}`);
      
    } catch (error) {
      console.warn('⚠️ JSON backup failed:', error.message);
    }
  }

  async getSourcePerformance(runDate = null) {
    if (!this.isDatabaseReady) {
      await this.initialize();
    }
    
    const query = runDate 
      ? 'SELECT * FROM discovery_sources WHERE run_date = ? ORDER BY articles_found DESC'
      : 'SELECT * FROM discovery_sources WHERE run_date = DATE("now") ORDER BY articles_found DESC';
    
    const params = runDate ? [runDate] : [];
    
    const sources = await this.database.db.all(query, params);
    
    return {
      sources,
      summary: {
        total: sources.length,
        successful: sources.filter(s => s.status === 'success').length,
        failed: sources.filter(s => s.status === 'failed').length,
        totalArticlesFound: sources.reduce((sum, s) => sum + s.articles_found, 0),
        totalArticlesInserted: sources.reduce((sum, s) => sum + s.articles_inserted, 0)
      }
    };
  }

  async runDiscovery() {
    return this.runDiscoveryAndStore();
  }

  async getRollingArticles(limit = 50) {
    if (!this.isDatabaseReady) {
      await this.initialize();
    }
    
    return await this.database.getRollingInsights(5, limit);
  }

  async getDailyHighlight() {
    if (!this.isDatabaseReady) {
      await this.initialize();
    }
    
    return await this.database.getDailyHighlight();
  }

  async getWeeklyArticles(weekStart, limit = 10) {
    if (!this.isDatabaseReady) {
      await this.initialize();
    }
    
    const weekEnd = this.getWeekEndDate(weekStart);
    return await this.database.getWeeklyTop(weekStart, weekEnd, limit);
  }

  getWeekEndDate(weekStart) {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    return endDate.toISOString().split('T')[0];
  }

  async getStats() {
    const engineStats = this.engine.getStats();
    const dbStats = await this.database.getStats();
    
    return {
      ...engineStats,
      database: dbStats,
      integration: {
        databaseReady: this.isDatabaseReady,
        lastUpdate: new Date().toISOString()
      }
    };
  }

  async close() {
    if (this.database) {
      await this.database.close();
    }
    if (this.engine) {
      await this.engine.stop();
    }
  }
}

module.exports = DiscoveryModule;