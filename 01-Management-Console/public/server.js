// ============================================================================
// SMARTPMO UNIFIED MANAGEMENT CONSOLE SERVER
// All endpoints for Dashboard, Discovery, Sources, Pre-Filter, Prompts,
// Backlog, Operations, and Restart Prompts
// ============================================================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const consoleRoutes = require('../../Automation/api/console-routes'); // ADDED
const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/api', consoleRoutes); // ADDED

// Explicit route for console (fixes "Cannot GET /console.html")
app.get('/console.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'console.html'));
});

// Default route
app.get('/', (req, res) => {
    res.redirect('/console.html');
});

// Database connection
const dbPath = path.join(__dirname, '..', '..', '02-discovery-engine', 'pmo_insights.db');
const db = new sqlite3.Database(dbPath);

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================

// Get dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM daily_insights WHERE published_date = DATE("now")',
        prefiltered: 'SELECT COUNT(*) as count FROM daily_insights WHERE published_date = DATE("now") AND prefilter_passed = 1',
        quality: 'SELECT COUNT(*) as count FROM daily_insights WHERE published_date = DATE("now") AND pmo_score >= 70',
        tasks: 'SELECT COUNT(*) as count FROM backlog WHERE status IN ("todo", "in-progress")'
    };
    
    Promise.all([
        new Promise((resolve) => db.get(queries.total, (err, row) => resolve(row?.count || 0))),
        new Promise((resolve) => db.get(queries.prefiltered, (err, row) => resolve(row?.count || 0))),
        new Promise((resolve) => db.get(queries.quality, (err, row) => resolve(row?.count || 0))),
        new Promise((resolve) => db.get(queries.tasks, (err, row) => resolve(row?.count || 0)))
    ]).then(([total, prefiltered, quality, tasks]) => {
        res.json({
            total_articles: total,
            prefiltered: prefiltered,
            high_quality: quality,
            active_tasks: tasks
        });
    });
});

// Get discovery volume chart data (7 days)
app.get('/api/charts/discovery', (req, res) => {
    const query = `
        SELECT 
            DATE(published_date) as date,
            COUNT(*) as count
        FROM daily_insights
        WHERE published_date >= DATE('now', '-7 days')
        GROUP BY DATE(published_date)
        ORDER BY date
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            labels: rows.map(r => r.date),
            values: rows.map(r => r.count)
        });
    });
});

// Get pre-filter pass/fail chart data
app.get('/api/charts/prefilter', (req, res) => {
    const query = `
        SELECT 
            SUM(CASE WHEN prefilter_passed = 1 THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN prefilter_passed = 0 THEN 1 ELSE 0 END) as failed
        FROM daily_insights
        WHERE published_date >= DATE('now', '-7 days')
    `;
    
    db.get(query, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            passed: row?.passed || 0,
            failed: row?.failed || 0
        });
    });
});

// Get PMO score distribution chart data
app.get('/api/charts/scores', (req, res) => {
    const query = `
        SELECT 
            CASE 
                WHEN pmo_score >= 85 THEN '85-100'
                WHEN pmo_score >= 70 THEN '70-84'
                WHEN pmo_score >= 50 THEN '50-69'
                WHEN pmo_score >= 30 THEN '30-49'
                ELSE '0-29'
            END as range,
            COUNT(*) as count
        FROM daily_insights
        WHERE pmo_score IS NOT NULL 
        AND published_date >= DATE('now', '-7 days')
        GROUP BY range
        ORDER BY range DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            labels: rows.map(r => r.range),
            values: rows.map(r => r.count)
        });
    });
});

// Get top keywords chart data
app.get('/api/charts/keywords', (req, res) => {
    const query = `
        SELECT 
            keyword,
            COUNT(*) as count
        FROM article_keywords
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY keyword
        ORDER BY count DESC
        LIMIT 10
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            labels: rows.map(r => r.keyword),
            values: rows.map(r => r.count)
        });
    });
});

// Get operations success rate chart data (7 days)
app.get('/api/charts/operations', (req, res) => {
    const query = `
        SELECT 
            DATE(timestamp) as date,
            ROUND(
                100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*),
                1
            ) as success_rate
        FROM operations_log
        WHERE timestamp >= DATE('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
            labels: rows.map(r => r.date),
            values: rows.map(r => r.success_rate)
        });
    });
});

// ============================================================================
// ALERTS ENDPOINT
// ============================================================================

