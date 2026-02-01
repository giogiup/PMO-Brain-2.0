#!/usr/bin/env node
// ============================================================================
// PIPELINE EVENTS - Event System for Real-Time Monitoring
// CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 3 (Health Checks)
// ============================================================================

const EventEmitter = require('events');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const path = require('path');
const fs = require('fs');

/**
 * Pipeline Event Types
 */
const EVENT_TYPES = {
    PIPELINE_START: 'pipeline.start',
    STAGE_START: 'stage.start',
    STAGE_PROGRESS: 'stage.progress',
    STAGE_COMPLETE: 'stage.complete',
    STAGE_ERROR: 'stage.error',
    STAGE_WARNING: 'stage.warning',
    PIPELINE_COMPLETE: 'pipeline.complete',
    LOG: 'log'
};

/**
 * Stage IDs
 */
const STAGES = {
    DISCOVERY: 'discovery',
    PREFILTER: 'prefilter',
    SCORING: 'scoring',
    FETCH: 'fetch',
    ENRICH: 'enrich',
    DISPLAY: 'display',
    CARDS: 'cards'
};

/**
 * Severity Levels
 */
const SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical'
};

/**
 * Transport Types
 */
const TRANSPORT = {
    CONSOLE: 'console',
    IPC: 'ipc',
    CALLBACK: 'callback'
};

/**
 * PipelineEvents - Event emitter with validation and transport
 */
class PipelineEvents extends EventEmitter {
    constructor(options = {}) {
        super();

        this.transport = options.transport || TRANSPORT.CONSOLE;
        this.validateEvents = options.validate !== false;
        this.callback = options.callback || null;
        this.startTime = null;
        this.stageStartTimes = {};
        this.stats = {
            errors: 0,
            warnings: 0,
            stages: {}
        };

        // Initialize Ajv for validation
        if (this.validateEvents) {
            this.ajv = new Ajv({ allErrors: true, strict: false });
            addFormats(this.ajv);

            // Load schema
            const schemaPath = path.join(__dirname, '../schemas/pipeline-events.schema.json');
            if (fs.existsSync(schemaPath)) {
                const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
                this.validate = this.ajv.compile(schema);
            } else {
                console.warn('PipelineEvents: Schema not found, validation disabled');
                this.validateEvents = false;
            }
        }
    }

    /**
     * Create timestamp
     */
    timestamp() {
        return new Date().toISOString();
    }

    /**
     * Send event via configured transport
     */
    send(event) {
        // Validate if enabled
        if (this.validateEvents && this.validate) {
            const valid = this.validate(event);
            if (!valid) {
                console.error('PipelineEvents: Invalid event', this.validate.errors);
                // Still send, but log warning
            }
        }

        // Emit locally
        this.emit(event.type, event);
        this.emit('event', event);

        // Transport
        switch (this.transport) {
            case TRANSPORT.IPC:
                if (process.send) {
                    process.send(event);
                }
                break;

            case TRANSPORT.CALLBACK:
                if (this.callback && typeof this.callback === 'function') {
                    this.callback(event);
                }
                break;

            case TRANSPORT.CONSOLE:
            default:
                this.logToConsole(event);
                break;
        }

        return event;
    }

    /**
     * Log event to console (formatted)
     */
    logToConsole(event) {
        const ts = event.timestamp.split('T')[1].split('.')[0];

        switch (event.type) {
            case EVENT_TYPES.PIPELINE_START:
                console.log(`\n[${ts}] 🚀 Pipeline started (${event.data.mode} mode)`);
                break;

            case EVENT_TYPES.STAGE_START:
                console.log(`[${ts}] ▶️  ${event.data.stage.toUpperCase()} starting...`);
                break;

            case EVENT_TYPES.STAGE_PROGRESS:
                const pct = event.data.percent || Math.round((event.data.current / event.data.total) * 100);
                process.stdout.write(`\r[${ts}] ⏳ ${event.data.stage}: ${event.data.current}/${event.data.total} (${pct}%) ${event.data.message || ''}`);
                break;

            case EVENT_TYPES.STAGE_COMPLETE:
                console.log(`\n[${ts}] ✅ ${event.data.stage.toUpperCase()} complete: ${event.data.successful}/${event.data.total} successful`);
                if (event.data.failed > 0) {
                    console.log(`   ❌ ${event.data.failed} failed`);
                }
                if (event.data.warnings > 0) {
                    console.log(`   ⚠️  ${event.data.warnings} warnings`);
                }
                break;

            case EVENT_TYPES.STAGE_ERROR:
                console.error(`\n[${ts}] ❌ ${event.data.stage}: ${event.data.message}`);
                if (event.data.context?.stack) {
                    console.error(`   Stack: ${event.data.context.stack.split('\n')[0]}`);
                }
                break;

            case EVENT_TYPES.STAGE_WARNING:
                console.warn(`[${ts}] ⚠️  ${event.data.stage}: ${event.data.message}`);
                break;

            case EVENT_TYPES.PIPELINE_COMPLETE:
                const status = event.data.success ? '✅ SUCCESS' : '❌ FAILED';
                console.log(`\n[${ts}] 🏁 Pipeline ${status}`);
                console.log(`   Duration: ${(event.data.duration / 1000).toFixed(1)}s`);
                console.log(`   Cards: ${event.data.cardsGenerated || 0}`);
                if (event.data.errors > 0) console.log(`   Errors: ${event.data.errors}`);
                if (event.data.warnings > 0) console.log(`   Warnings: ${event.data.warnings}`);
                break;

            case EVENT_TYPES.LOG:
                const icons = { debug: '🔍', info: 'ℹ️ ', warn: '⚠️ ', error: '❌' };
                console.log(`[${ts}] ${icons[event.data.level] || ''} ${event.data.message}`);
                break;
        }
    }

