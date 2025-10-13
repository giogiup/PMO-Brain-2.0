/**
 * Sources Tab Module
 * Displays all discovery sources with 4 mini-tabs: RSS, Google, TheNewsAPI, GDELT
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

let allSources = [];
let currentSubTab = 'rss';
let currentSort = { key: null, direction: 'none' };

/**
 * Initialize Sources Tab
 */
export async function init() {
    const container = document.getElementById('sources-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>🔗 Discovery Sources</h2>
            <div class="header-actions">
                <button class="btn-export" onclick="window.sourcesExport()">📥 Export CSV</button>
                <button class="btn-refresh" onclick="window.sourcesRefresh()">🔄 Refresh</button>
            </div>
        </div>
        
        <!-- Mini-Tab Navigation -->
        <div class="mini-tab-nav">
            <button class="mini-tab-btn active" data-subtab="rss">📡 RSS Feeds</button>
            <button class="mini-tab-btn" data-subtab="google">🔍 Google Searches</button>
            <button class="mini-tab-btn" data-subtab="newsapi">📰 TheNewsAPI</button>
            <button class="mini-tab-btn" data-subtab="gdelt">🌐 GDELT</button>
        </div>
        
        <div id="sources-filters"></div>
        <div id="sources-table"></div>
        
        <style>
            .mini-tab-nav {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                background: white;
                padding: 10px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .mini-tab-btn {
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
            
            .mini-tab-btn:hover {
                border-color: #667eea;
                color: #667eea;
            }
            
            .mini-tab-btn.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .sources-table {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            
            .sources-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .sources-table th {
                padding: 12px;
                text-align: left;
                background: #f8f9fa;
                font-weight: 600;
                border-bottom: 2px solid #e0e0e0;
                white-space: nowrap;
            }
            
            .sources-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .sources-table tr:hover {
                background: #f8f9fa;
            }
            
            .source-name {
                font-weight: 500;
                color: #333;
                max-width: 300px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .btn-action {
                padding: 6px 12px;
                border: 1px solid #667eea;
                border-radius: 4px;
                background: white;
                color: #667eea;
                cursor: pointer;
                font-size: 12px;
            }
            
            .btn-action:hover {
                background: #667eea;
                color: white;
            }
        </style>
    `;
    
    // Mini-tab switching
    document.querySelectorAll('.mini-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mini-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSubTab = btn.dataset.subtab;
            renderTable();
        });
    });
    
    // Create filter panel
    const filterContainer = document.getElementById('sources-filters');
    const filterPanel = createFilterPanel([
        { name: 'name', label: 'Name', type: 'text' },
        { 
            name: 'type', 
            label: 'Type', 
            type: 'select',
            options: ['rss', 'google', 'newsapi', 'gdelt']
        },
        { 
            name: 'tier', 
            label: 'Tier', 
            type: 'select',
            options: ['1', '2', '3']
        },
        { 
            name: 'status', 
            label: 'Status', 
            type: 'select',
            options: ['Active', 'Inactive', 'Error']
        }
    ], handleFilter);
    
    filterContainer.appendChild(filterPanel);
    
    // Load data
    await loadSources();
    
    // Expose functions
    window.sourcesExport = exportSources;
    window.sourcesRefresh = loadSources;
}

/**
 * Load sources from API
 */
async function loadSources() {
    try {
        const response = await fetch(`${API_BASE}/sources`);
        allSources = await response.json();
        renderTable();
        showToast('Sources loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load sources:', error);
        showToast('Failed to load sources', 'error');
    }
}

/**
 * Handle filter changes
 */
function handleFilter(filters) {
    renderTable(filters);
}

/**
 * Handle column sort
 */
function handleSort(key, direction) {
    currentSort = { key, direction };
    renderTable();
}

/**
 * Render sources table based on current sub-tab
 */
function renderTable(filters = {}) {
    const tableContainer = document.getElementById('sources-table');
    
    // Filter by current sub-tab
    let sources = allSources.filter(s => s.type === currentSubTab);
    
    // Apply additional filters
    sources = filterData(sources, filters);
    
    // Apply sort
    if (currentSort.direction !== 'none') {
        sources = sortData(sources, currentSort.key, currentSort.direction);
    }
    
    if (sources.length === 0) {
        tableContainer.innerHTML = `
            <div class="sources-table">
                <p style="padding: 40px; text-align: center; color: #999;">
                    No ${currentSubTab.toUpperCase()} sources found
                </p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'tier', label: 'Tier' },
        { key: 'status', label: 'Status' },
        { key: 'articles_found', label: 'Found' },
        { key: 'articles_inserted', label: 'Inserted' },
        { key: 'last_run', label: 'Last Run' },
        { key: 'actions', label: 'Actions' }
    ];
    
    columns.forEach(col => {
        if (col.key === 'actions') {
            const th = document.createElement('th');
            th.textContent = col.label;
            headerRow.appendChild(th);
        } else {
            const th = createSortableHeaderCell(col.label, col.key);
            headerRow.appendChild(th);
        }
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    sources.forEach(source => {
        const row = document.createElement('tr');
        
        // Name
        const nameCell = document.createElement('td');
        nameCell.innerHTML = `<div class="source-name" title="${source.name}">${source.name}</div>`;
        row.appendChild(nameCell);
        
        // Type
        const typeCell = document.createElement('td');
        typeCell.textContent = source.type.toUpperCase();
        row.appendChild(typeCell);
        
        // Tier
        const tierCell = document.createElement('td');
        tierCell.textContent = `Tier ${source.tier || 'N/A'}`;
        row.appendChild(tierCell);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = createStatusBadge(source.status || 'Active');
        row.appendChild(statusCell);
        
        // Found
        const foundCell = document.createElement('td');
        foundCell.textContent = source.articles_found || 0;
        row.appendChild(foundCell);
        
        // Inserted
        const insertedCell = document.createElement('td');
        insertedCell.textContent = source.articles_inserted || 0;
        row.appendChild(insertedCell);
        
        // Last Run
        const lastRunCell = document.createElement('td');
        lastRunCell.textContent = formatDate(source.last_run);
        row.appendChild(lastRunCell);
        
        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <button class="btn-action" onclick="window.testSource(${source.id})">Test</button>
        `;
        row.appendChild(actionsCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    tableContainer.innerHTML = '<div class="sources-table"></div>';
    tableContainer.querySelector('.sources-table').appendChild(table);
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
        
        // Update all icons
        document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
        const icon = th.querySelector('.sort-icon');
        if (direction === 'asc') icon.textContent = '↑';
        else if (direction === 'desc') icon.textContent = '↓';
        
        handleSort(key, direction);
    });
    
    return th;
}

/**
 * Export sources to CSV
 */
function exportSources() {
    const sources = allSources.filter(s => s.type === currentSubTab);
    
    const exportData = sources.map(source => ({
        Name: source.name,
        Type: source.type,
        Tier: source.tier,
        Status: source.status,
        'Articles Found': source.articles_found,
        'Articles Inserted': source.articles_inserted,
        'Last Run': formatDate(source.last_run)
    }));
    
    const filename = `sources_${currentSubTab}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
    showToast('CSV exported successfully', 'success');
}

/**
 * Test source (placeholder)
 */
window.testSource = async (sourceId) => {
    showToast('Testing source...', 'info');
    try {
        const response = await fetch(`${API_BASE}/sources/${sourceId}/test`, {
            method: 'POST'
        });
        const result = await response.json();
        showToast(`Test completed: ${result.message}`, 'success');
    } catch (error) {
        showToast('Test failed', 'error');
    }
};