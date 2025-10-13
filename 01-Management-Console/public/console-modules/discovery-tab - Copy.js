/**
 * Discovery Tab Module
 * Displays discovered articles with collapsible filters and sortable columns
 */

import { 
    API_BASE, 
    createStatusBadge, 
    exportToCSV, 
    createFilterPanel,
    sortData,
    filterData,
    formatDate,
    showToast
} from './shared-utils.js';

let allArticles = [];
let filteredArticles = [];
let currentSort = { key: null, direction: 'none' };

/**
 * Initialize Discovery Tab
 */
export async function init() {
    const container = document.getElementById('discovery-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>📰 Discovered Articles</h2>
            <div class="header-actions">
                <button class="btn-export" onclick="window.discoveryExport()">📥 Export CSV</button>
                <button class="btn-refresh" onclick="window.discoveryRefresh()">🔄 Refresh</button>
            </div>
        </div>
        
        <div id="discovery-filters"></div>
        <div id="discovery-table"></div>
        
        <style>
            .tab-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .tab-header h2 {
                font-size: 22px;
                color: #333;
            }
            
            .header-actions {
                display: flex;
                gap: 10px;
            }
            
            .header-actions button {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .btn-export {
                background: #28a745;
                color: white;
            }
            
            .btn-export:hover {
                background: #218838;
            }
            
            .btn-refresh {
                background: #667eea;
                color: white;
            }
            
            .btn-refresh:hover {
                background: #5568d3;
            }
            
            .discovery-table {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .discovery-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .discovery-table th {
                padding: 12px;
                text-align: left;
                background: #f8f9fa;
                font-weight: 600;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .discovery-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .discovery-table tr:hover {
                background: #f8f9fa;
            }
            
            .article-title {
                font-weight: 500;
                color: #667eea;
                cursor: pointer;
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .article-title:hover {
                text-decoration: underline;
            }
        </style>
    `;
    
    // Create filter panel
    const filterContainer = document.getElementById('discovery-filters');
    const filterPanel = createFilterPanel([
        { name: 'title', label: 'Title', type: 'text' },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'score', label: 'Min Score', type: 'number' },
        { 
            name: 'pre_filter_status', 
            label: 'Pre-Filter', 
            type: 'select',
            options: ['Approved', 'Rejected', 'Pending']
        }
    ], handleFilter);
    
    filterContainer.appendChild(filterPanel);
    
    // Load data
    await loadArticles();
    
    // Expose functions to window for button onclick
    window.discoveryExport = exportArticles;
    window.discoveryRefresh = loadArticles;
}

/**
 * Load articles from API
 */
async function loadArticles() {
    try {
        const response = await fetch(`${API_BASE}/discovery/articles`);
        allArticles = await response.json();
        filteredArticles = [...allArticles];
        renderTable();
        showToast('Articles loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load articles:', error);
        showToast('Failed to load articles', 'error');
        document.getElementById('discovery-table').innerHTML = 
            '<p style="padding: 20px; color: red;">Error loading articles</p>';
    }
}

/**
 * Handle filter changes
 */
function handleFilter(filters) {
    filteredArticles = filterData(allArticles, filters);
    
    // Additional score filter
    if (filters.score) {
        const minScore = Number(filters.score);
        filteredArticles = filteredArticles.filter(a => a.score >= minScore);
    }
    
    // Apply current sort
    if (currentSort.direction !== 'none') {
        filteredArticles = sortData(filteredArticles, currentSort.key, currentSort.direction);
    }
    
    renderTable();
}

/**
 * Handle column sort
 */
function handleSort(key, direction) {
    currentSort = { key, direction };
    
    if (direction === 'none') {
        filteredArticles = filterData(allArticles, {});
    } else {
        filteredArticles = sortData(filteredArticles, key, direction);
    }
    
    renderTable();
}

/**
 * Render articles table
 */
function renderTable() {
    const tableContainer = document.getElementById('discovery-table');
    
    if (filteredArticles.length === 0) {
        tableContainer.innerHTML = `
            <div class="discovery-table">
                <p style="padding: 40px; text-align: center; color: #999;">No articles found</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'discovered_date', label: 'Date' },
        { key: 'score', label: 'Score' },
        { key: 'pre_filter_status', label: 'Pre-Filter' }
    ];
    
    columns.forEach(col => {
        const th = createSortableHeaderCell(col.label, col.key);
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    filteredArticles.forEach(article => {
        const row = document.createElement('tr');
        
        // Title
        const titleCell = document.createElement('td');
        titleCell.innerHTML = `
            <div class="article-title" onclick="window.open('${article.url}', '_blank')" 
                 title="${article.title}">
                ${article.title || 'Untitled'}
            </div>
        `;
        row.appendChild(titleCell);
        
        // Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(article.discovered_date);
        row.appendChild(dateCell);
        
        // Score
        const scoreCell = document.createElement('td');
        scoreCell.textContent = article.score || 'N/A';
        row.appendChild(scoreCell);
        
        // Pre-filter Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = createStatusBadge(article.pre_filter_status || 'Pending');
        row.appendChild(statusCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    tableContainer.innerHTML = '<div class="discovery-table"></div>';
    tableContainer.querySelector('.discovery-table').appendChild(table);
}

/**
 * Create sortable header cell
 */
function createSortableHeaderCell(text, key) {
    const th = document.createElement('th');
    th.style.cursor = 'pointer';
    th.style.userSelect = 'none';
    
    th.innerHTML = `
        ${text}
        <span class="sort-icon" style="margin-left: 5px; color: #999;">↕</span>
    `;
    
    th.addEventListener('click', () => {
        let direction = 'none';
        
        if (currentSort.key === key) {
            if (currentSort.direction === 'none') direction = 'asc';
            else if (currentSort.direction === 'asc') direction = 'desc';
            else direction = 'none';
        } else {
            direction = 'asc';
        }
        
        // Update icon
        document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
        const icon = th.querySelector('.sort-icon');
        if (direction === 'asc') icon.textContent = '↑';
        else if (direction === 'desc') icon.textContent = '↓';
        else icon.textContent = '↕';
        
        handleSort(key, direction);
    });
    
    return th;
}

/**
 * Export articles to CSV
 */
function exportArticles() {
    const exportData = filteredArticles.map(article => ({
        Title: article.title,
        URL: article.url,
        Date: formatDate(article.discovered_date),
        Score: article.score,
        'Pre-Filter': article.pre_filter_status,
        Source: article.source
    }));
    
    const filename = `discovery_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
    showToast('CSV exported successfully', 'success');
}