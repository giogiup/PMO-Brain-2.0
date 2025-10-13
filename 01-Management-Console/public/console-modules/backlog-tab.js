/**
 * Backlog Tab Module
 * Displays development backlog with button group filters
 */

import { 
    API_BASE, 
    createStatusBadge, 
    exportToCSV,
    sortData,
    formatDate,
    showToast
} from './shared-utils.js';

let allBacklogItems = [];
let filteredItems = [];
let currentFilters = {
    priority: 'All',
    category: 'All'
};
let currentSort = { key: null, direction: 'none' };

import { injectThemeCSS } from './shared-utils.js';   // ✅ add this import at the top

/**
 * Initialize Backlog Tab
 */
export async function init() {
    injectThemeCSS(); // ✅ Apply dark glasmorphic theme before rendering

    const container = document.getElementById('backlog-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>📋 Development Backlog</h2>
            <div class="header-actions">
                <button class="btn-export" onclick="window.backlogExport()">📥 Export CSV</button>
                <button class="btn-refresh" onclick="window.backlogRefresh()">🔄 Refresh</button>
                <button class="btn-add" onclick="window.backlogAdd()">➕ Add Item</button>
            </div>
        </div>
        ...
    `;
}
        
        <!-- Button Group Filters -->
        <div class="filter-groups">
            <div class="filter-group">
                <label class="filter-label">Priority</label>
                <div class="button-group" id="priority-filters">
                    <button class="filter-btn" data-value="All">All</button>
                    <button class="filter-btn" data-value="Critical">Critical</button>
                    <button class="filter-btn" data-value="High">High</button>
                    <button class="filter-btn" data-value="Medium">Medium</button>
                    <button class="filter-btn" data-value="Low">Low</button>
                    <button class="filter-btn" data-value="None">None</button>
                </div>
            </div>
            
            <div class="filter-group">
                <label class="filter-label">Category</label>
                <div class="button-group" id="category-filters">
                    <button class="filter-btn" data-value="All">All</button>
                    <button class="filter-btn" data-value="Website">Website</button>
                    <button class="filter-btn" data-value="Prompts">Prompts</button>
                    <button class="filter-btn" data-value="Discovery Engine">Discovery</button>
                    <button class="filter-btn" data-value="Newsletter Engine">Newsletter</button>
                    <button class="filter-btn" data-value="Analysis Engine">Analysis</button>
                    <button class="filter-btn" data-value="Database">Database</button>
                    <button class="filter-btn" data-value="Automation">Automation</button>
                    <button class="filter-btn" data-value="Deployment">Deployment</button>
                    <button class="filter-btn" data-value="General">General</button>
                    <button class="filter-btn" data-value="None">None</button>
                </div>
            </div>
        </div>
        
        <div id="backlog-table"></div>
        
        <style>
            .btn-add {
                background: #28a745;
                color: white;
            }
            
            .btn-add:hover {
                background: #218838;
            }
            
            .filter-groups {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .filter-group {
                margin-bottom: 15px;
            }
            
            .filter-group:last-child {
                margin-bottom: 0;
            }
            
            .filter-label {
                display: block;
                font-size: 14px;
                font-weight: 600;
                color: #333;
                margin-bottom: 8px;
            }
            
            .button-group {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .filter-btn {
                padding: 8px 16px;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                color: #666;
                transition: all 0.2s ease;
            }
            
            .filter-btn:hover {
                border-color: #667eea;
                color: #667eea;
            }
            
            .filter-btn.active {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }
            
            .backlog-table {
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            
            .backlog-table table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .backlog-table th {
                padding: 12px;
                text-align: left;
                background: #f8f9fa;
                font-weight: 600;
                border-bottom: 2px solid #e0e0e0;
            }
            
            .backlog-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }
            
            .backlog-table tr:hover {
                background: #f8f9fa;
            }
            
            .item-description {
                max-width: 400px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .priority-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                display: inline-block;
            }
            
            .priority-critical {
                background: #dc3545;
                color: white;
            }
            
            .priority-high {
                background: #fd7e14;
                color: white;
            }
            
            .priority-medium {
                background: #ffc107;
                color: #333;
            }
            
            .priority-low {
                background: #6c757d;
                color: white;
            }
        </style>
    `;
    
    // Set up button group filters
    setupButtonFilters('priority-filters', 'priority');
    setupButtonFilters('category-filters', 'category');
    
    // Load data
    await loadBacklog();
    
    // Expose functions
    window.backlogExport = exportBacklog;
    window.backlogRefresh = loadBacklog;
    window.backlogAdd = addBacklogItem;
}

/**
 * Setup button group filter logic
 */
function setupButtonFilters(groupId, filterType) {
    const group = document.getElementById(groupId);
    const buttons = group.querySelectorAll('.filter-btn');
    
    // Set first button (All) as active by default
    buttons[0].classList.add('active');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all buttons in this group
            buttons.forEach(b => b.classList.remove('active'));
            
            // Set clicked button as active
            btn.classList.add('active');
            
            // Update filter
            currentFilters[filterType] = btn.dataset.value;
            applyFilters();
        });
    });
}

