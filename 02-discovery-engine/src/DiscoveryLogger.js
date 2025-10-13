// Centralized Discovery Logger
const fs = require('fs').promises;
const path = require('path');

class DiscoveryLogger {
    constructor() {
        this.logFile = this.getLogFileName();
        this.initialized = false;
    }

    getLogFileName() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        return path.join('D:', 'PMO-Brain-2.0-Modular', '00-Daily Runner', 'Logs', `discovery-${dateStr}.log`);
    }

    async initialize() {
        if (this.initialized) return;
        
        const logDir = path.dirname(this.logFile);
        await fs.mkdir(logDir, { recursive: true });
        
        const separator = '\n' + '='.repeat(80) + '\n';
        await this.log(`DISCOVERY RUN: ${new Date().toISOString()}${separator}`);
        this.initialized = true;
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        try {
            await fs.appendFile(this.logFile, logMessage);
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    async logRSSStart(totalFeeds) {
        await this.log(`RSS | STARTED | Processing ${totalFeeds} RSS feeds`);
    }

    async logRSSSuccess(sourceName, url, articleCount, titles) {
        const titleList = titles.slice(0, 3).map(t => `"${t}"`).join(', ');
        await this.log(`RSS | SUCCESS | Source: ${sourceName} | URL: ${url} | Articles: ${articleCount} | Titles: ${titleList}${articleCount > 3 ? '...' : ''}`);
    }

    async logRSSFailed(sourceName, url, error) {
        await this.log(`RSS | FAILED | Source: ${sourceName} | URL: ${url} | Error: ${error}`);
    }

    async logRSSComplete(totalArticles, successCount, failCount) {
        await this.log(`RSS | COMPLETED | Total: ${totalArticles} articles from ${successCount}/${successCount + failCount} feeds | Success: ${successCount} | Failed: ${failCount}`);
    }

    async logGoogleStart(totalQueries) {
        await this.log(`GOOGLE | STARTED | Processing ${totalQueries} search queries across categories`);
    }

    async logGoogleCategory(category, queryCount) {
        await this.log(`GOOGLE | CATEGORY | Processing ${category}: ${queryCount} queries`);
    }

    async logGoogleSuccess(query, resultCount, duration, articleTitles = []) {
        const titles = articleTitles.length > 0 ? ` | Articles: ${articleTitles.slice(0, 5).map(t => `"${t}"`).join(', ')}` : '';
        await this.log(`GOOGLE | SUCCESS | Query: ${query} | Results: ${resultCount} | Duration: ${duration.toFixed(3)}s${titles}`);
    }

    async logGoogleFailed(query, error) {
        await this.log(`GOOGLE | FAILED | Query: ${query} | Error: ${error}`);
    }

    async logGoogleComplete(totalArticles, totalQueries, duration) {
        await this.log(`GOOGLE | COMPLETED | Discovery completed in ${duration}s | Results: ${totalArticles} articles from ${totalQueries} queries`);
    }

    async logImportStart(dbPath, articleCount) {
        await this.log(`IMPORT | STARTED | Importing ${articleCount} articles to database: ${dbPath}`);
    }

    async logImportProgress(processed, total) {
        await this.log(`IMPORT | PROGRESS | Processed ${processed}/${total} articles`);
    }

    async logImportComplete(inserted, duplicates, total) {
        await this.log(`IMPORT | COMPLETED | ${inserted} articles imported to daily_insights table | Duplicates skipped: ${duplicates} | New records: ${inserted}`);
    }

    async logDiscoveryComplete(rssArticles, googleArticles, totalArticles, runtime) {
        await this.log(`DISCOVERY | COMPLETED | Total runtime: ${runtime} seconds\n`);
        await this.log(`=== SUMMARY ===`);
        await this.log(`RSS: ${rssArticles} articles`);
        await this.log(`Google: ${googleArticles} articles`);
        await this.log(`Total: ${totalArticles} unique articles`);
        await this.log(`Next Step: Run scoring in Claude Desktop`);
    }
}

module.exports = DiscoveryLogger;