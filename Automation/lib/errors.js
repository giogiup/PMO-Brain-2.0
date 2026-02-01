/**
 * Standardized Error Types and Classes
 * CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 2
 *
 * @module lib/errors
 * @description Provides typed error classes for consistent error handling
 * across all pipeline modules. All errors include type, module, context.
 *
 * @example
 * const { ValidationError, ExternalAPIError } = require('./lib/errors');
 *
 * if (!data.url) {
 *   throw new ValidationError('ContentFetcher', 'Missing URL field', null);
 * }
 *
 * if (response.status !== 200) {
 *   throw new ExternalAPIError('ScoringEngine', 'API failed', 'groq', response.status);
 * }
 */

/**
 * Error type constants
 * @enum {string}
 */
const ERROR_TYPES = {
    VALIDATION: 'VALIDATION',
    EXTERNAL_API: 'EXTERNAL_API',
    TIMEOUT: 'TIMEOUT',
    PARSING: 'PARSING',
    DATABASE: 'DATABASE',
    NETWORK: 'NETWORK',
    RATE_LIMIT: 'RATE_LIMIT',
    CIRCUIT_OPEN: 'CIRCUIT_OPEN'
};

/**
 * Human-readable error descriptions by type
 * @type {Object.<string, string>}
 */
const ERROR_DESCRIPTIONS = {
    VALIDATION: 'Input/output schema violation',
    EXTERNAL_API: 'Third-party API failure',
    TIMEOUT: 'Operation exceeded time limit',
    PARSING: 'Data format parsing failed',
    DATABASE: 'Database operation failed',
    NETWORK: 'Network connection failed',
    RATE_LIMIT: 'API rate limit exceeded',
    CIRCUIT_OPEN: 'Circuit breaker is open'
};

/**
 * Base error class for all pipeline errors
 * @class
 * @extends Error
 */
class EngineError extends Error {
    /**
     * Creates a new EngineError
     * @constructor
     * @param {string} type - One of ERROR_TYPES
     * @param {string} module - Module name where error occurred
     * @param {string} message - Error message
     * @param {Object} [context={}] - Additional context data
     */
    constructor(type, module, message, context = {}) {
        super(message);
        this.name = 'EngineError';
        /** @type {string} Error type from ERROR_TYPES */
        this.type = type;
        /** @type {string} Module where error occurred */
        this.module = module;
        /** @type {Object} Additional context data */
        this.context = context;
        /** @type {string} ISO timestamp of error */
        this.timestamp = new Date().toISOString();
        /** @type {string} Human-readable description */
        this.description = ERROR_DESCRIPTIONS[type] || 'Unknown error';
    }

    /**
     * Convert error to JSON for logging/storage
     * @returns {Object} JSON representation
     */
    toJSON() {
        return {
            name: this.name,
            type: this.type,
            module: this.module,
            message: this.message,
            description: this.description,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }

    /**
     * Get formatted log string
     * @returns {string} Log-friendly string
     */
    toLogString() {
        return `[${this.type}] ${this.module}: ${this.message}`;
    }
}

/**
 * Error for schema validation failures
 * @class
 * @extends EngineError
 */
class ValidationError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {Array|null} schemaErrors - Ajv validation errors
     */
    constructor(module, message, schemaErrors) {
        super(ERROR_TYPES.VALIDATION, module, message, { schemaErrors });
    }
}

/**
 * Error for third-party API failures
 * @class
 * @extends EngineError
 */
class ExternalAPIError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {string} provider - API provider name (groq, google, etc.)
     * @param {number} statusCode - HTTP status code
     */
    constructor(module, message, provider, statusCode) {
        super(ERROR_TYPES.EXTERNAL_API, module, message, { provider, statusCode });
    }
}

/**
 * Error for operation timeouts
 * @class
 * @extends EngineError
 */
class TimeoutError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {number} timeoutMs - Timeout value in milliseconds
     */
    constructor(module, message, timeoutMs) {
        super(ERROR_TYPES.TIMEOUT, module, message, { timeoutMs });
    }
}

/**
 * Error for data parsing failures
 * @class
 * @extends EngineError
 */
class ParsingError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {*} rawData - Raw data that failed to parse (truncated to 200 chars)
     */
    constructor(module, message, rawData) {
        super(ERROR_TYPES.PARSING, module, message, { rawData: String(rawData).substring(0, 200) });
    }
}

/**
 * Error for database operation failures
 * @class
 * @extends EngineError
 */
class DatabaseError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {string} query - SQL query that failed
     */
    constructor(module, message, query) {
        super(ERROR_TYPES.DATABASE, module, message, { query });
    }
}

/**
 * Error for API rate limit exceeded
 * @class
 * @extends EngineError
 */
class RateLimitError extends EngineError {
    /**
     * @param {string} module - Module name
     * @param {string} message - Error message
     * @param {string} provider - API provider name
     * @param {number|string} resetTime - Time until rate limit resets
     */
    constructor(module, message, provider, resetTime) {
        super(ERROR_TYPES.RATE_LIMIT, module, message, { provider, resetTime });
    }
}

/**
 * Error when circuit breaker is open
 * @class
 * @extends EngineError
 */
class CircuitOpenError extends EngineError {
    /**
     * @param {string} module - Module/circuit name
     * @param {string} message - Error message
     */
    constructor(module, message) {
        super(ERROR_TYPES.CIRCUIT_OPEN, module, message);
    }
}

module.exports = {
    ERROR_TYPES,
    ERROR_DESCRIPTIONS,
    EngineError,
    ValidationError,
    ExternalAPIError,
    TimeoutError,
    ParsingError,
    DatabaseError,
    RateLimitError,
    CircuitOpenError
};
