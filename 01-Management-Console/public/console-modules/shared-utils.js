/**
 * Shared Utilities for SmartPMO Console
 * Common functions used across all tab modules
 */

// API base URL
export const API_BASE = 'http://localhost:8080/api';

/**
 * Create color-coded status badge
 * @param {string} status - Status text
 * @returns {string} HTML string for badge
 */
export function createStatusBadge(status) {
    const statusLower = status.toLowerCase();
    let color = '#6c757d'; // gray default
    
    // Success states (green)
    if (['success', 'approved', 'active', 'completed', 'done'].includes(statusLower)) {
        color = '#28a745';
    }
    // Warning states (yellow)
    else if (['pending', 'processing', 'queued', 'waiting'].includes(statusLower)) {
        color = '#ffc107';
    }
    // Error states (red)
    else if (['failed', 'error', 'rejected', 'inactive', 'blocked'].includes(statusLower)) {
        color = '#dc3545';
    }
    // Info states (blue)
    else if (['running', 'in progress', 'active'].includes(statusLower)) {
        color = '#17a2b8';
    }
    
    return `<span style="
        background: ${color};
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
        display: inline-block;
    ">${status}</span>`;
}

/**
 * Export table data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} filename - CSV filename
 */
export function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    let csv = headers.join(',') + '\n';
    
    data.forEach(row => {
        const values = headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csv += values.join(',') + '\n';
    });
    
    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

/**
 * Create sortable table header
 * @param {string} text - Header text
 * @param {string} key - Data key for sorting
 * @param {Function} onSort - Sort callback
 * @returns {HTMLElement} Table header element
 */
export function createSortableHeader(text, key, onSort) {
    const th = document.createElement('th');
    th.style.cssText = `
        padding: 12px;
        text-align: left;
        background: #f8f9fa;
        cursor: pointer;
        user-select: none;
        position: relative;
        font-weight: 600;
    `;
    
    th.innerHTML = `
        ${text}
        <span class="sort-icon" style="margin-left: 5px; color: #999;">↕</span>
    `;
    
    let sortDirection = 'none'; // none, asc, desc
    
    th.addEventListener('click', () => {
        // Cycle through: none -> asc -> desc -> none
        if (sortDirection === 'none') sortDirection = 'asc';
        else if (sortDirection === 'asc') sortDirection = 'desc';
        else sortDirection = 'none';
        
        // Update icon
        const icon = th.querySelector('.sort-icon');
        if (sortDirection === 'asc') icon.textContent = '↑';
        else if (sortDirection === 'desc') icon.textContent = '↓';
        else icon.textContent = '↕';
        
        onSort(key, sortDirection);
    });
    
    return th;
}

/**
 * Sort array of objects by key
 * @param {Array} data - Data to sort
 * @param {string} key - Object key to sort by
 * @param {string} direction - 'asc', 'desc', or 'none'
 * @returns {Array} Sorted data
 */
export function sortData(data, key, direction) {
    if (direction === 'none') return data;
    
    return [...data].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        // Handle null/undefined
        if (valA == null) return 1;
        if (valB == null) return -1;
        
        // Try numeric sort first
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return direction === 'asc' ? numA - numB : numB - numA;
        }
        
        // Date sort
        const dateA = new Date(valA);
        const dateB = new Date(valB);
        if (!isNaN(dateA) && !isNaN(dateB)) {
            return direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        
        // String sort
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        
        if (direction === 'asc') {
            return valA < valB ? -1 : valA > valB ? 1 : 0;
        } else {
            return valA > valB ? -1 : valA < valB ? 1 : 0;
        }
    });
}

/**
 * Filter data based on filter object
 * @param {Array} data - Data to filter
 * @param {Object} filters - Filter key-value pairs
 * @returns {Array} Filtered data
 */
export function filterData(data, filters) {
    return data.filter(item => {
        return Object.entries(filters).every(([key, filterValue]) => {
            if (!filterValue || filterValue === '') return true;
            
            const itemValue = String(item[key] || '').toLowerCase();
            const filter = String(filterValue).toLowerCase();
            
            return itemValue.includes(filter);
        });
    });
}

/**
 * Create collapsible filter panel
 * @param {Array} fields - Array of {name, label, type} objects
 * @param {Function} onFilter - Filter callback
 * @returns {HTMLElement} Filter panel element
 */
