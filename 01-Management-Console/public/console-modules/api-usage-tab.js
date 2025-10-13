// ============================================================================
// API USAGE TAB - Tracks all AI provider usage and costs
// ============================================================================

export async function init() {
    await loadAPIUsageTab();
}

export async function loadAPIUsageTab() {
    const container = document.getElementById('api-usage-tab');
    
    container.innerHTML = `
        <div class="api-usage-container">
            <h2>AI Provider Usage & Costs</h2>
            
            <div class="usage-summary">
                <div class="stat-card">
                    <h3>Today's Usage</h3>
                    <div id="today-stats"></div>
                </div>
                
                <div class="stat-card">
                    <h3>Provider Status</h3>
                    <div id="provider-status"></div>
                </div>
            </div>
            
            <div class="usage-details">
                <h3>Detailed Usage Log (Last 7 Days)</h3>
                <table id="usage-table" class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Provider</th>
                            <th>Use Case</th>
                            <th>Calls</th>
                            <th>Success Rate</th>
                            <th>Tokens In</th>
                            <th>Tokens Out</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody id="usage-tbody"></tbody>
                </table>
            </div>
            
            <style>
                .api-usage-container {
                    padding: 20px;
                }
                
                .usage-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                
                .stat-card {
                    background: #f5f5f5;
                    padding: 20px;
                    border-radius: 8px;
                }
                
                .provider-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    margin: 5px 0;
                    border-radius: 4px;
                    background: white;
                }
                
                .provider-row.paid {
                    background: #fff3cd;
                    border-left: 4px solid #ff6b6b;
                    font-weight: bold;
                }
                
                .provider-row.free {
                    background: #d4edda;
                    border-left: 4px solid #28a745;
                }
                
                .usage-bar {
                    width: 200px;
                    height: 20px;
                    background: #e0e0e0;
                    border-radius: 10px;
                    overflow: hidden;
                }
                
                .usage-bar-fill {
                    height: 100%;
                    background: #4CAF50;
                    transition: width 0.3s;
                }
                
                .usage-bar-fill.warning {
                    background: #ff9800;
                }
                
                .usage-bar-fill.danger {
                    background: #f44336;
                }
                
                .cost-highlight {
                    color: #d32f2f;
                    font-weight: bold;
                    font-size: 1.1em;
                }
                
                .data-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                }
                
                .data-table th,
                .data-table td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                
                .data-table th {
                    background: #f5f5f5;
                    font-weight: bold;
                }
                
                .data-table tr:hover {
                    background: #f9f9f9;
                }
            </style>
        </div>
    `;
    
    // Load data
    await loadUsageData();
    await loadProviderStatus();
}

async function loadUsageData() {
    try {
        const response = await fetch('/api/usage/stats?days=7');
        const data = await response.json();
        
        // Calculate today's totals
        const today = new Date().toISOString().split('T')[0];
        const todayData = data.filter(row => row.date === today);
        
        const todayTotals = todayData.reduce((acc, row) => ({
            calls: acc.calls + row.total_calls,
            cost: acc.cost + row.total_cost
        }), { calls: 0, cost: 0 });
        
        document.getElementById('today-stats').innerHTML = `
            <p><strong>Total API Calls:</strong> ${todayTotals.calls}</p>
            <p><strong>Total Cost:</strong> <span class="cost-highlight">$${todayTotals.cost.toFixed(4)}</span></p>
        `;
        
        // Populate table
        const tbody = document.getElementById('usage-tbody');
        tbody.innerHTML = data.map(row => `
            <tr>
                <td>${row.date}</td>
                <td>${row.provider_name}</td>
                <td>${row.use_case}</td>
                <td>${row.total_calls}</td>
                <td>${((row.successful_calls / row.total_calls) * 100).toFixed(1)}%</td>
                <td>${row.total_tokens_input.toLocaleString()}</td>
                <td>${row.total_tokens_output.toLocaleString()}</td>
                <td ${row.total_cost > 0 ? 'class="cost-highlight"' : ''}>
                    $${row.total_cost.toFixed(4)}
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load usage data:', error);
        showError('usage-tbody', error.message);
    }
}

async function loadProviderStatus() {
    try {
        const scoringResponse = await fetch('/api/usage/provider-status?useCase=scoring');
        const scoringStatus = await scoringResponse.json();
        
        const enrichmentResponse = await fetch('/api/usage/provider-status?useCase=enrichment');
        const enrichmentStatus = await enrichmentResponse.json();
        
        document.getElementById('provider-status').innerHTML = `
            <h4>Scoring Providers</h4>
            ${scoringStatus.map(provider => renderProviderStatus(provider)).join('')}
            
            <h4 style="margin-top: 20px">Enrichment Providers</h4>
            ${enrichmentStatus.map(provider => renderProviderStatus(provider)).join('')}
        `;
        
    } catch (error) {
        console.error('Failed to load provider status:', error);
    }
}

function renderProviderStatus(provider) {
    const percentage = (provider.usage / provider.limit) * 100;
    const barClass = percentage > 80 ? 'danger' : percentage > 50 ? 'warning' : '';
    const rowClass = provider.isPaid ? 'paid' : 'free';
    
    return `
        <div class="provider-row ${rowClass}">
            <div>
                <strong>${provider.provider.toUpperCase()}</strong>
                ${provider.isPaid ? ' 💰 PAID' : ''}
                <br>
                <small>Priority ${provider.priority} • ${provider.usage}/${provider.limit} used</small>
            </div>
            <div>
                <div class="usage-bar">
                    <div class="usage-bar-fill ${barClass}" style="width: ${percentage}%"></div>
                </div>
                <small>${provider.remaining} remaining</small>
            </div>
        </div>
    `;
}

function showError(elementId, message) {
    document.getElementById(elementId).innerHTML = `
        <tr><td colspan="8" style="text-align: center; color: red;">
            Error: ${message}
        </td></tr>
    `;
}