    // =========================================================================
    // HIGH-LEVEL API
    // =========================================================================

    /**
     * Pipeline started
     */
    pipelineStart(mode = 'manual', runId = null) {
        this.startTime = Date.now();
        this.stats = { errors: 0, warnings: 0, stages: {} };

        return this.send({
            type: EVENT_TYPES.PIPELINE_START,
            timestamp: this.timestamp(),
            data: {
                runId,
                date: new Date().toISOString().split('T')[0],
                mode
            }
        });
    }

    /**
     * Stage started
     */
    stageStart(stage, total = null) {
        this.stageStartTimes[stage] = Date.now();
        this.stats.stages[stage] = { total: 0, successful: 0, failed: 0, warnings: 0 };

        return this.send({
            type: EVENT_TYPES.STAGE_START,
            timestamp: this.timestamp(),
            data: { stage, total }
        });
    }

    /**
     * Stage progress update
     */
    stageProgress(stage, current, total, message = '') {
        const percent = Math.round((current / total) * 100);

        return this.send({
            type: EVENT_TYPES.STAGE_PROGRESS,
            timestamp: this.timestamp(),
            data: { stage, current, total, message, percent }
        });
    }

    /**
     * Stage completed
     */
    stageComplete(stage, results = {}) {
        const duration = this.stageStartTimes[stage]
            ? Date.now() - this.stageStartTimes[stage]
            : 0;

        const data = {
            stage,
            total: results.total || 0,
            successful: results.successful || results.total || 0,
            failed: results.failed || 0,
            warnings: results.warnings || 0,
            duration
        };

        // Update stats
        this.stats.stages[stage] = data;

        return this.send({
            type: EVENT_TYPES.STAGE_COMPLETE,
            timestamp: this.timestamp(),
            data
        });
    }

    /**
     * Stage error
     */
    stageError(stage, error) {
        this.stats.errors++;
        if (this.stats.stages[stage]) {
            this.stats.stages[stage].failed++;
        }

        const data = {
            stage,
            severity: error.severity || SEVERITY.ERROR,
            errorType: error.type || error.name || 'UnknownError',
            message: error.message || String(error),
            context: {
                articleId: error.articleId || null,
                articleTitle: error.articleTitle || null,
                source: error.source || null,
                stack: error.stack || null
            }
        };

        return this.send({
            type: EVENT_TYPES.STAGE_ERROR,
            timestamp: this.timestamp(),
            data
        });
    }

    /**
     * Stage warning
     */
    stageWarning(stage, warning) {
        this.stats.warnings++;
        if (this.stats.stages[stage]) {
            this.stats.stages[stage].warnings++;
        }

        return this.send({
            type: EVENT_TYPES.STAGE_WARNING,
            timestamp: this.timestamp(),
            data: {
                stage,
                warningType: warning.type || 'Warning',
                message: warning.message || String(warning),
                context: {
                    articleId: warning.articleId || null,
                    articleTitle: warning.articleTitle || null,
                    source: warning.source || null
                }
            }
        });
    }

    /**
     * Pipeline completed
     */
    pipelineComplete(success, results = {}) {
        const duration = this.startTime ? Date.now() - this.startTime : 0;

        return this.send({
            type: EVENT_TYPES.PIPELINE_COMPLETE,
            timestamp: this.timestamp(),
            data: {
                success,
                duration,
                totalArticles: results.totalArticles || 0,
                cardsGenerated: results.cardsGenerated || 0,
                errors: this.stats.errors,
                warnings: this.stats.warnings,
                stages: this.stats.stages
            }
        });
    }

    /**
     * Generic log message
     */
    log(level, message, stage = null) {
        return this.send({
            type: EVENT_TYPES.LOG,
            timestamp: this.timestamp(),
            data: { level, message, stage }
        });
    }

    // Convenience methods
    debug(message, stage = null) { return this.log('debug', message, stage); }
    info(message, stage = null) { return this.log('info', message, stage); }
    warn(message, stage = null) { return this.log('warn', message, stage); }
    error(message, stage = null) { return this.log('error', message, stage); }
}

// Export
module.exports = {
    PipelineEvents,
    EVENT_TYPES,
    STAGES,
    SEVERITY,
    TRANSPORT
};
