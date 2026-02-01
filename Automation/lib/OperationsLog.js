/**
 * Operations Log - Automatic change logging
 * CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 8.2
 */

class OperationsLog {
    constructor(db) {
        this.db = db;
    }

    /**
     * Log an operation to the database
     */
    async log(operation) {
        const {
            type,
            description,
            performedBy = 'system',
            relatedFile = null,
            rollbackSteps = null,
            metadata = {}
        } = operation;

        try {
            await this.db.run(`
                INSERT INTO operations_log (
                    operation_type,
                    description,
                    performed_by,
                    related_file,
                    rollback_steps,
                    metadata,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
                type,
                description,
                performedBy,
                relatedFile,
                rollbackSteps,
                JSON.stringify(metadata)
            ]);

            return true;
        } catch (err) {
            console.error('Failed to log operation:', err.message);
            return false;
        }
    }

    /**
     * Log a deployment
     */
    async logDeployment(details) {
        return this.log({
            type: 'DEPLOYMENT',
            description: details.description || 'Website deployment',
            performedBy: details.by || 'pipeline',
            metadata: {
                cardsCount: details.cardsCount,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Log a configuration change
     */
    async logConfigChange(details) {
        return this.log({
            type: 'CONFIG_CHANGE',
            description: details.description,
            performedBy: details.by || 'admin',
            relatedFile: details.file,
            rollbackSteps: details.rollback,
            metadata: {
                oldValue: details.oldValue,
                newValue: details.newValue
            }
        });
    }

    /**
     * Log a prompt update
     */
    async logPromptUpdate(details) {
        return this.log({
            type: 'PROMPT_UPDATE',
            description: `Updated ${details.promptType} prompt to ${details.version}`,
            performedBy: details.by || 'admin',
            rollbackSteps: `Revert to version ${details.previousVersion}`,
            metadata: {
                promptType: details.promptType,
                version: details.version,
                previousVersion: details.previousVersion
            }
        });
    }

    /**
     * Log a migration
     */
    async logMigration(details) {
        return this.log({
            type: 'MIGRATION',
            description: details.description,
            performedBy: details.by || 'migration-script',
            relatedFile: details.file,
            rollbackSteps: details.rollback,
            metadata: {
                version: details.version,
                tables: details.tables
            }
        });
    }

    /**
     * Get recent operations
     */
    async getRecent(limit = 20) {
        try {
            return await this.db.all(`
                SELECT * FROM operations_log
                ORDER BY created_at DESC
                LIMIT ?
            `, [limit]);
        } catch (err) {
            console.error('Failed to get operations:', err.message);
            return [];
        }
    }
}

module.exports = OperationsLog;
