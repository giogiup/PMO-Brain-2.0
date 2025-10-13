/**
 * Pre-Filter Configuration Tab Module
 * Configure pre-filter settings with 2-column table layout
 */

import { 
    API_BASE,
    showToast
} from './shared-utils.js';

let currentConfig = {};

/**
 * Initialize Pre-Filter Config Tab
 */
export async function init() {
    const container = document.getElementById('prefilter-tab');
    
    container.innerHTML = `
        <div class="tab-header">
            <h2>🎯 Pre-Filter Configuration</h2>
            <div class="header-actions">
                <button class="btn-save" onclick="window.prefilterSave()">💾 Save Configuration</button>
                <button class="btn-reset" onclick="window.prefilterReset()">↺ Reset to Defaults</button>
            </div>
        </div>
        
        <div class="config-container">
            <div class="config-section">
                <h3>📝 Keyword Filters</h3>
                <table class="config-table">
                    <tr>
                        <td class="label-col">Required Keywords</td>
                        <td class="input-col">
                            <input type="text" id="required-keywords" 
                                   placeholder="ai, automation, pmo, project management">
                            <span class="help-text">Comma-separated. Articles must contain at least one.</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-col">Excluded Keywords</td>
                        <td class="input-col">
                            <input type="text" id="excluded-keywords" 
                                   placeholder="spam, crypto, gambling">
                            <span class="help-text">Comma-separated. Articles with these will be rejected.</span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="config-section">
                <h3>🌐 Domain Filters</h3>
                <table class="config-table">
                    <tr>
                        <td class="label-col">Allowed Domains</td>
                        <td class="input-col">
                            <input type="text" id="allowed-domains" 
                                   placeholder="medium.com, techcrunch.com, forbes.com">
                            <span class="help-text">Comma-separated. Leave empty to allow all.</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-col">Blocked Domains</td>
                        <td class="input-col">
                            <input type="text" id="blocked-domains" 
                                   placeholder="clickbait.com, spam-site.com">
                            <span class="help-text">Comma-separated. These domains will be rejected.</span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="config-section">
                <h3>📊 Scoring Thresholds</h3>
                <table class="config-table">
                    <tr>
                        <td class="label-col">Minimum Score</td>
                        <td class="input-col">
                            <input type="number" id="min-score" min="0" max="100" 
                                   placeholder="70">
                            <span class="help-text">Articles below this score will be rejected (0-100).</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-col">Maximum Age (hours)</td>
                        <td class="input-col">
                            <input type="number" id="max-age" min="1" 
                                   placeholder="24">
                            <span class="help-text">Only include articles from last N hours.</span>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="config-section">
                <h3>⚙️ Advanced Settings</h3>
                <table class="config-table">
                    <tr>
                        <td class="label-col">Content Length (min)</td>
                        <td class="input-col">
                            <input type="number" id="min-content-length" min="0" 
                                   placeholder="200">
                            <span class="help-text">Minimum character count for article content.</span>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-col">Duplicate Detection</td>
                        <td class="input-col">
                            <label class="checkbox-label">
                                <input type="checkbox" id="enable-duplicate-detection" checked>
                                Enable duplicate article detection
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <td class="label-col">Language Filter</td>
                        <td class="input-col">
                            <select id="language-filter">
                                <option value="all">All Languages</option>
                                <option value="en" selected>English Only</option>
                                <option value="multi">English + Major Languages</option>
                            </select>
                        </td>
                    </tr>
                </table>
            </div>
        </div>
        
        <style>
            .btn-save {
                background: #28a745;
                color: white;
            }
            
            .btn-save:hover {
                background: #218838;
            }
            
            .btn-reset {
                background: #6c757d;
                color: white;
            }
            
            .btn-reset:hover {
                background: #5a6268;
            }
            
            .config-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .config-section {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .config-section h3 {
                font-size: 16px;
                color: #333;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #f0f0f0;
            }
            
            .config-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .config-table tr {
                border-bottom: 1px solid #f0f0f0;
            }
            
            .config-table tr:last-child {
                border-bottom: none;
            }
            
            .label-col {
                width: 250px;
                padding: 15px 20px 15px 0;
                font-weight: 600;
                color: #333;
                vertical-align: top;
            }
            
            .input-col {
                padding: 15px 0;
            }
            
            .input-col input[type="text"],
            .input-col input[type="number"],
            .input-col select {
                width: 100%;
                max-width: 600px;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                font-family: 'Segoe UI', sans-serif;
            }
            
            .input-col input[type="text"]:focus,
            .input-col input[type="number"]:focus,
            .input-col select:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .help-text {
                display: block;
                font-size: 12px;
                color: #999;
                margin-top: 5px;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-size: 14px;
            }
            
            .checkbox-label input[type="checkbox"] {
                margin-right: 8px;
                width: 18px;
                height: 18px;
                cursor: pointer;
            }
            
            @media (max-width: 768px) {
                .config-table {
                    display: block;
                }
                
                .config-table tr {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 15px;
                }
                
                .label-col,
                .input-col {
                    width: 100%;
                    padding: 5px 0;
                }
            }
        </style>
    `;
    
    // Load current configuration
    await loadConfig();
    
    // Expose functions
    window.prefilterSave = saveConfig;
    window.prefilterReset = resetConfig;
}

