// ============================================================================
// DATABASE MANAGER - Handles all database operations
// ============================================================================

const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class DatabaseManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }
    
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Database connected');
                    resolve();
                }
            });
        });
    }
    
    // Promisify database methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    // ========================================================================
    // AUTOMATION CONFIG
    // ========================================================================
    
    async getAutomationConfig() {
        const configs = await this.all('SELECT config_key, config_value FROM automation_config');
        
        const config = {};
        configs.forEach(row => {
            // Convert to camelCase and parse values
            const key = row.config_key.replace(/\./g, '_');
            let value = row.config_value;
            
            // Parse boolean values
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Parse numbers
            else if (!isNaN(value) && value !== '') value = parseInt(value);
            
            config[key] = value;
        });
        
        return config;
    }
    
    // ========================================================================
    // DISCOVERY RUN MASTER
    // ========================================================================
    
    async createDiscoveryRun(runDate) {
        const result = await this.run(`
            INSERT INTO discovery_run_master (
                run_date, run_started_at, run_status
            ) VALUES (?, datetime('now'), 'running')
        `, [runDate]);
        
        return result.lastID;
    }
    
    async completeDiscoveryRun(runId, status, results, duration, errorMessage = null) {
        await this.run(`
            UPDATE discovery_run_master SET
                run_completed_at = datetime('now'),
                run_status = ?,
                sources_attempted = ?,
                sources_succeeded = ?,
                sources_failed = ?,
                total_articles_found = ?,
                total_articles_inserted = ?,
                duplicates_skipped = ?,
                total_duration_seconds = ?,
                error_summary = ?
            WHERE id = ?
        `, [
            status,
            results.discovery?.sourcesAttempted || 0,
            results.discovery?.sourcesSucceeded || 0,
            results.discovery?.sourcesFailed || 0,
            results.discovery?.articlesFound || 0,
            results.discovery?.articlesInserted || 0,
            results.discovery?.duplicatesSkipped || 0,
            duration,
            errorMessage,
            runId
        ]);
    }
    
    // ========================================================================
    // SOURCE REGISTRY
    // ========================================================================
    
    async getEnabledSources() {
        return await this.all(`
            SELECT * FROM source_registry 
            WHERE enabled = 1 
            ORDER BY priority ASC, tier ASC
        `);
    }
    
    async updateSourceStats(sourceId, articlesFound, articlesInserted, success) {
        await this.run(`
            UPDATE source_registry SET
                total_runs = total_runs + 1,
                total_articles_found = total_articles_found + ?,
                total_articles_inserted = total_articles_inserted + ?,
                last_run_date = datetime('now'),
                last_success_date = CASE WHEN ? = 1 THEN datetime('now') ELSE last_success_date END,
                consecutive_failures = CASE WHEN ? = 1 THEN 0 ELSE consecutive_failures + 1 END
            WHERE id = ?
        `, [articlesFound, articlesInserted, success ? 1 : 0, success ? 1 : 0, sourceId]);
    }
    
// ========================================================================
// DISCOVERY RUNS
// ========================================================================

async createRun(runType, component) {
    const result = await this.run(`
        INSERT INTO discovery_run_master (
            run_date,
            run_started_at,
            run_status,
            triggered_by
        ) VALUES (?, ?, ?, ?)
    `, [
        new Date().toISOString().split('T')[0],
        new Date().toISOString(),
        'running',
        component || 'automation'
    ]);
    
    return result.lastID;
}

    // ========================================================================
    // DISCOVERY RUN DETAILS
    // ========================================================================
    
    async createRunDetail(runId, sourceId) {
        const result = await this.run(`
            INSERT INTO discovery_run_details (
                run_id, source_id, started_at, status
            ) VALUES (?, ?, datetime('now'), 'pending')
        `, [runId, sourceId]);
        
        return result.lastID;
    }
    
    async updateRunDetail(detailId, status, articlesFound, articlesInserted, errorMessage = null) {
        await this.run(`
            UPDATE discovery_run_details SET
                completed_at = datetime('now'),
                status = ?,
                articles_found = ?,
                articles_inserted = ?,
                error_message = ?
            WHERE id = ?
        `, [status, articlesFound, articlesInserted, errorMessage, detailId]);
    }
    
    // ========================================================================
    // DAILY INSIGHTS
    // ========================================================================
    
