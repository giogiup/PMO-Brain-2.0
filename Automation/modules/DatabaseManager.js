// ============================================================================
// DATABASE MANAGER - All database operations
// ============================================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
    }
    
    // ========================================================================
    // CONNECTION
    // ========================================================================
    
    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) reject(err);
                else {
                    console.log('✅ Database connected');
                    resolve();
                }
            });
        });
    }
    
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
    
    // ========================================================================
    // GENERIC QUERY METHODS
    // ========================================================================
    
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
    
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
    
    // Alias for compatibility with AIProviderRegistry
    async query(sql, params = []) {
        return this.all(sql, params);
    }
    
    // ========================================================================
    // DISCOVERY SOURCES
    // ========================================================================
    
    async getEnabledSources() {
        return await this.all(`
            SELECT * FROM source_registry
            WHERE enabled = 1
            ORDER BY tier, source_name
        `);
    }
    
    async getActiveSources() {
        return await this.all(`
            SELECT * FROM discovery_sources
            WHERE enabled = 1
            ORDER BY tier, name
        `);
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
            UPDATE discovery_run_details
            SET status = ?,
                completed_at = datetime('now'),
                articles_found = ?,
                articles_inserted = ?,
                error_message = ?
            WHERE id = ?
        `, [status, articlesFound, articlesInserted, errorMessage, detailId]);
    }
    
    // ========================================================================
    // SOURCE STATS
    // ========================================================================
    
    async updateSourceStats(sourceId, articlesFound, articlesInserted, success) {
        await this.run(`
            UPDATE source_registry
            SET last_run_date = date('now'),
                total_articles_found = total_articles_found + ?,
                total_articles_inserted = total_articles_inserted + ?,
                last_success_date = CASE WHEN ? = 1 THEN date('now') ELSE last_success_date END,
                consecutive_failures = CASE WHEN ? = 1 THEN 0 ELSE consecutive_failures + 1 END
            WHERE id = ?
        `, [articlesFound, articlesInserted, success ? 1 : 0, success ? 1 : 0, sourceId]);
    }
    
    // ========================================================================
    // DAILY INSIGHTS
    // ========================================================================
    
    async insertArticle(article, sourceId, runId) {
        try {
            const result = await this.run(`
                INSERT INTO daily_insights (
                    title, url, published_date, discovered_at,
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
    
   async createPipelineEntry(articleId, publishedDate) {
    try {
        await this.run(`
            INSERT INTO processing_pipeline (
                article_id, 
                run_date, 
                stage_discovery,
                discovered_at
            ) VALUES (?, ?, 'completed', datetime('now'))
        `, [articleId, publishedDate]);
    } catch (error) {
        // Ignore if already exists
        if (!error.message.includes('UNIQUE')) {
            throw error;
        }
    }
}
    
    // ========================================================================
    // PROMPT TEMPLATES
    // ========================================================================
    
    async getActivePrompt(promptType) {
        const prompt = await this.get(`
            SELECT id, prompt_type, version, prompt_text, performance_notes
            FROM prompt_templates
            WHERE prompt_type = ?
            AND is_active = 1
        `, [promptType]);
        
        if (!prompt) {
            throw new Error(`No active prompt found for type: ${promptType}`);
        }
        
        return prompt;
    }
    
    async savePrompt(promptType, version, promptText, notes, createdBy = 'user') {
        // Deactivate current active prompt of this type
        await this.run(`
            UPDATE prompt_templates
            SET is_active = 0
            WHERE prompt_type = ?
        `, [promptType]);
        
        // Insert new prompt as active
        const result = await this.run(`
            INSERT INTO prompt_templates (
                prompt_type, version, prompt_text, is_active, notes, created_by
            ) VALUES (?, ?, ?, 1, ?, ?)
        `, [promptType, version, promptText, notes, createdBy]);
        
        return result.lastID;
    }
    
    async setActivePrompt(promptType, version) {
        // Deactivate all prompts of this type
        await this.run(`
            UPDATE prompt_templates
            SET is_active = 0
            WHERE prompt_type = ?
        `, [promptType]);
        
        // Activate the specified version
        await this.run(`
            UPDATE prompt_templates
            SET is_active = 1
            WHERE prompt_type = ?
            AND version = ?
        `, [promptType, version]);
    }
    
    async getPromptHistory(promptType, limit = 20) {
        return await this.all(`
            SELECT 
                id, version, is_active, 
                avg_score_produced, articles_processed,
                created_at, created_by, notes
            FROM prompt_templates
            WHERE prompt_type = ?
            ORDER BY created_at DESC
            LIMIT ?
        `, [promptType, limit]);
    }
    
    async logPromptPerformance(promptId, avgScore, articlesProcessed) {
        await this.run(`
            UPDATE prompt_templates
            SET avg_score_produced = ?,
                articles_processed = articles_processed + ?
            WHERE id = ?
        `, [avgScore, articlesProcessed, promptId]);
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
}

module.exports = DatabaseManager;