export function createFilterPanel(fields, onFilter) {
    const panel = document.createElement('div');
    panel.className = 'filter-panel';
    
    let isExpanded = false;
    
    panel.innerHTML = `
        <style>
            .filter-panel {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            
            .filter-header {
                padding: 15px 20px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8f9fa;
                border-radius: 8px 8px 0 0;
            }
            
            .filter-header:hover {
                background: #e9ecef;
            }
            
            .filter-content {
                padding: 20px;
                display: none;
                border-top: 1px solid #e0e0e0;
            }
            
            .filter-content.expanded {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .filter-field {
                display: flex;
                flex-direction: column;
            }
            
            .filter-field label {
                font-size: 12px;
                font-weight: 600;
                color: #666;
                margin-bottom: 5px;
            }
            
            .filter-field input,
            .filter-field select {
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .filter-actions {
                grid-column: 1 / -1;
                display: flex;
                gap: 10px;
                margin-top: 10px;
            }
            
            .filter-actions button {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }
            
            .btn-apply {
                background: #667eea;
                color: white;
            }
            
            .btn-clear {
                background: #e0e0e0;
                color: #333;
            }
        </style>
        
        <div class="filter-header">
            <span><strong>🔍 Filters</strong></span>
            <span class="toggle-icon">▼</span>
        </div>
        
        <div class="filter-content">
            ${fields.map(field => `
                <div class="filter-field">
                    <label>${field.label}</label>
                    ${field.type === 'select' ? 
                        `<select id="filter-${field.name}">
                            <option value="">All</option>
                            ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                        </select>` :
                        `<input type="${field.type || 'text'}" id="filter-${field.name}" placeholder="Filter ${field.label}...">`
                    }
                </div>
            `).join('')}
            
            <div class="filter-actions">
                <button class="btn-apply">Apply Filters</button>
                <button class="btn-clear">Clear All</button>
            </div>
        </div>
    `;
    
    // Toggle filter panel
    const header = panel.querySelector('.filter-header');
    const content = panel.querySelector('.filter-content');
    const icon = panel.querySelector('.toggle-icon');
    
    header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        content.classList.toggle('expanded', isExpanded);
        icon.textContent = isExpanded ? '▲' : '▼';
    });
    
    // Apply filters
    panel.querySelector('.btn-apply').addEventListener('click', () => {
        const filters = {};
        fields.forEach(field => {
            const input = document.getElementById(`filter-${field.name}`);
            filters[field.name] = input.value;
        });
        onFilter(filters);
    });
    
    // Clear filters
    panel.querySelector('.btn-clear').addEventListener('click', () => {
        fields.forEach(field => {
            document.getElementById(`filter-${field.name}`).value = '';
        });
        onFilter({});
    });
    
    return panel;
}

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d)) return date;
    
    const now = new Date();
    const diff = now - d;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
        if (hours < 1) return 'Just now';
        return `${hours}h ago`;
    }
    
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'info'
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

//Added in by CHATGPT - can always delete is needed##########################
// --- Inject global SmartPMO dark glasmorphic theme ---
export function injectThemeCSS() {
  if (document.getElementById('smartpmo-theme')) return;

  const style = document.createElement('style');
  style.id = 'smartpmo-theme';
  style.textContent = `
    /* General dark background */
    body, .tab-content {
      color: var(--text-light) !important;
      background: var(--bg-dark) !important;
    }

    /* Glasmorphic panels */
    .tab-content, .discovery-table, .filter-panel, .data-table {
      background: var(--glass-bg) !important;
      backdrop-filter: blur(var(--blur));
      border: 1px solid var(--glass-border);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow);
      color: var(--text-light);
    }

    /* Headings + labels for better contrast */
    h1, h2, h3, label {
      color: var(--accent-yellow) !important;
      letter-spacing: 0.3px;
    }

    /* Filter inputs and dropdowns */
    input[type="text"], 
    input[type="number"], 
    input[type="date"], 
    select {
      background: rgba(255,255,255,0.08);
      color: var(--text-light);
      border: 1px solid var(--glass-border);
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 14px;
      outline: none;
      transition: border 0.2s ease, background 0.2s ease;
    }

    input:focus, select:focus {
      border-color: var(--accent-orange);
      background: rgba(255,255,255,0.15);
    }

    select option {
      background: var(--bg-panel);
      color: var(--text-light);
    }

    /* Table styling */
    table {
      width: 100%;
      border-collapse: collapse;
      color: var(--text-light);
    }
    th {
      background: rgba(255,255,255,0.08);
      color: var(--accent-yellow) !important;
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid var(--glass-border);
    }
    td {
      border-bottom: 1px solid var(--glass-border);
      color: var(--text-light);
    }
    tr:hover {
      background: rgba(255,255,255,0.05);
    }

    /* Buttons (unified accent + hover motion) */
    button, .btn, .header-actions button {
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    /* Default red/orange button */
    button, .header-actions button {
      background: var(--accent-red);
      color: #fff;
    }

    button:hover, .header-actions button:hover {
      background: var(--accent-orange);
      transform: translateY(-2px);
      box-shadow: 0 0 10px rgba(255,150,0,0.5);
    }

    /* Green export button (light background → dark text) */
    .btn-export {
      background: var(--accent-green) !important;
      color: #000 !important;
    }
    .btn-export:hover {
      background: #2ecc71 !important;
      color: #000 !important;
    }

    /* Yellow refresh button (light background → dark text) */
    .btn-refresh {
      background: var(--accent-yellow) !important;
      color: #000 !important;
    }
    .btn-refresh:hover {
      background: var(--accent-orange) !important;
      color: #000 !important;
    }

    /* Sort icons + clickable titles */
    .sort-icon, .article-title {
      color: var(--accent-yellow) !important;
    }

    /* Article title link hover */
    .article-title:hover {
      color: var(--accent-orange);
      text-decoration: underline;
    }

    /* Emoji icons and headings */
    button, h2, .header-actions button {
      font-size: 16px !important;
    }
    .tab-header h2 {
      font-size: 22px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;
  document.head.appendChild(style);
}