/**
 * Load backlog from API
 */
async function loadBacklog() {
    try {
        const response = await fetch(`${API_BASE}/backlog`);
        allBacklogItems = await response.json();
        applyFilters();
        showToast('Backlog loaded successfully', 'success');
    } catch (error) {
        console.error('Failed to load backlog:', error);
        showToast('Failed to load backlog', 'error');
    }
}

/**
 * Apply current filters
 */
function applyFilters() {
    filteredItems = allBacklogItems.filter(item => {
        const priorityMatch = currentFilters.priority === 'All' || 
                             item.priority === currentFilters.priority;
        const categoryMatch = currentFilters.category === 'All' || 
                             item.category === currentFilters.category;
        return priorityMatch && categoryMatch;
    });
    
    // Apply sort if active
    if (currentSort.direction !== 'none') {
        filteredItems = sortData(filteredItems, currentSort.key, currentSort.direction);
    }
    
    renderTable();
}

/**
 * Handle column sort
 */
function handleSort(key, direction) {
    currentSort = { key, direction };
    applyFilters();
}

/**
 * Render backlog table
 */
function renderTable() {
    const tableContainer = document.getElementById('backlog-table');
    
    if (filteredItems.length === 0) {
        tableContainer.innerHTML = `
            <div class="backlog-table">
                <p style="padding: 40px; text-align: center; color: #999;">No backlog items found</p>
            </div>
        `;
        return;
    }
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const columns = [
        { key: 'priority', label: 'Priority' },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
        { key: 'created_date', label: 'Created' }
    ];
    
    columns.forEach(col => {
        const th = createSortableHeaderCell(col.label, col.key);
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    filteredItems.forEach(item => {
        const row = document.createElement('tr');
        
        // Priority
        const priorityCell = document.createElement('td');
        const priorityClass = `priority-${(item.priority || 'low').toLowerCase()}`;
        priorityCell.innerHTML = `
            <span class="priority-badge ${priorityClass}">${item.priority || 'None'}</span>
        `;
        row.appendChild(priorityCell);
        
        // Category
        const categoryCell = document.createElement('td');
        categoryCell.textContent = item.category || 'None';
        row.appendChild(categoryCell);
        
        // Description
        const descCell = document.createElement('td');
        descCell.innerHTML = `
            <div class="item-description" title="${item.description}">${item.description}</div>
        `;
        row.appendChild(descCell);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.innerHTML = createStatusBadge(item.status || 'Pending');
        row.appendChild(statusCell);
        
        // Created Date
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(item.created_date);
        row.appendChild(dateCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    tableContainer.innerHTML = '<div class="backlog-table"></div>';
    tableContainer.querySelector('.backlog-table').appendChild(table);
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
 * Export backlog to CSV
 */
function exportBacklog() {
    const exportData = filteredItems.map(item => ({
        Priority: item.priority,
        Category: item.category,
        Description: item.description,
        Status: item.status,
        Created: formatDate(item.created_date)
    }));
    
    const filename = `backlog_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(exportData, filename);
    showToast('CSV exported successfully', 'success');
}

/**
 * Add backlog item (placeholder)
 */
function addBacklogItem() {
    showToast('Add item modal - Coming soon', 'info');
}