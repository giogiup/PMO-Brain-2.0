/**
 * SmartPMO Console API Routes
 * All API endpoints for the management console
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const DB_PATH = path.join(__dirname, '..', '..', '02-discovery-engine', 'pmo_insights.db');

/**
 * Get database connection
 */
function getDb() {
    return new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('Database connection error:', err);
        }
    });
}

// ============================================================================
// DISCOVERY ARTICLES ENDPOINTS
// ============================================================================

/**
 * GET /api/discovery/articles
 * Get all discovered articles with filtering
 */
router.get('/discovery/articles', (req, res) => {
    const db = getDb();
    
    const query = `
        SELECT 
            a.id,
            a.id as article_id,
            a.title,
            a.url,
            a.source_id as source,
            a.published_date as discovered_date,
            a.pmo_score as score,
            CASE WHEN a.prefilter_passed = 1 THEN 'Approved' ELSE 'Rejected' END as pre_filter_status,
            a.created_at as scored_date,
            s.source_name as source_name
        FROM daily_insights a
        LEFT JOIN source_registry s ON a.source_id = s.id
        ORDER BY a.created_at DESC
        LIMIT 500
    `;
    
    db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
            console.error('Error fetching articles:', err);
            return res.status(500).json({ error: 'Failed to fetch articles' });
        }
        
        res.json(rows || []);
    });
});

// ============================================================================
// SOURCES ENDPOINTS
// ============================================================================

/**
 * GET /api/sources
 * Get all discovery sources
 */
router.get('/sources', (req, res) => {
    const db = getDb();
    
    const query = `
        SELECT 
            s.id,
            s.source_name as name,
            s.source_url as url,
            s.source_type as type,
            s.tier,
            s.category,
            s.enabled,
            s.last_run_date as last_run,
            s.added_date as created_date,
            CASE WHEN s.enabled = 1 THEN 'Active' ELSE 'Inactive' END as status,
            (SELECT COUNT(*) FROM daily_insights WHERE source_id = s.id) as articles_found,
            (SELECT COUNT(*) FROM daily_insights WHERE source_id = s.id AND prefilter_passed = 1) as articles_inserted
        FROM source_registry s
        ORDER BY s.source_type, s.tier, s.source_name
    `;
    
    db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
            console.error('Error fetching sources:', err);
            return res.status(500).json({ error: 'Failed to fetch sources' });
        }
        
        res.json(rows || []);
    });
});

/**
 * POST /api/sources/:id/test
 * Test a specific source
 */
router.post('/sources/:id/test', async (req, res) => {
    const sourceId = req.params.id;
    const db = getDb();
    
    // Get source details
    db.get('SELECT * FROM source_registry WHERE id = ?', [sourceId], (err, source) => {
        db.close();
        
        if (err || !source) {
            return res.status(404).json({ error: 'Source not found' });
        }
        
        // TODO: Implement actual source testing logic here
        // For now, return success message
        res.json({ 
            success: true, 
            message: `Test initiated for ${source.source_name}`,
            source: source.source_name
        });
    });
});

// ============================================================================
// OPERATIONS LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/operations
 * Get system operation logs
 */
router.get('/operations', (req, res) => {
    const db = getDb();
    
    // Check if operations_log table exists, create if not
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS operations_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            operation TEXT NOT NULL,
            component TEXT,
            status TEXT NOT NULL,
            message TEXT,
            records INTEGER DEFAULT 0,
            duration INTEGER,
            details TEXT
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating operations_log table:', err);
        }
        
        // Fetch operations
        const query = `
            SELECT * FROM operations_log 
            ORDER BY timestamp DESC 
            LIMIT 1000
        `;
        
        db.all(query, [], (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error fetching operations:', err);
                return res.status(500).json({ error: 'Failed to fetch operations' });
            }
            
            res.json(rows || []);
        });
    });
});

/**
 * DELETE /api/operations
 * Clear all operation logs
 */
