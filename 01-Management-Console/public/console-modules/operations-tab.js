/**
 * Operations Tab Module
 * Displays system operation logs with collapsible filters
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

let allOperations = [];
let filteredOperations = [];
let currentSort = { key: null, direction: 'none' };

/**
 * Initialize Operations Tab
 */
export async function init() {
    const container = document.getElementById('operations-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>⚙️ System Operations</h2>
            <div class="header-actions">
                <button class="btn-export" onclick="window.operationsExport()">📥 Export CSV</button>
                <button class="btn-refresh" onclick="window.operationsRefresh()">🔄 Refresh</button>
                <button class="btn-clear" onclick="window.operationsClear()">🗑️ Clear Logs</button>
            </div>
        </div>
        
        <div id="operations-filters"></div>
        <div id="operations-table"></div>
        
        <style>
            .btn-clear {
                background: #dc3545;
                color: white;
            }
            
            .btn-clear:hover {
                background: #c82333;
            }
            
            .operations-table {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            
            .operations-table table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            
            .operations-table th {
                padding: 10px;
                text-align: left;
                background: #f8f9fa;
                font-weight: 600;
                border-bottom: 2px solid #e0e0e0;
                white-space: nowrap;
            }
            
            .operations-table td {
                padding: 10px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .operations-table tr:hover {
                background: #f8f9fa;
            }
            
            .operation-message {
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .duration-badge {
                background: #f0f0f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
            }
        </style>
    `;
    
    // Create filter panel
    const filterContainer = document.getElementById('operations-filters');
    const filterPanel = createFilterPanel([
        { name: 'operation', label: 'Operation', type: 'text' },
        { name: 'component', label: 'Component', type: 'text' },
        { 
            name: 'status', 
            label: 'Status', 
            type: 'select',
            options: ['Success', 'Failed', 'Running', 'Pending']
        },
        { name: 'message', label: 'Message', type: 'text' }
    ], handleFilter);
    
    filterContainer.appendChild(filterPanel);
    
    // Load data
    await loadOperations();
    
    // Expose functions
    window.operationsExport = exportOperations;
    window.operationsRefresh = loadOperations;
    window.operationsClear = clearLogs;
}

/**
 * Load operations from API
 */
async function loadOperations() {
    try {
        const response = await fetch(`${API_BASE}/operations`);
        allOperations = await response.json();
        filteredOperations = [...allOperations];
        renderTable();
        showToast('Operations loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load operations:', error);
        showToast('Failed to load operations', 'error');
    }
}

/**
 * Handle filter changes
 */
function handleFilter(filters) {
    filteredOperations = filterData(allOperations, filters);
    
    // Apply current sort
    if (currentSort.direction !== 'none') {
        filteredOperations = sortData(filteredOperations, currentSort.key, currentSort.direction);
    }
    
    renderTable();
}

/**
 * Handle column sort
 */
function handleSort(key, direction) {
    currentSort = { key, direction };
    
    if (direction === 'none') {
        filteredOperations = [...allOperations];
    } else {
        filteredOperations = sortData(filteredOperations, key, direction);
    }
    
    renderTable();
}

/**
 * Render operations table
 */
function renderTable() {
    const tableContainer = document.getElementById('operations-table');
    
    if (filteredOperations.length === 0) {
        tableContainer.innerHTML = `
            <div class="operations-table">
                <p style="padding: 40px; text-align: center; color: #999;">No operations found</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const columns = [
        { key: 'timestamp', label: 'Time' },
        { key: 'operation', label: 'Operation' },
        { key: 'component', label: 'Component' },
        { key: 'status', label: 'Status' },
        { key: 'message', label: 'Message' },
        { key: 'records', label: 'Records' },
        { key: 'duration', label: 'Duration' }
    ];
    
    columns.forEach(col => {
        const th = createSortableHeaderCell(col.label, col.key);
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    filteredOperations.forEach(op => {
        const row = document.createElement('tr');
        
        // Time
        const timeCell = document.createElement('td');
        timeCell.textContent = formatDate(op.timestamp);
        row.appendChild(timeCell);
        
        // Operation
        const operationCell = document.createElement('td');
        operationCell.textContent = op.operation || 'N/A';
        row.appendChild(operationCell);
        
        // Component
        const componentCell = document.createElement('td');
        componentCell.textContent = op.component || 'N/A';
        row.appendChild(componentCell);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = createStatusBadge(op.status || 'Unknown');
        row.appendChild(statusCell);
        
        // Message
        const messageCell = document.createElement('td');
        messageCell.innerHTML = `
            <div class="operation-message" title="${op.message || ''}">${op.message || 'N/A'}</div>
        `;
        row.appendChild(messageCell);
        
        // Records
        const recordsCell = document.createElement('td');
        recordsCell.textContent = op.records || 0;
        row.appendChild(recordsCell);
        
        // Duration
        const durationCell = document.createElement('td');
        durationCell.innerHTML = `
            <span class="duration-badge">${formatDuration(op.duration)}</span>
        `;
        row.appendChild(durationCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    tableContainer.innerHTML = '<div class="operations-table"></div>';
    tableContainer.querySelector('.operations-table').appendChild(table);
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
        
        // Update icons
        document.querySelectorAll('.sort-icon').forEach(icon => icon.textContent = '↕');
        const icon = th.querySelector('.sort-icon');
        if (direction === 'asc') icon.textContent = '↑';
        else if (direction === 'desc') icon.textContent = '↓';
        
        handleSort(key, direction);
    });
    
    return th;
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
 * Export operations to CSV
 */
function exportOperations() {
    const exportData = filteredOperations.map(op => ({
        Time: formatDate(op.timestamp),
        Operation: op.operation,
        Component: op.component,
        Status: op.status,
        Message: op.message,
        Records: op.records,
        Duration: formatDuration(op.duration)
    }));
    
    const filename = `operations_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
    showToast('CSV exported successfully', 'success');
}

/**
 * Clear operation logs
 */
async function clearLogs() {
    if (!confirm('Are you sure you want to clear all operation logs?')) return;
    
    try {
        await fetch(`${API_BASE}/operations`, { method: 'DELETE' });
        allOperations = [];
        filteredOperations = [];
        renderTable();
        showToast('Logs cleared successfully', 'success');
    } catch (error) {
        showToast('Failed to clear logs', 'error');
    }
}