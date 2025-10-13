const fs = require('fs');
const path = require('path');
const PMOPrompts = require('./pmo-prompts');

class SimpleTestFilter {
    constructor() {
        this.prompts = new PMOPrompts();
    }

    async testFirst10() {
        const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-'));
        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        const discoveryData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = discoveryData.articles.slice(0, 10);
        
        console.log(`Testing simplified single-step scoring with first 10 articles...\n`);
        
        const scoredArticles = [];
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i+1}/10] ${article.title.substring(0, 50)}...`);
            
            try {
                const prompt = this.prompts.getSimplifiedSinglePrompt(article);
                const response = await this.runOllama(prompt, 5);
                const score = parseInt(response.match(/\d+/)?.[0] || '0');
                
                scoredArticles.push({ ...article, localScore: score });
                console.log(`  Score: ${score}/100`);
            } catch (error) {
                console.log(`  Error: ${error.message}`);
                scoredArticles.push({ ...article, localScore: 0 });
            }
        }
        
        const sorted = scoredArticles.sort((a, b) => b.localScore - a.localScore);
        console.log(`\nTop 3: ${sorted.slice(0, 3).map(a => `${a.localScore}/100`).join(', ')}`);
        
        // Show the actual top articles for evaluation
        console.log(`\nTop 3 articles:`);
        sorted.slice(0, 3).forEach((article, i) => {
            console.log(`${i+1}. [${article.localScore}/100] ${article.title}`);
        });
        
        return sorted;
    }

    async runOllama(prompt, timeoutMinutes = 2) {
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
            return data.response.trim();
            
        } catch (err) {
            throw new Error("Ollama API error: " + err.message);
        } finally {
            clearTimeout(timeout);
        }
    }
}

const filter = new SimpleTestFilter();
filter.testFirst10().catch(console.error);