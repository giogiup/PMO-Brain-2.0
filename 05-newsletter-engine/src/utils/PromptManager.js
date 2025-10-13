class PromptManager {
    constructor() {
        // Instance-based class for main.js compatibility
    }

    generateAudienceAnalysis(article) {
        return `You are an expert PMO analyst. Analyze this content and determine which PMO roles would find it most valuable, even if the article doesn't explicitly mention "project management" or "PMO".

**ARTICLE TO ANALYZE:**
Title: ${article.title}
Content: ${article.content ? article.content.substring(0, 1500) : article.summary || 'No content provided'}
Source: ${article.source || 'Unknown'}

**PMO SPHERE ROLES:**
Core PMO: PMO Head, Portfolio Head, Program Manager, Project Manager, Project Coordinator, Scrum Master, PMO Executive
Periphery: Business Analyst, Business Stakeholders, Finance & Budgeting, Risk & Compliance, Change Management, IT & Engineering Leads, HR / Resource Planning

**ANALYSIS INSTRUCTIONS:**
1. Look beyond explicit PMO terms to identify relevance for:
   - Risk management and mitigation strategies
   - Resource planning and optimization
   - Stakeholder communication and management
   - Process improvement and efficiency
   - Strategic planning and governance
   - Team management and performance
   - Technology adoption and change management
   - Data analysis and decision support
   - Budget planning and financial oversight

2. Consider how insights could be applied to PMO challenges:
   - Project predictability and success rates
   - Resource allocation and capacity planning
   - Stakeholder engagement and communication
   - Process standardization and improvement
   - Performance measurement and reporting
   - Risk identification and response
   - Change adoption and transformation

3. Select the TOP 3-4 most relevant roles only
4. Consider both immediate applicability and strategic value

**CRITICAL ANTI-HALLUCINATION RULES:**
- Base analysis ONLY on information provided in the article
- When making PMO applications, clearly distinguish between direct applications vs. potential adaptations
- Use confidence indicators when inferring relevance

**RESPONSE FORMAT (JSON):**
{
  "targetAudience": "comma-separated list of 3-4 most relevant roles",
  "pmoRelevanceReason": "brief explanation of why this content is valuable to PMOs",
  "confidenceLevel": "1-10 rating of how directly the article supports PMO applications",
  "inferenceNote": "explanation if making connections not explicitly stated in source"
}

Respond with only valid JSON.`;
    }

    generateInsightCard(article) {
        return `TASK: Extract structured data from article and return as JSON.

ARTICLE: ${article.title}
${article.content.substring(0, 800)}

RESPOND WITH ONLY THIS JSON FORMAT (no other text):
{"contentType":"research","tagline":"specific insight about article","summary":"what article discusses without repeating title","pmoApplications":"how PMOs can use this","strategicValue":"business impact","impactScore":7,"readTime":3,"tags":["tag1","tag2","tag3"],"factors":{"factor1":"value1","factor2":"value2","factor3":"value3","factor4":"value4","factor5":"value5"},"confidenceScore":8,"reviewFlag":false,"reviewNote":""}

CRITICAL: Start response with { and end with }. NO explanatory text.`;
    }

    assessConfidenceLevel(insightText, originalText) {
        // Simple confidence assessment based on content overlap
        const insightWords = insightText.toLowerCase().split(/\s+/);
        const originalWords = originalText.toLowerCase().split(/\s+/);
        
        let commonWords = 0;
        insightWords.forEach(word => {
            if (word.length > 3 && originalWords.includes(word)) {
                commonWords++;
            }
        });
        
        const overlapRatio = commonWords / Math.max(insightWords.length, 1);
        
        // Convert overlap ratio to confidence score (1-10)
        if (overlapRatio > 0.3) return 8;
        if (overlapRatio > 0.2) return 7;
        if (overlapRatio > 0.1) return 6;
        return 5;
    }

    checkForSuspiciousStats(content, originalText) {
        const statPattern = /\b\d+(\.\d+)?%|\b\d+(\.\d+)?\s*(times|x|percent|percentage|fold|increase|decrease|improvement|reduction)\b/gi;
        const contentStats = content.match(statPattern) || [];
        const originalStats = originalText.match(statPattern) || [];
        
        const suspiciousStats = contentStats.filter(stat => 
            !originalStats.some(originalStat => 
                originalStat.toLowerCase().includes(stat.toLowerCase()) || 
                stat.toLowerCase().includes(originalStat.toLowerCase())
            )
        );
        
        return suspiciousStats; // Return array instead of object for compatibility
    }

    getFactorLabels(contentType) {
        const factorMaps = {
            'product': ['Implementation', 'Scale', 'Cost', 'Integration', 'Learning'],
            'knowledge': ['Complexity', 'Applicability', 'Evidence', 'Practicality', 'Depth'],
            'research': ['Sample Size', 'Scope', 'Access', 'Credibility', 'Actionability'],
            'case_study': ['Scalability', 'Industry', 'Results', 'Replicability', 'Detail'],
            'news': ['Urgency', 'Impact', 'Relevance', 'Timeline', 'Actionability'],
            'event': ['Timing', 'Audience', 'Cost', 'Format', 'Level'],
            'opinion': ['Authority', 'Evidence', 'Controversy', 'Timeline', 'Actionability']
        };
        
        return factorMaps[contentType] || factorMaps['knowledge'];
    }

    getFactorIcons(contentType) {
        const iconMaps = {
            'product': ['🟡', '👥', '💰', '🔗', '🎓'],
            'knowledge': ['🧠', '🎯', '📊', '⚡', '📚'],
            'research': ['📊', '🌐', '💰', '🔗', '🎓'],
            'case_study': ['📈', '🏢', '🎯', '🔄', '📋'],
            'news': ['⚡', '🎯', '📊', '📅', '⚡'],
            'event': ['📅', '👥', '💰', '🔗', '🎓'],
            'opinion': ['👤', '📊', '⚠️', '📅', '⚡']
        };
        
        return iconMaps[contentType] || iconMaps['knowledge'];
    }
}

module.exports = PromptManager;