class SimpleAnalysisComponent {
    constructor() {
        this.groqApiKey = process.env.GROQ_API_KEY;
        console.log('Simple Analysis Component initialized');
    }

    async analyze(content) {
        try {
            console.log('Analyzing:', content.title);
            
            const score = this.calculateIntelligentScore(content);
            const apps = this.generatePMOApplications(content);
            
            const result = {
                score: score,
                pmoApplications: apps,
                implementationTimeline: score > 20 ? 'immediate' : '6-12 months',
                reasoning: 'Intelligent analysis based on content patterns',
                aiRelevance: content.title.toLowerCase().includes('ai') || content.summary?.toLowerCase().includes('ai'),
                businessImpact: score > 20 ? 'High' : score > 15 ? 'Medium' : 'Low',
                title: content.title,
                source: content.source,
                analysisTimestamp: new Date().toISOString()
            };
            
            console.log('Analysis complete. Score:', result.score);
            return result;
            
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }
    
    calculateIntelligentScore(content) {
        const text = (content.title + ' ' + (content.summary || '')).toLowerCase();
        let score = 10;
        
        // PMO/Project Management keywords
        if (text.includes('pmo') || text.includes('project management')) score += 8;
        if (text.includes('project')) score += 4;
        if (text.includes('management')) score += 3;
        if (text.includes('portfolio')) score += 5;
        if (text.includes('resource')) score += 3;
        if (text.includes('planning')) score += 3;
        if (text.includes('risk')) score += 4;
        if (text.includes('schedule') || text.includes('timeline')) score += 4;
        
        // AI/Technology keywords
        if (text.includes('ai') || text.includes('artificial intelligence')) score += 5;
        if (text.includes('automation')) score += 4;
        if (text.includes('machine learning')) score += 3;
        if (text.includes('analytics')) score += 3;
        if (text.includes('prediction') || text.includes('predictive')) score += 4;
        
        // Business keywords
        if (text.includes('enterprise')) score += 2;
        if (text.includes('efficiency')) score += 2;
        if (text.includes('optimization')) score += 3;
        
        // Tier bonuses
        if (content.source?.tier === 1) score += 2;
        if (content.source?.tier === 3) score += 3;
        
        return Math.min(30, Math.max(5, score));
    }
    
    generatePMOApplications(content) {
        const text = (content.title + ' ' + (content.summary || '')).toLowerCase();
        const apps = [];
        
        if (text.includes('risk')) apps.push('Project risk assessment and mitigation');
        if (text.includes('planning') || text.includes('schedule')) apps.push('Automated project planning and scheduling');
        if (text.includes('resource')) apps.push('Resource allocation optimization');
        if (text.includes('ai') || text.includes('automation')) apps.push('PMO process automation');
        if (text.includes('analytics') || text.includes('data')) apps.push('PMO dashboard and analytics');
        if (text.includes('communication')) apps.push('Stakeholder communication enhancement');
        if (text.includes('portfolio')) apps.push('Portfolio management optimization');
        
        if (apps.length === 0) {
            apps.push('Project workflow enhancement', 'PMO efficiency improvement');
        }
        
        return apps.slice(0, 3);
    }
    
    async analyzeMultiple(contentArray) {
        console.log('Batch analyzing', contentArray.length, 'articles...');
        const results = [];
        
        for (const content of contentArray) {
            try {
                const result = await this.analyze(content);
                results.push(result);
            } catch (error) {
                console.error('Failed to analyze:', content.title);
            }
        }
        
        return results;
    }
    
    generateDailyBrief() {
        return {
            type: 'daily_brief',
            date: new Date().toISOString().split('T')[0],
            articles: [],
            generatedAt: new Date().toISOString()
        };
    }
    
    getAutomationStatus() {
        return { status: 'Simple analysis system running' };
    }
}

module.exports = SimpleAnalysisComponent;
