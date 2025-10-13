// ============================================================================
// AI ROUTER - Smart Waterfall Failover Logic
// ============================================================================
// Routes requests to available AI providers with automatic failover
// Tracks usage, handles errors, logs everything to database
// ============================================================================

const AIProviderRegistry = require('./AIProviderRegistry');
const AIProviderAdapter = require('./AIProviderAdapter');

class AIRouter {
    constructor(dbManager, useCase = 'scoring') {
        this.registry = new AIProviderRegistry(dbManager);
        this.useCase = useCase;
        this.db = dbManager;
    }

    /**
     * Complete a request with automatic failover
     * @param {Array} messages - Chat messages
     * @param {Object} options - Completion options
     * @param {number} articleId - Article ID for logging
     * @returns {Promise<Object>} Response with content and metadata
     */
    async complete(messages, options = {}, articleId = null) {
        // Get all available providers for this use case
        const providers = await this.registry.getProviders(this.useCase);

        if (providers.length === 0) {
            throw new Error(`No providers configured for ${this.useCase}`);
        }

        let lastError = null;
        let attempts = 0;

        // Try each provider in priority order until one succeeds
        for (const providerConfig of providers) {
            attempts++;

            // Skip if provider has exceeded daily limit
            if (providerConfig.current_usage >= providerConfig.daily_article_limit) {
                console.log(`⏭️  ${providerConfig.provider_name} - Daily limit reached (${providerConfig.current_usage}/${providerConfig.daily_article_limit})`);
                continue;
            }

            try {
                console.log(`🔄 Attempt ${attempts}: Trying ${providerConfig.provider_name}...`);
                
                // Create adapter for this provider
                const adapter = new AIProviderAdapter(providerConfig);
                
                // Make API call
                const result = await adapter.complete(messages, options);

                if (result.success) {
                    // Calculate cost
                    const cost = AIProviderAdapter.calculateCost(
                        result.tokens_input,
                        result.tokens_output,
                        providerConfig
                    );

                    // Log usage
                    await this.registry.logUsage({
                        provider_name: providerConfig.provider_name,
                        task_type: this.useCase,
                        article_id: articleId,
                        tokens_input: result.tokens_input,
                        tokens_output: result.tokens_output,
                        cost_usd: cost,
                        success: true,
                        response_time_ms: result.response_time_ms
                    });

                    // Increment usage counter
                    await this.registry.incrementUsage(providerConfig.provider_name, 1);

                    // Success!
                    const costWarning = providerConfig.cost_tier === 'paid' ? ' 💰 PAID' : '';
                    console.log(`✅ ${providerConfig.provider_name}${costWarning} - Success (${result.response_time_ms}ms, ${result.tokens_input + result.tokens_output} tokens)`);
                    if (cost > 0) {
                        console.log(`   💵 Cost: $${cost.toFixed(4)}`);
                    }

                    return {
                        ...result,
                        cost_usd: cost,
                        attempts: attempts,
                        final_provider: providerConfig.provider_name
                    };
                }

                // API call failed but no exception
                lastError = result.error;
                
                // Log failure
                await this.registry.logUsage({
                    provider_name: providerConfig.provider_name,
                    task_type: this.useCase,
                    article_id: articleId,
                    success: false,
                    error_message: result.error,
                    response_time_ms: result.response_time_ms
                });

                console.log(`❌ ${providerConfig.provider_name} - Failed: ${result.error}`);

            } catch (error) {
                lastError = error.message;
                
                // Log failure
                await this.registry.logUsage({
                    provider_name: providerConfig.provider_name,
                    task_type: this.useCase,
                    article_id: articleId,
                    success: false,
                    error_message: error.message
                });

                console.log(`❌ ${providerConfig.provider_name} - Error: ${error.message}`);
            }
        }

        // All providers failed
        throw new Error(`All providers failed for ${this.useCase}. Last error: ${lastError}`);
    }

    /**
     * Get current usage status for all providers
     * @returns {Promise<Array>} Provider status array
     */
    async getStatus() {
        const stats = await this.registry.getUsageStats(this.useCase);
        return stats.map(provider => ({
            provider: provider.provider_name,
            usage: `${provider.current_usage}/${provider.daily_article_limit}`,
            percent: `${provider.usage_percent}%`,
            available: provider.current_usage < provider.daily_article_limit,
            cost_tier: provider.cost_tier,
            enabled: provider.enabled === 1
        }));
    }

    /**
     * Reset all usage counters (for testing)
     */
    async resetUsage() {
        await this.registry.resetDailyUsageIfNeeded();
        console.log('✅ Usage counters reset');
    }

    /**
     * Get usage report for date range
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} Usage report
     */
    async getUsageReport(startDate, endDate) {
        return await this.registry.getUsageReport(startDate, endDate);
    }

    /**
     * Test all provider connections
     * @returns {Promise<Object>} Test results for all providers
     */
    async testAllProviders() {
        const providers = await this.registry.getProviders(this.useCase);
        const results = {};

        for (const providerConfig of providers) {
            try {
                const adapter = new AIProviderAdapter(providerConfig);
                const success = await adapter.testConnection();
                results[providerConfig.provider_name] = {
                    success,
                    message: success ? 'Connection successful' : 'Connection failed'
                };
            } catch (error) {
                results[providerConfig.provider_name] = {
                    success: false,
                    message: error.message
                };
            }
        }

        return results;
    }
}

module.exports = AIRouter;