app.get('/api/alerts', (req, res) => {
    const alerts = [];
    
    // Check for pipeline failures
    const pipelineCheck = `
        SELECT * FROM operations_log 
        WHERE status = 'failed' 
        AND timestamp >= DATETIME('now', '-1 hour')
        ORDER BY timestamp DESC
        LIMIT 5
    `;
    
    db.all(pipelineCheck, (err, pipelineErrors) => {
        if (pipelineErrors && pipelineErrors.length > 0) {
            pipelineErrors.forEach(err => {
                alerts.push({
                    severity: 'error',
                    message: `Pipeline Failed: ${err.message}`,
                    timestamp: err.timestamp
                });
            });
        }
        
        // Check pre-filter count
        const prefilterCheck = `
            SELECT COUNT(*) as count 
            FROM daily_insights 
            WHERE published_date = DATE('now') 
            AND prefilter_passed = 1
        `;
        
        db.get(prefilterCheck, (err, result) => {
            if (result && result.count < 50 && result.count > 0) {
                alerts.push({
                    severity: 'warning',
                    message: `Low pre-filter pass: Only ${result.count} articles passed (expected 50+)`,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Check no articles discovered
            const discoveryCheck = `
                SELECT COUNT(*) as count 
                FROM daily_insights 
                WHERE published_date = DATE('now')
            `;
            
            db.get(discoveryCheck, (err, result) => {
                if (result && result.count === 0) {
                    alerts.push({
                        severity: 'error',
                        message: 'No articles discovered today - Discovery engine may be down',
                        timestamp: new Date().toISOString()
                    });
                }
                
                // Check operations log for errors
                const opsCheck = `
                    SELECT COUNT(*) as count 
                    FROM operations_log 
                    WHERE status = 'failed' 
                    AND timestamp >= DATETIME('now', '-24 hours')
                `;
                
                db.get(opsCheck, (err, result) => {
                    if (result && result.count > 0) {
                        alerts.push({
                            severity: 'warning',
                            message: `${result.count} operation errors in last 24 hours`,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    res.json({ alerts });
                });
            });
        });
    });
});

// ============================================================================
// DISCOVERY ENDPOINTS
// ============================================================================

app.get('/api/discovery/stats', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total_articles,
            COUNT(CASE WHEN pmo_score >= 70 THEN 1 END) as high_quality,
            ROUND(AVG(pmo_score), 1) as avg_score,
            MAX(published_date) as latest_date
        FROM daily_insights
    `;
    
    db.get(query, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.get('/api/discovery/recent', (req, res) => {
    const limit = req.query.limit || 50;
    
    const query = `
        SELECT id, title, url, published_date, pmo_score, prefilter_score, prefilter_passed
        FROM daily_insights
        ORDER BY discovered_at DESC
        LIMIT ?
    `;
    
    db.all(query, [limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============================================================================
// SOURCES ENDPOINTS
// ============================================================================

app.get('/api/sources', (req, res) => {
    const query = `
        SELECT id, source_name, source_type, source_url, tier, enabled,
               total_articles_found, total_articles_inserted, last_run_date
        FROM source_registry
        ORDER BY tier, source_name
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/sources/:id/toggle', (req, res) => {
    const { id } = req.params;
    
    db.run(`UPDATE source_registry SET enabled = NOT enabled WHERE id = ?`, [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// ============================================================================
// PRE-FILTER ENDPOINTS
// ============================================================================

app.get('/api/prefilter/config', (req, res) => {
    db.all('SELECT * FROM prefilter_config ORDER BY config_key', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prefilter/config/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    
    db.run(`UPDATE prefilter_config SET config_value = ? WHERE config_key = ?`, 
        [value, key], 
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.get('/api/prefilter/keywords', (req, res) => {
    const { tier, type } = req.query;
    
    let query = 'SELECT * FROM prefilter_keywords WHERE 1=1';
    const params = [];
    
    if (tier) {
        query += ' AND tier = ?';
        params.push(tier);
    }
    
    if (type) {
        query += ' AND keyword_type = ?';
        params.push(type);
    }
    
    query += ' ORDER BY tier, keyword';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/prefilter/keywords', (req, res) => {
    const { keyword, keyword_type, tier, category, weight } = req.body;
    
    db.run(`
        INSERT INTO prefilter_keywords (keyword, keyword_type, tier, category, weight)
        VALUES (?, ?, ?, ?, ?)
    `, [keyword, keyword_type, tier, category, weight], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/prefilter/keywords/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM prefilter_keywords WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/prefilter/keywords/:id/toggle', (req, res) => {
    const { id } = req.params;
    
    db.run('UPDATE prefilter_keywords SET enabled = NOT enabled WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/prefilter/logs', (req, res) => {
    const { date, passed } = req.query;
    
    let query = `
        SELECT pl.*, di.title, di.url
        FROM prefilter_log pl
        JOIN daily_insights di ON pl.article_id = di.id
        WHERE 1=1
    `;
    const params = [];
    
    if (date) {
        query += ' AND pl.run_date = ?';
        params.push(date);
    }
    
    if (passed !== undefined) {
        query += ' AND pl.passed = ?';
        params.push(passed === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY pl.score DESC LIMIT 100';
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============================================================================
// PROMPT MANAGEMENT ENDPOINTS
// ============================================================================

app.get('/api/prompts/active', (req, res) => {
    db.all('SELECT * FROM prompt_templates WHERE is_active = 1', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/prompts/history/:type', (req, res) => {
    const { type } = req.params;
    const limit = req.query.limit || 20;
    
    db.all(`
        SELECT id, version, is_active, avg_score_produced, articles_processed,
               created_at, created_by, notes
        FROM prompt_templates
        WHERE prompt_type = ?
        ORDER BY created_at DESC
        LIMIT ?
    `, [type, limit], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/prompts/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM prompt_templates WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.post('/api/prompts', (req, res) => {
    const { prompt_type, version, prompt_text, notes } = req.body;
    
    db.run('UPDATE prompt_templates SET is_active = 0 WHERE prompt_type = ?', [prompt_type], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run(`
            INSERT INTO prompt_templates (prompt_type, version, prompt_text, is_active, notes, created_by)
            VALUES (?, ?, ?, 1, ?, 'console')
        `, [prompt_type, version, prompt_text, notes], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
    });
});

app.post('/api/prompts/:id/activate', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT prompt_type FROM prompt_templates WHERE id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run('UPDATE prompt_templates SET is_active = 0 WHERE prompt_type = ?', [row.prompt_type], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.run('UPDATE prompt_templates SET is_active = 1 WHERE id = ?', [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        });
    });
});

// ============================================================================
// BACKLOG ENDPOINTS
// ============================================================================

app.get('/api/backlog', (req, res) => {
    db.all('SELECT * FROM backlog ORDER BY date_raised DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/backlog', (req, res) => {
    const { title, description, category, priority } = req.body;
    
    db.run(`
        INSERT INTO backlog (title, description, category, priority, status)
        VALUES (?, ?, ?, ?, 'todo')
    `, [title, description, category, priority], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/backlog/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const dateCompleted = status === 'done' ? new Date().toISOString().split('T')[0] : null;
    
    db.run(`
        UPDATE backlog 
        SET status = ?, 
            date_completed = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [status, dateCompleted, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

app.delete('/api/backlog/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM backlog WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============================================================================
// OPERATIONS ENDPOINTS
// ============================================================================

app.get('/api/operations', (req, res) => {
    const query = `
        SELECT *
        FROM operations_log
        WHERE timestamp >= DATETIME('now', '-24 hours')
        ORDER BY timestamp DESC
        LIMIT 100
    `;
    
    db.all(query, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/operations/stats', (req, res) => {
    const query = `
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            ROUND(
                100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*),
                1
            ) as successRate,
            ROUND(AVG(execution_time_seconds), 1) as avgDuration
        FROM operations_log
        WHERE timestamp >= DATETIME('now', '-24 hours')
    `;
    
    db.get(query, (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { total: 0, failed: 0, successRate: 0, avgDuration: 0 });
    });
});

// ============================================================================
// RESTART PROMPTS ENDPOINTS
// ============================================================================

app.get('/api/restart', (req, res) => {
    db.all('SELECT * FROM restart_prompts WHERE is_active = 1 ORDER BY prompt_type', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/restart', (req, res) => {
    const { version, prompt_type, title, content } = req.body;
    
    db.run(`
        UPDATE restart_prompts SET is_active = 0 WHERE prompt_type = ?
    `, [prompt_type], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run(`
            INSERT INTO restart_prompts (version, prompt_type, title, content, is_active)
            VALUES (?, ?, ?, ?, 1)
        `, [version, prompt_type, title, content], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
    });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
    console.log(`\n🌐 SmartPMO Management Console running at http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('\n✅ Database connection closed');
        process.exit(0);
    });
});