router.delete('/operations', (req, res) => {
    const db = getDb();
    
    db.run('DELETE FROM operations_log', (err) => {
        db.close();
        
        if (err) {
            console.error('Error clearing operations:', err);
            return res.status(500).json({ error: 'Failed to clear operations' });
        }
        
        res.json({ success: true, message: 'All operation logs cleared' });
    });
});

/**
 * POST /api/operations
 * Log a new operation (used by pipeline modules)
 */
router.post('/operations', (req, res) => {
    const { operation, component, status, message, records, duration, details } = req.body;
    const db = getDb();
    
    const query = `
        INSERT INTO operations_log (timestamp, operation, component, status, message, records, duration, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const timestamp = new Date().toISOString();
    
    db.run(query, [timestamp, operation, component, status, message, records, duration, JSON.stringify(details)], (err) => {
        db.close();
        
        if (err) {
            console.error('Error logging operation:', err);
            return res.status(500).json({ error: 'Failed to log operation' });
        }
        
        res.json({ success: true, message: 'Operation logged' });
    });
});

// ============================================================================
// BACKLOG ENDPOINTS
// ============================================================================

/**
 * GET /api/backlog
 * Get development backlog items
 */
router.get('/backlog', (req, res) => {
    const db = getDb();
    
    // Check if backlog table exists, create if not
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS backlog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            priority TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_date TEXT NOT NULL,
            completed_date TEXT,
            notes TEXT
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating backlog table:', err);
        }
        
        // Fetch backlog items
        const query = `
            SELECT * FROM backlog 
            ORDER BY 
                CASE priority 
                    WHEN 'Critical' THEN 1
                    WHEN 'High' THEN 2
                    WHEN 'Medium' THEN 3
                    WHEN 'Low' THEN 4
                    ELSE 5
                END,
                created_date DESC
        `;
        
        db.all(query, [], (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error fetching backlog:', err);
                return res.status(500).json({ error: 'Failed to fetch backlog' });
            }
            
            res.json(rows || []);
        });
    });
});

/**
 * POST /api/backlog
 * Add new backlog item
 */
router.post('/backlog', (req, res) => {
    const { priority, category, description, notes } = req.body;
    const db = getDb();
    
    const query = `
        INSERT INTO backlog (priority, category, description, status, created_date, notes)
        VALUES (?, ?, ?, 'Pending', ?, ?)
    `;
    
    const created_date = new Date().toISOString();
    
    db.run(query, [priority, category, description, created_date, notes], function(err) {
        db.close();
        
        if (err) {
            console.error('Error adding backlog item:', err);
            return res.status(500).json({ error: 'Failed to add backlog item' });
        }
        
        res.json({ success: true, id: this.lastID, message: 'Backlog item added' });
    });
});

// ============================================================================
// STATISTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/statistics
 * Get discovery statistics
 */
router.get('/statistics', (req, res) => {
    const db = getDb();
    
    // Check if statistics table exists, create if not
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS discovery_statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_date TEXT NOT NULL,
            articles_discovered INTEGER DEFAULT 0,
            articles_approved INTEGER DEFAULT 0,
            articles_rejected INTEGER DEFAULT 0,
            articles_scored INTEGER DEFAULT 0,
            avg_score REAL DEFAULT 0,
            duration INTEGER,
            details TEXT
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating statistics table:', err);
        }
        
        // Fetch statistics
        const query = `
            SELECT * FROM discovery_statistics 
            ORDER BY run_date DESC 
            LIMIT 90
        `;
        
        db.all(query, [], (err, rows) => {
            // If no stats exist, generate from existing data
            if (!rows || rows.length === 0) {
                const statsQuery = `
                    SELECT 
                        DATE(published_date) as run_date,
                        COUNT(*) as articles_discovered,
                        SUM(CASE WHEN prefilter_passed = 1 THEN 1 ELSE 0 END) as articles_approved,
                        SUM(CASE WHEN prefilter_passed = 0 THEN 1 ELSE 0 END) as articles_rejected,
                        SUM(CASE WHEN pmo_score IS NOT NULL THEN 1 ELSE 0 END) as articles_scored,
                        AVG(pmo_score) as avg_score,
                        0 as duration
                    FROM daily_insights
                    WHERE published_date IS NOT NULL
                    GROUP BY DATE(published_date)
                    ORDER BY run_date DESC
                    LIMIT 90
                `;
                
                db.all(statsQuery, [], (err, generatedRows) => {
                    db.close();
                    
                    if (err) {
                        console.error('Error fetching statistics:', err);
                        return res.status(500).json({ error: 'Failed to fetch statistics' });
                    }
                    
                    res.json(generatedRows || []);
                });
            } else {
                db.close();
                res.json(rows);
            }
        });
    });
});

/**
 * POST /api/statistics
 * Log new statistics entry (used by pipeline)
 */
router.post('/statistics', (req, res) => {
    const { 
        run_date, 
        articles_discovered, 
        articles_approved, 
        articles_rejected,
        articles_scored,
        avg_score,
        duration,
        details 
    } = req.body;
    
    const db = getDb();
    
    const query = `
        INSERT INTO discovery_statistics 
        (run_date, articles_discovered, articles_approved, articles_rejected, articles_scored, avg_score, duration, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        run_date || new Date().toISOString(),
        articles_discovered || 0,
        articles_approved || 0,
        articles_rejected || 0,
        articles_scored || 0,
        avg_score || 0,
        duration || 0,
        JSON.stringify(details || {})
    ], function(err) {
        db.close();
        
        if (err) {
            console.error('Error logging statistics:', err);
            return res.status(500).json({ error: 'Failed to log statistics' });
        }
        
        res.json({ success: true, id: this.lastID, message: 'Statistics logged' });
    });
});

