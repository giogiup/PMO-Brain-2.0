// ============================================================================
// AI PROVIDER REGISTRY - Database-Driven Provider Management
// ============================================================================
// Manages AI provider configurations from database
// Handles provider selection, rate limiting, and failover logic
// ============================================================================

const path = require('path');

class AIProviderRegistry {
    constructor(dbManager) {
        this.db = dbManager;
    }

    /**
     * Get all enabled providers for a specific use case, ordered by priority
     * @param {string} useCase - 'scoring' or 'enrichment'
     * @returns {Promise<Array>} Enabled providers sorted by priority
     */
    async getProviders(useCase = 'scoring') {
        const query = `
            SELECT * FROM ai_providers 
            WHERE use_case = ? AND enabled = 1 
            ORDER BY priority ASC
        `;
        return await this.db.query(query, [useCase]);
    }

    /**
     * Get next available provider that hasn't exceeded daily limit
     * @param {string} useCase - 'scoring' or 'enrichment'
     * @returns {Promise<Object|null>} Next available provider or null
     */
    async getNextAvailableProvider(useCase = 'scoring') {
        // Reset usage counters if new day
        await this.resetDailyUsageIfNeeded();

        const query = `
            SELECT * FROM ai_providers 
            WHERE use_case = ? 
            AND enabled = 1 
            AND current_usage < daily_article_limit
            ORDER BY priority ASC
            LIMIT 1
        `;
        const providers = await this.db.query(query, [useCase]);
        return providers.length > 0 ? providers[0] : null;
    }

    /**
     * Increment usage counter for a provider
     * @param {string} providerName - Name of the provider
     * @param {number} articles - Number of articles processed (default 1)
     */
    async incrementUsage(providerName, articles = 1) {
        const query = `
            UPDATE ai_providers 
            SET current_usage = current_usage + ?
            WHERE provider_name = ?
        `;
        await this.db.query(query, [articles, providerName]);
    }

    /**
     * Reset daily usage counters if new day has started
     */
    async resetDailyUsageIfNeeded() {
        const today = new Date().toISOString().split('T')[0];
        
        const query = `
            SELECT DISTINCT last_reset_date FROM ai_providers 
            WHERE last_reset_date IS NOT NULL 
            LIMIT 1
        `;
        const result = await this.db.query(query);
        const lastReset = result.length > 0 ? result[0].last_reset_date : null;

        if (lastReset !== today) {
            // New day - reset all counters
            const resetQuery = `
                UPDATE ai_providers 
                SET current_usage = 0, 
                    last_reset_date = ?
            `;
            await this.db.query(resetQuery, [today]);
            console.log(`✅ Daily usage counters reset for ${today}`);
        }
    }

    /**
     * Get current usage stats for all providers
     * @param {string} useCase - 'scoring' or 'enrichment'
     * @returns {Promise<Array>} Provider usage statistics
     */
    async getUsageStats(useCase = 'scoring') {
        const query = `
            SELECT 
                provider_name,
                current_usage,
                daily_article_limit,
                ROUND((CAST(current_usage AS FLOAT) / daily_article_limit) * 100, 1) as usage_percent,
                cost_tier,
                enabled
            FROM ai_providers 
            WHERE use_case = ?
            ORDER BY priority ASC
        `;
        return await this.db.query(query, [useCase]);
    }

    /**
     * Get provider by name
     * @param {string} providerName - Provider name
     * @param {string} useCase - 'scoring' or 'enrichment'
     * @returns {Promise<Object|null>} Provider config or null
     */
    async getProvider(providerName, useCase = 'scoring') {
        const query = `
            SELECT * FROM ai_providers 
            WHERE provider_name = ? AND use_case = ?
            LIMIT 1
        `;
        const providers = await this.db.query(query, [providerName, useCase]);
        return providers.length > 0 ? providers[0] : null;
    }

    /**
     * Enable or disable a provider
     * @param {string} providerName - Provider name
     * @param {boolean} enabled - Enable state
     */
    async setProviderEnabled(providerName, enabled) {
        const query = `
            UPDATE ai_providers 
            SET enabled = ?
            WHERE provider_name = ?
        `;
        await this.db.query(query, [enabled ? 1 : 0, providerName]);
    }

    /**
     * Log API usage to database
     * @param {Object} logData - Usage log data
     */
    async logUsage(logData) {
        const {
            provider_name,
            task_type,
            article_id = null,
            tokens_input = 0,
            tokens_output = 0,
            cost_usd = 0,
            success = true,
            error_message = null,
            response_time_ms = 0
        } = logData;

        const query = `
            INSERT INTO ai_usage_log 
            (provider_name, use_case, article_id, tokens_input, tokens_output, 
             cost, success, error_message, response_time_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `;

        await this.db.query(query, [
            provider_name,
            task_type,
            article_id,
            tokens_input,
            tokens_output,
            cost_usd,
            success ? 1 : 0,
            error_message,
            response_time_ms
        ]);
    }

    /**
     * Get usage statistics for a date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} Usage statistics
     */
    async getUsageReport(startDate, endDate) {
        const query = `
            SELECT 
                provider_name,
                use_case as task_type,
                COUNT(*) as total_calls,
                SUM(tokens_input) as total_input_tokens,
                SUM(tokens_output) as total_output_tokens,
                SUM(cost) as total_cost,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_calls,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_calls,
                created_at as timestamp
            FROM ai_usage_log
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY provider_name, use_case
            ORDER BY provider_name, use_case
        `;
        return await this.db.query(query, [startDate, endDate]);
    }
}

module.exports = AIProviderRegistry;
