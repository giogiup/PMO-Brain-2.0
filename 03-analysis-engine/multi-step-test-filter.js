const fs = require('fs');
const path = require('path');
const PMOPrompts = require('./pmo-prompts');

class MultiStepInferenceFilter {
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
        
        console.log(`Testing multi-step inference scoring with first 10 articles...\n`);
        
        const scoredArticles = [];
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i+1}/10] ${article.title.substring(0, 50)}...`);
            
            try {
                const score = await this.multiStepInferenceScore(article);
                scoredArticles.push({ ...article, localScore: score });
                console.log(`  Final Score: ${score}/100`);
            } catch (error) {
                console.log(`  Error: ${error.message}`);
                scoredArticles.push({ ...article, localScore: 0 });
            }
        }
        
        const sorted = scoredArticles.sort((a, b) => b.localScore - a.localScore);
        console.log(`\nTop 3: ${sorted.slice(0, 3).map(a => `${a.localScore}/100`).join(', ')}`);
        return sorted;
    }

    async multiStepInferenceScore(article) {
        // Step 1: Technology Capability Identification
        const capabilityPrompt = this.prompts.getTechnologyCapabilityPrompt(article);
        const capability = await this.runOllama(capabilityPrompt, 2);
        console.log(`    Tech Capability: ${capability.substring(0, 60)}...`);

        // Step 2: PMO Challenge Mapping
        const challengePrompt = this.prompts.getPMOChallengePrompt(article, capability);
        const challenges = await this.runOllama(challengePrompt, 2);
        console.log(`    PMO Challenges: ${challenges.substring(0, 60)}...`);

        // Step 3: Application Reasoning
        const reasoningPrompt = this.prompts.getApplicationReasoningPrompt(article, capability, challenges);
        const reasoning = await this.runOllama(reasoningPrompt, 2);
        console.log(`    Application: ${reasoning.substring(0, 60)}...`);

        // Step 4: Final Scoring
        const scoringPrompt = this.prompts.getFinalScoringPrompt(article, capability, challenges, reasoning);
        const scoreResponse = await this.runOllama(scoringPrompt, 2);
        
        const score = parseInt(scoreResponse.match(/\d+/)?.[0] || '0');
        return Math.min(100, Math.max(0, score));
    }

    async runOllama(prompt, timeoutMinutes = 3) {
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

const filter = new MultiStepInferenceFilter();
filter.testFirst10().catch(console.error);