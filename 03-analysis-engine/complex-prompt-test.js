const fs = require('fs');
const path = require('path');

class ComplexPromptTestFilter {
    async testFirst10() {
        const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-'));
        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        const discoveryData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = discoveryData.articles.slice(0, 10);
        
        console.log(`Testing complex prompt scoring with first 10 articles...\n`);
        
        const scoredArticles = [];
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i+1}/10] ${article.title.substring(0, 50)}...`);
            
            try {
                const score = await this.complexScore(article);
                scoredArticles.push({ ...article, localScore: score });
                console.log(`  Score: ${score}/100`);
            } catch (error) {
                console.log(`  Error: ${error.message}`);
                scoredArticles.push({ ...article, localScore: 0 });
            }
        }
        
        const sorted = scoredArticles.sort((a, b) => b.localScore - a.localScore);
        console.log(`\nTop 3: ${sorted.slice(0, 3).map(a => `${a.localScore}/100`).join(', ')}`);
        return sorted;
    }

    async complexScore(article) {
        const prompt = `Score this content for PMO sphere relevance (0-100 points):

"${article.title}"
${article.summary || ''}

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
- Emerging Integration: +5 pts

Strategic Business Enablement (5 points max):
- Digital transformation, automation: +5 pts

Respond with just the numerical score (0-100):`;

        return await this.runOllama(prompt, 8); // 8 minute timeout for complex prompt
    }

    async runOllama(prompt, timeoutMinutes = 8) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMinutes * 60 * 1000);

        try {
            const res = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "phi3:mini",
                    prompt: prompt,
                    stream: false
                }),
                signal: controller.signal
            });

            const data = await res.json();
            const response = data.response.trim();
            
            // Extract numerical score
            const score = parseInt(response.match(/\d+/)?.[0] || '0');
            return Math.min(100, Math.max(0, score));
            
        } catch (err) {
            throw new Error("Ollama API error: " + err.message);
        } finally {
            clearTimeout(timeout);
        }
    }
}

const filter = new ComplexPromptTestFilter();
filter.testFirst10().catch(console.error);