async insertArticle(article, sourceId, runId) {
    try {
        const result = await this.run(`
            INSERT INTO daily_insights (
                title, 
                url, 
                published_date, 
                discovered_at,
                source_id
            ) VALUES (?, ?, ?, datetime('now'), ?)
        `, [
            article.title,
            article.url,
            article.publishedDate,
            sourceId
        ]);
        
        return result.lastID;
    } catch (error) {
        // Check if duplicate
        if (error.message.includes('UNIQUE')) {
            return null; // Duplicate
        }
        throw error;
    }
}
    
    async getArticlesForScoring(runDate, limit = null) {
        let sql = `
            SELECT * FROM daily_insights 
            WHERE DATE(published_date) = ? 
            AND pmo_score IS NULL
            ORDER BY discovered_at DESC
        `;
        
        if (limit) {
            sql += ` LIMIT ${limit}`;
        }
        
        return await this.all(sql, [runDate]);
    }
    
    async updateArticleScore(articleId, score, pmbok_area, reasoning) {
        await this.run(`
            UPDATE daily_insights SET
                pmo_score = ?,
                pmbok_area = ?,
                pmo_application = ?,
                scoring_date = datetime('now')
            WHERE id = ?
        `, [score, pmbok_area, reasoning, articleId]);
    }
    
    async getTopArticlesForFetch(runDate, limit = 20) {
        return await this.all(`
            SELECT * FROM daily_insights 
            WHERE DATE(published_date) = ? 
            AND pmo_score >= 70
            AND content_fetched = 0
            ORDER BY pmo_score DESC
            LIMIT ?
        `, [runDate, limit]);
    }
    
    async updateArticleContent(articleId, content, contentLength) {
        await this.run(`
            UPDATE daily_insights SET
                full_content = ?,
                content_length = ?,
                content_fetched = 1,
                fetch_status = 'completed',
                fetch_date = datetime('now')
            WHERE id = ?
        `, [content, contentLength, articleId]);
    }
    
    async updateArticleFetchError(articleId, errorMessage) {
        await this.run(`
            UPDATE daily_insights SET
                fetch_status = 'failed',
                fetch_error = ?,
                fetch_date = datetime('now'),
                fetch_attempts = fetch_attempts + 1
            WHERE id = ?
        `, [errorMessage, articleId]);
    }
    
    async getArticlesForKeywords(runDate, limit = 20) {
        return await this.all(`
            SELECT * FROM daily_insights 
            WHERE DATE(published_date) = ? 
            AND pmo_score >= 70
            AND content_fetched = 1
            AND keywords_extracted = 0
            ORDER BY pmo_score DESC
            LIMIT ?
        `, [runDate, limit]);
    }
    
    async insertKeyword(articleId, keyword, category, relevanceScore) {
        await this.run(`
            INSERT INTO article_keywords (
                article_id, keyword, keyword_category, relevance_score
            ) VALUES (?, ?, ?, ?)
        `, [articleId, keyword, category, relevanceScore]);
    }
    
    async markKeywordsExtracted(articleId, keywordCount) {
        await this.run(`
            UPDATE daily_insights SET
                keywords_extracted = 1,
                keyword_count = ?
            WHERE id = ?
        `, [keywordCount, articleId]);
    }
    
    async getArticlesForCards(runDate) {
        return await this.all(`
            SELECT 
                di.*,
                GROUP_CONCAT(ak.keyword, ', ') as keywords
            FROM daily_insights di
            LEFT JOIN article_keywords ak ON di.id = ak.article_id
            WHERE DATE(di.published_date) = ?
            AND di.pmo_score >= 70
            AND di.content_fetched = 1
            GROUP BY di.id
            ORDER BY di.pmo_score DESC
        `, [runDate]);
    }
    
    // ========================================================================
    // PROCESSING PIPELINE
    // ========================================================================
    
    async createPipelineEntry(articleId, runDate) {
        await this.run(`
            INSERT INTO processing_pipeline (
                article_id, run_date, discovered_at
            ) VALUES (?, ?, datetime('now'))
        `, [articleId, runDate]);
    }
    
    async updatePipelineStage(articleId, stage, status, error = null) {
        const errorColumn = stage + '_error';
        const timestampColumn = stage.replace('stage_', '') + '_at';
        
        await this.run(`
            UPDATE processing_pipeline SET
                ${stage} = ?,
                ${timestampColumn} = datetime('now'),
                ${errorColumn} = ?
            WHERE article_id = ?
        `, [status, error, articleId]);
    }
    
    // ========================================================================
    // OPERATIONS LOG
    // ========================================================================
    
async logOperation(operationType, component, status, message, details = null) {
    // Map invalid types to valid ones
    const typeMap = {
        'pipeline-failed': 'error',
        'pipeline-complete': 'manual',
        'discovery': 'manual'
    };
    
    if (typeMap[operationType]) {
        operationType = typeMap[operationType];
    }
    
    await this.run(`
        INSERT INTO operations_log (
            operation_type, component, status, message, details
        ) VALUES (?, ?, ?, ?, ?)
    `, [operationType, component, status, message, details]);
}
    
    // ========================================================================
    // CLOSE
    // ========================================================================
    
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else {
                        console.log('✅ Database closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseManager;