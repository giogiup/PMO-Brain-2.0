const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../02-discovery-engine/pmo_insights.db');
console.log('Database path:', dbPath);
console.log('Database exists:', require('fs').existsSync(dbPath));
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        db.run('PRAGMA journal_mode=WAL;');
        console.log('WAL mode enabled');
    }
});

// Parse JSON body helper
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
        try {
            callback(null, JSON.parse(body));
        } catch (e) {
            callback(e);
        }
    });
}

// Create server
http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // === BACKLOG API ===
    if (req.url === '/api/backlog' && req.method === 'GET') {
        console.log('Backlog API called');
        db.all('SELECT * FROM backlog ORDER BY priority, created_at DESC', (err, rows) => {
            console.log('DB query executed. Error:', err, 'Rows:', rows ? rows.length : 'null');
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, tasks: rows || [] }));
            }
        });
    }
    
    else if (req.url === '/api/backlog' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
            
            db.run(`
                INSERT INTO backlog (title, description, priority, status, category, estimated_hours)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [data.title, data.description, data.priority, data.status, data.category, data.estimated_hours],
            function(err) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ error: err.message }));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, id: this.lastID }));
                }
            });
        });
    }

    else if (req.url.startsWith('/api/backlog/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
            
            db.run(`
                UPDATE backlog 
                SET title = ?, description = ?, priority = ?, status = ?, 
                    category = ?, estimated_hours = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [data.title, data.description, data.priority, data.status, 
                data.category, data.estimated_hours, id],
            function(err) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ error: err.message }));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, changes: this.changes }));
                }
            });
        });
    }

    else if (req.url.startsWith('/api/backlog/') && req.method === 'DELETE') {
        const id = req.url.split('/')[3];
        db.run('DELETE FROM backlog WHERE id = ?', [id], function(err) {
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, changes: this.changes }));
            }
        });
    }

    // === RESTART PROMPTS API ===
    else if (req.url === '/api/prompts' && req.method === 'GET') {
        db.all('SELECT * FROM restart_prompts ORDER BY prompt_type', (err, rows) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, prompts: rows }));
            }
        });
    }

    else if (req.url === '/api/prompts' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
            
            db.run(`
                INSERT INTO restart_prompts (version, prompt_type, title, content, is_active)
                VALUES (?, ?, ?, ?, ?)
            `, [data.version, data.prompt_type, data.title, data.content, data.is_active],
            function(err) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ error: err.message }));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, id: this.lastID }));
                }
            });
        });
    }

    else if (req.url.startsWith('/api/prompts/') && req.method === 'PUT') {
        const id = req.url.split('/')[3];
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }
            
            db.run(`
                UPDATE restart_prompts 
                SET version = ?, prompt_type = ?, title = ?, content = ?, 
                    is_active = ?, updated_at = date('now')
                WHERE id = ?
            `, [data.version, data.prompt_type, data.title, data.content, 
                data.is_active, id],
            function(err) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ error: err.message }));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ success: true, changes: this.changes }));
                }
            });
        });
    }

