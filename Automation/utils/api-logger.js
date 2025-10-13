/**
 * API Logger Utility
 * Helper functions to log operations and statistics from pipeline modules
 * 
 * Usage in pipeline modules:
 * const { logOperation, logStatistics, getPrefilterConfig } = require('./utils/api-logger');
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

/**
 * Log an operation to the operations log
 * 
 * @param {string} operation - Operation name (e.g., 'Discovery', 'Scoring', 'Enrichment')
 * @param {string} component - Component name (e.g., 'DiscoveryEngine', 'ScoringEngine')
 * @param {string} status - Status ('Success', 'Failed', 'Running', 'Pending')
 * @param {string} message - Descriptive message
 * @param {number} records - Number of records processed
 * @param {number} duration - Duration in milliseconds
 * @param {object} details - Additional details (optional)
 */
async function logOperation(operation, component, status, message, records = 0, duration = 0, details = {}) {
    try {
        // Skip logging if in test mode or if fetch not available
        if (process.env.SKIP_API_LOGGING === 'true') {
            return;
        }

        const fetch = await import('node-fetch').then(mod => mod.default);
        
        const response = await fetch(`${API_BASE}/operations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                operation,
                component,
                status,
                message,
                records,
                duration,
                details
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to log operation:', errorText);
        }
    } catch (error) {
        // Silently fail if API is not available
        // This prevents pipeline from breaking if console API is down
        console.debug('Could not log operation:', error.message);
    }
}

/**
 * Log statistics for a discovery run
 * 
 * @param {object} stats - Statistics object
 * @param {string} stats.run_date - ISO date string
 * @param {number} stats.articles_discovered - Total articles found
 * @param {number} stats.articles_approved - Articles that passed pre-filter
 * @param {number} stats.articles_rejected - Articles that failed pre-filter
 * @param {number} stats.articles_scored - Articles that were scored
 * @param {number} stats.avg_score - Average score
 * @param {number} stats.duration - Duration in milliseconds
 * @param {object} stats.details - Additional details (optional)
 */
async function logStatistics(stats) {
    try {
        if (process.env.SKIP_API_LOGGING === 'true') {
            return;
        }

        const fetch = await import('node-fetch').then(mod => mod.default);
        
        const response = await fetch(`${API_BASE}/statistics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                run_date: stats.run_date || new Date().toISOString(),
                articles_discovered: stats.articles_discovered || 0,
                articles_approved: stats.articles_approved || 0,
                articles_rejected: stats.articles_rejected || 0,
                articles_scored: stats.articles_scored || 0,
                avg_score: stats.avg_score || 0,
                duration: stats.duration || 0,
                details: stats.details || {}
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to log statistics:', errorText);
        }
    } catch (error) {
        console.debug('Could not log statistics:', error.message);
    }
}

/**
 * Get pre-filter configuration from API
 * 
 * @returns {Promise<object>} Pre-filter configuration object
 */
async function getPrefilterConfig() {
    try {
        const fetch = await import('node-fetch').then(mod => mod.default);
        
        const response = await fetch(`${API_BASE}/prefilter/config`);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching pre-filter config:', error.message);
        
        // Return defaults if API unavailable
        return {
            required_keywords: ['ai', 'automation', 'pmo', 'project management'],
            excluded_keywords: ['spam', 'crypto', 'gambling'],
            allowed_domains: [],
            blocked_domains: [],
            min_score: 70,
            max_age: 24,
            min_content_length: 200,
            enable_duplicate_detection: true,
            language_filter: 'en'
        };
    }
}

/**
 * Add backlog item
 * 
 * @param {string} priority - Priority level ('Critical', 'High', 'Medium', 'Low')
 * @param {string} category - Category (e.g., 'Website', 'Discovery Engine')
 * @param {string} description - Item description
 * @param {string} notes - Additional notes (optional)
 */
async function addBacklogItem(priority, category, description, notes = '') {
    try {
        if (process.env.SKIP_API_LOGGING === 'true') {
            return;
        }

        const fetch = await import('node-fetch').then(mod => mod.default);
        
        const response = await fetch(`${API_BASE}/backlog`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priority,
                category,
                description,
                notes
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to add backlog item:', errorText);
        } else {
            console.log(`✅ Backlog item added: ${description}`);
        }
    } catch (error) {
        console.debug('Could not add backlog item:', error.message);
    }
}

/**
 * Log the start of a pipeline operation
 * Returns a function to call when operation completes
 * 
 * Usage:
 * const logComplete = await logOperationStart('Discovery', 'DiscoveryEngine', 'Starting discovery');
 * // ... do work ...
 * await logComplete('Success', 'Discovered 100 articles', 100);
 */
async function logOperationStart(operation, component, message) {
    const startTime = Date.now();
    
    // Log start
    await logOperation(operation, component, 'Running', message);
    
    // Return completion function
    return async function logComplete(status, completionMessage, records = 0, details = {}) {
        const duration = Date.now() - startTime;
        await logOperation(
            operation,
            component,
            status,
            completionMessage,
            records,
            duration,
            details
        );
    };
}

/**
 * Wrap an async function with automatic operation logging
 * 
 * Usage:
 * const wrappedFunction = withOperationLogging(
 *   'Discovery',
 *   'DiscoveryEngine',
 *   async () => { ... }
 * );
 */
function withOperationLogging(operation, component, asyncFn) {
    return async (...args) => {
        const startTime = Date.now();
        
        try {
            await logOperation(operation, component, 'Running', `Starting ${operation}`);
            
            const result = await asyncFn(...args);
            const duration = Date.now() - startTime;
            
            await logOperation(
                operation,
                component,
                'Success',
                `Completed ${operation}`,
                Array.isArray(result) ? result.length : 1,
                duration
            );
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            
            await logOperation(
                operation,
                component,
                'Failed',
                error.message,
                0,
                duration,
                { error: error.stack }
            );
            
            throw error;
        }
    };
}

module.exports = {
    logOperation,
    logStatistics,
    getPrefilterConfig,
    addBacklogItem,
    logOperationStart,
    withOperationLogging
};