/**
 * Load configuration from API
 */
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/prefilter/config`);
        currentConfig = await response.json();
        populateForm(currentConfig);
        showToast('Configuration loaded', 'success');
    } catch (error) {
        console.error('Failed to load configuration:', error);
        showToast('Failed to load configuration', 'error');
        // Load defaults if API fails
        populateForm(getDefaultConfig());
    }
}

/**
 * Populate form with configuration values
 */
function populateForm(config) {
    document.getElementById('required-keywords').value = 
        config.required_keywords ? config.required_keywords.join(', ') : '';
    
    document.getElementById('excluded-keywords').value = 
        config.excluded_keywords ? config.excluded_keywords.join(', ') : '';
    
    document.getElementById('allowed-domains').value = 
        config.allowed_domains ? config.allowed_domains.join(', ') : '';
    
    document.getElementById('blocked-domains').value = 
        config.blocked_domains ? config.blocked_domains.join(', ') : '';
    
    document.getElementById('min-score').value = config.min_score || 70;
    document.getElementById('max-age').value = config.max_age || 24;
    document.getElementById('min-content-length').value = config.min_content_length || 200;
    document.getElementById('enable-duplicate-detection').checked = 
        config.enable_duplicate_detection !== false;
    document.getElementById('language-filter').value = config.language_filter || 'en';
}

/**
 * Save configuration
 */
async function saveConfig() {
    const config = {
        required_keywords: parseCSV(document.getElementById('required-keywords').value),
        excluded_keywords: parseCSV(document.getElementById('excluded-keywords').value),
        allowed_domains: parseCSV(document.getElementById('allowed-domains').value),
        blocked_domains: parseCSV(document.getElementById('blocked-domains').value),
        min_score: parseInt(document.getElementById('min-score').value) || 70,
        max_age: parseInt(document.getElementById('max-age').value) || 24,
        min_content_length: parseInt(document.getElementById('min-content-length').value) || 200,
        enable_duplicate_detection: document.getElementById('enable-duplicate-detection').checked,
        language_filter: document.getElementById('language-filter').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/prefilter/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            currentConfig = config;
            showToast('Configuration saved successfully!', 'success');
        } else {
            throw new Error('Save failed');
        }
    } catch (error) {
        console.error('Failed to save configuration:', error);
        showToast('Failed to save configuration', 'error');
    }
}

/**
 * Reset to default configuration
 */
function resetConfig() {
    if (!confirm('Reset to default configuration? This will discard all changes.')) {
        return;
    }
    
    const defaults = getDefaultConfig();
    populateForm(defaults);
    showToast('Configuration reset to defaults', 'info');
}

/**
 * Parse CSV string to array
 */
function parseCSV(csvString) {
    if (!csvString || csvString.trim() === '') return [];
    return csvString.split(',').map(item => item.trim()).filter(item => item !== '');
}

/**
 * Get default configuration
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