// === DAILY RUN API ===
    else if (req.url.startsWith('/api/daily-run/') && req.url.endsWith('/step') && req.method === 'PUT') {
        const date = req.url.split('/')[3];
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }

            const { step, status } = data;
            const timeField = step.replace('_status', '_time');
            
            // Determine count field based on step
            let countField = step.replace('_status', '_articles_found');
            if (step.includes('step2')) countField = 'step2_articles_scored';
            if (step.includes('step3')) countField = 'step3_articles_fetched';
            if (step.includes('step4')) countField = 'step4_articles_processed';
            if (step.includes('step5')) countField = 'step5_articles_processed';
            
            // Get count from database based on step
            let countQuery = '';
            const stepNumber = step.match(/step(\d+)/)[1];
            
            switch(stepNumber) {
                case '1': // Discovery
                    countQuery = `SELECT COUNT(*) as count FROM daily_insights WHERE published_date = ?`;
                    break;
                case '2': // Scoring
                    countQuery = `SELECT COUNT(*) as count FROM daily_insights WHERE published_date = ? AND pmo_score IS NOT NULL AND pmo_score > 0`;
                    break;
                case '3': // Fetch
                    countQuery = `SELECT COUNT(*) as count FROM daily_insights WHERE published_date = ? AND content_fetched = 1`;
                    break;
                case '4': // Keywords
                    countQuery = `SELECT COUNT(*) as count FROM daily_insights WHERE published_date = ? AND keywords_extracted = 1`;
                    break;
                case '5': // Newsletter
                    countQuery = `SELECT COUNT(*) as count FROM daily_insights WHERE published_date = ? AND newsletter_created = 1`;
                    break;
            }
            
            // Get count first
            db.get(countQuery, [date], (err, countRow) => {
                const count = countRow ? countRow.count : 0;
                
                // Update the run
                const updateSQL = `
                    UPDATE daily_runs 
                    SET ${step} = ?,
                        ${timeField} = CASE WHEN ? = 'complete' THEN datetime('now') ELSE ${timeField} END,
                        ${countField} = ?,
                        updated_at = datetime('now')
                    WHERE run_date = ?
                `;
                
                db.run(updateSQL, [status, status, count, date], function(err) {
                    if (err) {
                        res.writeHead(500, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ error: err.message }));
                    } else {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ 
                            success: true, 
                            changes: this.changes,
                            count: count
                        }));
                    }
                });
            });
        });
    }

    else if (req.url.startsWith('/api/daily-run/') && req.method === 'GET') {
        const date = req.url.split('/')[3];
        
        db.get(`SELECT * FROM daily_runs WHERE run_date = ?`, [date], (err, row) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, run: row || null }));
            }
        });
    }

    else if (req.url === '/api/daily-run' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            if (err) {
                res.writeHead(400, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
                return;
            }

            const { run_date } = data;
            
            db.run(`
                INSERT OR IGNORE INTO daily_runs (run_date) 
                VALUES (?)
            `, [run_date], function(err) {
                if (err) {
                    res.writeHead(500, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ error: err.message }));
                } else {
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify({ 
                        success: true, 
                        id: this.lastID,
                        message: 'Daily run created'
                    }));
                }
            });
        });
    }

    // === OPERATIONS LOG API ===
    else if (req.url === '/api/operations' && req.method === 'GET') {
        db.all('SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT 50', (err, rows) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, operations: rows }));
            }
        });
    }

// === OPERATIONS LOG API ===
    else if (req.url === '/api/operations' && req.method === 'GET') {
        console.log('Operations API called');
        db.all('SELECT * FROM operations_log ORDER BY timestamp DESC LIMIT 50', (err, rows) => {
            console.log('Operations query executed. Error:', err, 'Rows:', rows ? rows.length : 'null');
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ success: true, operations: rows }));
            }
        });
    }

    // === OPERATIONS STATS API ===
    else if (req.url === '/api/operations/stats' && req.method === 'GET') {
        console.log('Operations stats API called');
        
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString();
        
        // Get stats from last 24 hours
        db.all(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
                AVG(execution_time_seconds) as avg_duration
            FROM operations_log 
            WHERE timestamp >= ?
        `, [yesterdayStr], (err, rows) => {
            if (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ error: err.message }));
            } else {
                const stats = rows[0];
                const successRate = stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 100;
                const avgDuration = stats.avg_duration ? stats.avg_duration.toFixed(2) : '0.00';
                
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({ 
                    success: true,
                    total: stats.total || 0,
                    successRate: successRate,
                    failed: stats.failed || 0,
                    avgDuration: avgDuration
                }));
            }
        });
    }

    // === SERVE HTML ===
    else if (req.url === '/' || req.url === '/console') {
        fs.readFile('./management_console_website.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading console');
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            }
        });
    }
    
    else if (req.url === '/daily-run' || req.url === '/daily-run-tracker') {
        fs.readFile('./daily_run_tracker.html', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading daily run tracker');
            } else {
                res.writeHead(200, {'Content-Type': 'text/html'});
                res.end(data);
            }
        });
    }
    
    // === 404 ===
    else {
        res.writeHead(404, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ error: 'Not found' }));
    }
    
}).listen(8080);

console.log(`
╔════════════════════════════════════════════════════════╗
║  PMO-Brain Management Console Server Running          ║
╠════════════════════════════════════════════════════════╣
║  Console URL: http://localhost:8080/console           ║
║  Daily Run Tracker: http://localhost:8080/daily-run   ║
║  Status: Active                                        ║
╚════════════════════════════════════════════════════════╝
`);