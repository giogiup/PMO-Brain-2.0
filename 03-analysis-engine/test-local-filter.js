const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestLocalFilter {
    async testFirst10() {
        const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-'));
        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        const discoveryData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = discoveryData.articles.slice(0, 10); // First 10 only
        
        console.log(`Testing with first 10 articles from ${latestFile}...\n`);
        
        const scoredArticles = [];
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i+1}/10] Analyzing: ${article.title.substring(0, 60)}...`);
            
            try {
                const score = await this.scorePMORelevance(article);
                scoredArticles.push({ ...article, localScore: score });
                console.log(`  Score: ${score}/100`);
            } catch (error) {
                console.log(`  Error: ${error.message}`);
                scoredArticles.push({ ...article, localScore: 0 });
            }
        }
        
        // Sort by score
        const sorted = scoredArticles.sort((a, b) => b.localScore - a.localScore);
        
        console.log(`\n=== TEST RESULTS ===`);
        console.log(`Top 5 scores: ${sorted.slice(0, 5).map(a => a.localScore).join(', ')}`);
        console.log(`Average score: ${Math.round(sorted.reduce((sum, a) => sum + a.localScore, 0) / sorted.length)}/100`);
        console.log(`\nTop 3 articles:`);
        sorted.slice(0, 3).forEach((article, i) => {
            console.log(`${i+1}. [${article.localScore}/100] ${article.title}`);
        });
        
        console.log(`\nTest complete. Run full batch? Y/N`);
        return sorted;
    }

    async scorePMORelevance(article) {
        const prompt = `Score this content for PMO sphere relevance (0-100):

"${article.title}"
${article.summary || ''}

PMO SCORING:
Core PMO (50pts): Planning/scheduling/roadmaps(+20), Resource allocation(+15), Timeline management(+15), Risk/governance(+15), Stakeholder management(+12)
AI Breakthrough (35pts): New model releases(+25), Agent systems(+20), MCP servers(+15)  
Technology (10pts): PMO tools(+10)
Business (5pts): Automation(+5)

Respond with just the numerical score:`;

        return new Promise((resolve, reject) => {
            const process = spawn('ollama', ['run', 'phi3:mini', prompt]);
            let output = '';
            
            process.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            process.on('close', (code) => {
                const score = parseInt(output.match(/\d+/)?.[0] || '0');
                resolve(Math.min(100, Math.max(0, score)));
            });
            
            setTimeout(() => {
                process.kill();
                reject(new Error('Timeout'));
            }, 300000);
        });
    }
}

if (require.main === module) {
    const filter = new TestLocalFilter();
    filter.testFirst10().catch(console.error);
}