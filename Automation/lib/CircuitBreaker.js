/**
 * Circuit Breaker Pattern
 * CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 4
 *
 * @module lib/CircuitBreaker
 * @description Implements the circuit breaker pattern for external API resilience.
 * Prevents cascade failures by failing fast when a service is unavailable.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered
 *
 * @example
 * const { registry } = require('./lib/CircuitBreaker');
 *
 * const breaker = registry.get('groq-api', { threshold: 3, resetTimeout: 30000 });
 * const result = await breaker.execute(async () => {
 *   return await callGroqAPI();
 * });
 */

const { CircuitOpenError } = require('./errors');

/**
 * Circuit breaker states
 * @enum {string}
 */
const STATES = {
    CLOSED: 'closed',
    OPEN: 'open',
    HALF_OPEN: 'half-open'
};

/**
 * CircuitBreaker class implements the circuit breaker pattern
 * @class
 */
class CircuitBreaker {
    /**
     * Creates a new CircuitBreaker instance
     * @constructor
     * @param {Object} options - Configuration options
     * @param {string} [options.name='default'] - Name of the circuit breaker
     * @param {number} [options.threshold=3] - Number of failures before opening
     * @param {number} [options.resetTimeout=30000] - Time in ms before trying half-open
     * @param {number} [options.halfOpenMax=1] - Successes needed to close from half-open
     */
    constructor(options = {}) {
        this.name = options.name || 'default';
        this.threshold = options.threshold || 3;
        this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
        this.halfOpenMax = options.halfOpenMax || 1;

        /** @type {string} Current state of the circuit */
        this.state = STATES.CLOSED;
        /** @type {number} Consecutive failure count */
        this.failures = 0;
        /** @type {number} Success count in half-open state */
        this.successes = 0;
        /** @type {Object|null} Last failure details */
        this.lastFailure = null;
        /** @type {number|null} Timestamp when circuit was opened */
        this.openedAt = null;
    }

    /**
     * Execute a function through the circuit breaker
     * @async
     * @param {Function} fn - Async function to execute
     * @returns {Promise<*>} Result of the function
     * @throws {CircuitOpenError} If circuit is open
     * @throws {Error} If the function throws
     */
    async execute(fn) {
        if (this.state === STATES.OPEN) {
            // Check if we should try half-open
            if (Date.now() - this.openedAt >= this.resetTimeout) {
                this.state = STATES.HALF_OPEN;
                this.successes = 0;
            } else {
                throw new CircuitOpenError(
                    this.name,
                    `Circuit breaker open for ${this.name} - ${this.failures} consecutive failures`
                );
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error);
            throw error;
        }
    }

    /**
     * Handle successful execution
     * @private
     */
    onSuccess() {
        this.failures = 0;
        this.lastFailure = null;

        if (this.state === STATES.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.halfOpenMax) {
                this.state = STATES.CLOSED;
                this.openedAt = null;
            }
        }
    }

    /**
     * Handle failed execution
     * @private
     * @param {Error} error - The error that occurred
     */
    onFailure(error) {
        this.failures++;
        this.lastFailure = {
            error: error.message,
            timestamp: new Date().toISOString()
        };

        if (this.failures >= this.threshold) {
            this.state = STATES.OPEN;
            this.openedAt = Date.now();
        }
    }

    /**
     * Manually reset the circuit to closed state
     */
    reset() {
        this.state = STATES.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.lastFailure = null;
        this.openedAt = null;
    }

    /**
     * Get current circuit status
     * @returns {Object} Status object with state, failures, etc.
     */
    getStatus() {
        return {
            name: this.name,
            state: this.state,
            failures: this.failures,
            threshold: this.threshold,
            lastFailure: this.lastFailure,
            openedAt: this.openedAt
        };
    }

    /**
     * Check if circuit is open
     * @returns {boolean}
     */
    isOpen() {
        return this.state === STATES.OPEN;
    }

    /**
     * Check if circuit is closed
     * @returns {boolean}
     */
    isClosed() {
        return this.state === STATES.CLOSED;
    }
}

/**
 * Registry for managing multiple circuit breakers
 * @class
 */
class CircuitBreakerRegistry {
    /**
     * Creates a new registry
     * @constructor
     */
    constructor() {
        /** @type {Object.<string, CircuitBreaker>} Map of breakers by name */
        this.breakers = {};
    }

    /**
     * Get or create a circuit breaker by name
     * @param {string} name - Name of the circuit breaker
     * @param {Object} [options] - Options to pass if creating new breaker
     * @returns {CircuitBreaker} The circuit breaker instance
     */
    get(name, options = {}) {
        if (!this.breakers[name]) {
            this.breakers[name] = new CircuitBreaker({ name, ...options });
        }
        return this.breakers[name];
    }

    /**
     * Get status of all circuit breakers
     * @returns {Array<Object>} Array of status objects
     */
    getAll() {
        return Object.values(this.breakers).map(b => b.getStatus());
    }

    /**
     * Reset all circuit breakers
     */
    resetAll() {
        Object.values(this.breakers).forEach(b => b.reset());
    }
}

/** @type {CircuitBreakerRegistry} Singleton registry instance */
const registry = new CircuitBreakerRegistry();

module.exports = {
    CircuitBreaker,
    CircuitBreakerRegistry,
    registry,
    STATES
};
