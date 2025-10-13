/**
 * Statistics Tab Module
 * Displays discovery statistics with date preset filters
 */

import { 
    API_BASE, 
    exportToCSV,
    formatDate,
    showToast
} from './shared-utils.js';

let allStats = [];
let currentDateRange = null;

/**
 * Initialize Statistics Tab
 */
export async function init() {
    const container = document.getElementById('statistics-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>📊 Discovery Statistics</h2>
            <div class="header-actions">
                <button class="btn-export" onclick="window.statsExport()">📥 Export CSV</button>
                <button class="btn-refresh" onclick="window.statsRefresh()">🔄 Refresh</button>
            </div>
        </div>
        
        <!-- Date Filter Presets -->
        <div class="date-filter">
            <label class="filter-label">Filter by Date:</label>
            <div class="preset-buttons">
                <button class="preset-btn active" data-preset="all">All Time</button>
                <button class="preset-btn" data-preset="today">Today</button>
                <button class="preset-btn" data-preset="7days">Last 7 Days</button>
                <button class="preset-btn" data-preset="30days">Last 30 Days</button>
                <button class="preset-btn" data-preset="custom">Custom 📅</button>
            </div>
            <div class="custom-date-picker" style="display: none;">
                <input type="date" id="date-from" />
                <span style="margin: 0 10px;">to</span>
                <input type="date" id="date-to" />
                <button class="btn-apply-date">Apply</button>
            </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid" id="stats-cards"></div>
        
        <!-- Stats Table -->
        <div id="stats-table"></div>
        
        <style>
            .date-filter {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .filter-label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-bottom: 10px;
            }
            
            .preset-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .preset-btn {
                padding: 10px 20px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #666;
                transition: all 0.2s ease;
            }
            
            .preset-btn:hover {
                border-color: #667eea;
                color: #667eea;
            }
            
            .preset-btn.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .custom-date-picker {
                margin-top: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .custom-date-picker input[type="date"] {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .btn-apply-date {
                padding: 8px 16px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-left: 4px solid #667eea;
            }
            
            .stat-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 8px;
            }
            
            .stat-value {
                font-size: 32px;
                font-weight: 700;
                color: #333;
            }
            
            .stats-table {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            
            .stats-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .stats-table th {
                padding: 12px;
                text-align: left;
                background: #f8f9fa;
                font-weight: 600;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .stats-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .stats-table tr:hover {
                background: #f8f9fa;
            }
        </style>
    `;
    
    // Setup preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const preset = btn.dataset.preset;
            const customPicker = document.querySelector('.custom-date-picker');
            
            if (preset === 'custom') {
                customPicker.style.display = 'flex';
            } else {
                customPicker.style.display = 'none';
                applyPreset(preset);
            }
        });
    });
    
    // Apply custom date range
    document.querySelector('.btn-apply-date').addEventListener('click', () => {
        const from = document.getElementById('date-from').value;
        const to = document.getElementById('date-to').value;
        
        if (!from || !to) {
            showToast('Please select both dates', 'error');
            return;
        }
        
        currentDateRange = { from, to };
        applyFilters();
    });
    
    // Load data
    await loadStats();
    
    // Expose functions
    window.statsExport = exportStats;
    window.statsRefresh = loadStats;
}

/**
 * Load statistics from API
 */
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/statistics`);
        allStats = await response.json();
        applyFilters();
        showToast('Statistics loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load statistics:', error);
        showToast('Failed to load statistics', 'error');
    }
}

/**
 * Apply date preset filter
 */
function applyPreset(preset) {
    const now = new Date();
    let from, to;
    
    switch (preset) {
        case 'all':
            currentDateRange = null;
            break;
        
        case 'today':
            from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            to = now;
            currentDateRange = { from: from.toISOString(), to: to.toISOString() };
            break;
        
        case '7days':
            from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            to = now;
            currentDateRange = { from: from.toISOString(), to: to.toISOString() };
            break;
        
        case '30days':
            from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            to = now;
            currentDateRange = { from: from.toISOString(), to: to.toISOString() };
            break;
    }
    
    applyFilters();
}

/**
 * Apply current filters and render
 */
function applyFilters() {
    let filteredStats = allStats;
    
    if (currentDateRange) {
        const fromDate = new Date(currentDateRange.from);
        const toDate = new Date(currentDateRange.to);
        
        filteredStats = allStats.filter(stat => {
            const statDate = new Date(stat.run_date);
            return statDate >= fromDate && statDate <= toDate;
        });
    }
    
    renderStats(filteredStats);
}

/**
 * Render statistics cards and table
 */
function renderStats(stats) {
    // Calculate summary metrics
    const totalArticles = stats.reduce((sum, s) => sum + (s.articles_discovered || 0), 0);
    const totalApproved = stats.reduce((sum, s) => sum + (s.articles_approved || 0), 0);
    const totalScored = stats.reduce((sum, s) => sum + (s.articles_scored || 0), 0);
    const avgScore = stats.length > 0 
        ? (stats.reduce((sum, s) => sum + (s.avg_score || 0), 0) / stats.length).toFixed(1)
        : 0;
    
    // Render cards
    const cardsContainer = document.getElementById('stats-cards');
    cardsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Discovered</div>
            <div class="stat-value">${totalArticles}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Approved</div>
            <div class="stat-value">${totalApproved}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Scored</div>
            <div class="stat-value">${totalScored}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Average Score</div>
            <div class="stat-value">${avgScore}</div>
        </div>
    `;
    
    // Render table
    renderTable(stats);
}

/**
 * Render statistics table
 */
function renderTable(stats) {
    const tableContainer = document.getElementById('stats-table');
    
    if (stats.length === 0) {
        tableContainer.innerHTML = `
            <div class="stats-table">
                <p style="padding: 40px; text-align: center; color: #999;">No statistics found</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    
    // Header
    table.innerHTML = `
        <thead>
            <tr>
                <th>Run Date</th>
                <th>Articles Discovered</th>
                <th>Articles Approved</th>
                <th>Articles Scored</th>
                <th>Avg Score</th>
                <th>Duration</th>
            </tr>
        </thead>
        <tbody>
            ${stats.map(stat => `
                <tr>
                    <td>${formatDate(stat.run_date)}</td>
                    <td>${stat.articles_discovered || 0}</td>
                    <td>${stat.articles_approved || 0}</td>
                    <td>${stat.articles_scored || 0}</td>
                    <td>${(stat.avg_score || 0).toFixed(1)}</td>
                    <td>${formatDuration(stat.duration)}</td>
                </tr>
            `).join('')}
        </tbody>
    `;
    
    tableContainer.innerHTML = '<div class="stats-table"></div>';
    tableContainer.querySelector('.stats-table').appendChild(table);
}

/**
 * Format duration
 */
function formatDuration(ms) {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Export statistics to CSV
 */
function exportStats() {
    const exportData = allStats.map(stat => ({
        'Run Date': formatDate(stat.run_date),
        'Articles Discovered': stat.articles_discovered,
        'Articles Approved': stat.articles_approved,
        'Articles Scored': stat.articles_scored,
        'Average Score': (stat.avg_score || 0).toFixed(1),
        'Duration': formatDuration(stat.duration)
    }));
    
    const filename = `statistics_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
    showToast('CSV exported successfully', 'success');
}