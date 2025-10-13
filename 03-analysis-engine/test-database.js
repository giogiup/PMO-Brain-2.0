const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function processDiscoveryResults() {
    // Read the discovery results file
    const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
    const files = fs.readdirSync(stagingDir);
    const latestFile = files.filter(f => f.startsWith('discovery-')).sort().pop();
    
    if (!latestFile) {
        console.log('No discovery results found');
        return;
    }
    
    console.log(`Processing ${latestFile}...`);
    const discoveryData = JSON.parse(fs.readFileSync(path.join(stagingDir, latestFile)));
    const articles = discoveryData.articles;
    
    console.log(`Found ${articles.length} articles to analyze`);
    
    // Send to analysis server in batches
    const batchSize = 10;
    for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize);
        
        try {
            const response = await fetch('http://localhost:3003/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articles: batch })
            });
            
            const results = await response.json();
            console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${results.results.length} articles analyzed`);
            
        } catch (error) {
            console.error(`Error analyzing batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        }
    }
}

processDiscoveryResults();