// ============================================================================
// PRE-FILTER CONFIG ENDPOINTS
// ============================================================================

/**
 * GET /api/prefilter/config
 * Get pre-filter configuration
 */
router.get('/prefilter/config', (req, res) => {
    const db = getDb();
    
    // Check if config table exists, create if not
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS prefilter_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            updated_date TEXT NOT NULL
        )
    `;
    
    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating prefilter_config table:', err);
        }
        
        // Fetch all config values
        const query = `SELECT config_key, config_value FROM prefilter_config`;
        
        db.all(query, [], (err, rows) => {
            db.close();
            
            if (err) {
                console.error('Error fetching config:', err);
                return res.status(500).json({ error: 'Failed to fetch config' });
            }
            
            // Convert rows to object
            const config = {};
            rows.forEach(row => {
                try {
                    config[row.config_key] = JSON.parse(row.config_value);
                } catch (e) {
                    config[row.config_key] = row.config_value;
                }
            });
            
            // Return defaults if empty
            if (Object.keys(config).length === 0) {
                return res.json(getDefaultConfig());
            }
            
            res.json(config);
        });
    });
});

/**
 * POST /api/prefilter/config
 * Save pre-filter configuration
 */
router.post('/prefilter/config', (req, res) => {
    const config = req.body;
    const db = getDb();
    const updated_date = new Date().toISOString();
    
    // Use transaction to update all config values
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
            INSERT INTO prefilter_config (config_key, config_value, updated_date)
            VALUES (?, ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET 
                config_value = excluded.config_value,
                updated_date = excluded.updated_date
        `);
        
        Object.entries(config).forEach(([key, value]) => {
            const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
            stmt.run(key, valueStr, updated_date);
        });
        
        stmt.finalize();
        
        db.run('COMMIT', (err) => {
            db.close();
            
            if (err) {
                console.error('Error saving config:', err);
                return res.status(500).json({ error: 'Failed to save config' });
            }
            
            res.json({ success: true, message: 'Configuration saved' });
        });
    });
});

/**
 * Get default pre-filter configuration
 */
function getDefaultConfig() {
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

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/health
 * Check API health
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        database: DB_PATH
    });
});

module.exports = router;