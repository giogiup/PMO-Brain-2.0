const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class LocalPreFilter {
    constructor() {
        this.stats = {
            totalProcessed: 0,
            businessRelevant: 0,
            pmoRelevant: 0,
            topSelected: 0
        };
    }

    async processDiscoveryFile() {
        // Find latest discovery file
        const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-'));
        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        console.log(`Processing ${latestFile}...`);
        const discoveryData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = discoveryData.articles;
        
        console.log(`Found ${articles.length} articles for local pre-filtering`);
        
        // Stage 1: Business relevance filter
        const businessRelevant = [];
        for (const article of articles) {
            const isRelevant = await this.checkBusinessRelevance(article);
            if (isRelevant) {
                businessRelevant.push(article);
            }
        }
        
        console.log(`Stage 1 complete: ${businessRelevant.length}/${articles.length} business-relevant`);
        
        // Stage 2: PMO sphere scoring
        const scoredArticles = [];
        for (const article of businessRelevant) {
            const score = await this.scorePMORelevance(article);
            scoredArticles.push({ ...article, localScore: score });
        }
        
        // Select top 50
        const top50 = scoredArticles
            .sort((a, b) => b.localScore - a.localScore)
            .slice(0, 50);
            
        console.log(`Stage 2 complete: Top 50 selected for Hugging Face analysis`);
        console.log(`Top scores: ${top50.slice(0, 5).map(a => a.localScore).join(', ')}`);
        
        return top50;
    }

    async checkBusinessRelevance(article) {
        const content = `${article.title} ${article.summary || ''}`;
        const prompt = `Analyze this content for business/professional relevance:
Title: ${article.title}
Summary: ${article.summary}

Is this relevant to business operations, technology, management, or professional workflows? 
Respond: RELEVANT or NOT_RELEVANT`;

        const result = await this.runOllama(prompt);
        return result.includes('RELEVANT') && !result.includes('NOT_RELEVANT');
    }

    async scorePMORelevance(article) {
        const content = `${article.title} ${article.summary || ''}`;
        const prompt = `Score this content for PMO sphere relevance (0-100 points):

Content: ${content}

SCORING FRAMEWORK:
Core PMO Functions (50 points max):
- Planning, scheduling, roadmaps, Gantt charts: +20 pts
- Resource allocation, capacity planning: +15 pts  
- Timeline management, milestone tracking: +15 pts
- Risk management, governance, compliance: +15 pts
- Stakeholder management, communication: +12 pts

AI Breakthrough Relevance (35 points max):
- New model releases (breakthrough reasoning): +25 pts
- Agent systems, autonomous task execution: +20 pts
- MCP servers, tool integration: +15 pts

Technology Integration (10 points max):
- PMO Technology Stack: +10 pts

Strategic Business (5 points max):
- Digital transformation, automation: +5 pts

Respond with just the numerical score (0-100):`;

        const result = await this.runOllama(prompt);
        const score = parseInt(result.match(/\d+/)?.[0] || '0');
        return Math.min(100, Math.max(0, score));
    }

    async runOllama(prompt) {
        return new Promise((resolve, reject) => {
            const process = spawn('ollama', ['run', 'phi3:mini', prompt]);
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`Ollama process failed with code ${code}`));
                }
            });
            
            setTimeout(() => {
                process.kill();
                reject(new Error('Ollama timeout'));
            }, 30000);
        });
    }
}

// Test the local pre-filter
if (require.main === module) {
    const filter = new LocalPreFilter();
    filter.processDiscoveryFile()
        .then(results => {
            console.log(`\nLocal pre-filtering complete: ${results.length} articles selected for Hugging Face`);
        })
        .catch(console.error);
}

module.exports = LocalPreFilter;