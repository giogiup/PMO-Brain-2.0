class EnhancedAnalysisEngine {
    constructor() {
        this.hfApiUrl = 'https://api-inference.huggingface.co/models/';
        this.models = {
            primary: 'google/flan-t5-large',
            secondary: 'microsoft/DialoGPT-medium'
        };
        this.rateLimits = {
            requestsPerMinute: 30,
            delayBetweenRequests: 2000,
            timeout: 30000,
            maxRetries: 3
        };
    }

    async testHuggingFaceConnection() {
        try {
            const testPrompt = "Test connection. Respond with 'OK'.";
            const result = await this.huggingFaceAnalyze(testPrompt);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async huggingFaceAnalyze(content) {
        const prompt = `Analyze this content for PMO (Project Management Office) relevance. Rate 1-10:

Content: "${content}"

Consider: project management, PMO functions, business processes, team coordination, resource management, risk assessment, stakeholder management, agile/scrum methodologies, project planning, automation tools.

Respond with JSON format: {"score": X, "reasoning": "detailed explanation", "confidence": "high/medium/low", "pmbok_areas": ["area1", "area2"], "pmo_functions": ["function1", "function2"]}`;

        try {
            const response = await fetch(this.hfApiUrl + this.models.primary, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    inputs: prompt,
                    options: { wait_for_model: true }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return this.parseHuggingFaceResponse(result, content);
        } catch (error) {
            console.error('Hugging Face API error:', error);
            throw new Error(`AI Analysis failed: ${error.message}`);
        }
    }

    parseHuggingFaceResponse(response, originalContent) {
        let analysis;
        
        try {
            const text = Array.isArray(response) ? response[0]?.generated_text : response.generated_text || '';
            
            // Try to extract JSON from response
            const jsonMatch = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                // Fallback parsing
                analysis = this.fallbackParsing(text, originalContent);
            }
        } catch (error) {
            console.warn('JSON parsing failed, using fallback analysis');
            analysis = this.fallbackParsing('', originalContent);
        }
        
        return {
            overall_pmo_relevance: analysis.score || 5,
            reasoning_summary: analysis.reasoning || 'AI analysis completed',
            confidence_level: analysis.confidence || 'medium',
            analysis_model: this.models.primary,
            pmbok_mappings: analysis.pmbok_areas || ['General Management'],
            pmo_functions: analysis.pmo_functions || ['Process Improvement'],
            auto_approval: this.determineAutoApproval(analysis.score || 5)
        };
    }

    fallbackParsing(text, content) {
        // Enhanced fallback when AI parsing fails
        const score = this.calculateIntelligentScore(content);
        return {
            score: score,
            reasoning: `Intelligent content analysis. Score based on PMO relevance patterns.`,
            confidence: 'medium',
            pmbok_areas: ['General Management'],
            pmo_functions: ['Process Improvement']
        };
    }

    calculateIntelligentScore(content) {
        const text = content.toLowerCase();
        let score = 5;
        
        // PMO/Project Management keywords
        if (text.includes('pmo') || text.includes('project management office')) score += 3;
        if (text.includes('project management')) score += 2;
        if (text.includes('project')) score += 1;
        if (text.includes('portfolio management')) score += 2;
        if (text.includes('program management')) score += 2;
        if (text.includes('resource allocation')) score += 2;
        if (text.includes('risk management')) score += 2;
        if (text.includes('stakeholder')) score += 1;
        if (text.includes('agile') || text.includes('scrum')) score += 1;
        if (text.includes('gantt') || text.includes('timeline')) score += 1;
        
        // AI/Technology relevance
        if (text.includes('ai') || text.includes('artificial intelligence')) score += 2;
        if (text.includes('automation')) score += 2;
        if (text.includes('machine learning')) score += 1;
        if (text.includes('workflow')) score += 1;
        
        return Math.min(10, Math.max(1, score));
    }

    determineAutoApproval(score) {
        if (score >= 8) return { status: 'AUTO_APPROVE_FEATURED', section: 'FEATURED' };
        if (score >= 6) return { status: 'AUTO_APPROVE_STANDARD', section: 'STANDARD' };
        if (score >= 4) return { status: 'FLAG_FOR_REVIEW', section: 'PENDING' };
        return { status: 'AUTO_REJECT', section: 'REJECTED' };
    }

    enhancedMockAnalyze(content) {
        const score = this.calculateIntelligentScore(content);
        return {
            overall_pmo_relevance: score,
            reasoning_summary: `Enhanced mock analysis: Content shows ${score > 7 ? 'high' : score > 5 ? 'medium' : 'low'} PMO relevance based on intelligent pattern matching.`,
            confidence_level: 'high',
            analysis_model: 'enhanced_mock_v2',
            pmbok_mappings: this.mapToPMBOK(content),
            pmo_functions: this.mapToPMOFunctions(content),
            auto_approval: this.determineAutoApproval(score)
        };
    }

    mapToPMBOK(content) {
        const text = content.toLowerCase();
        const areas = [];
        
        if (text.includes('risk')) areas.push('Risk Management');
        if (text.includes('resource') || text.includes('allocation')) areas.push('Resource Management');
        if (text.includes('communication') || text.includes('stakeholder')) areas.push('Communications Management');
        if (text.includes('time') || text.includes('schedule')) areas.push('Schedule Management');
        if (text.includes('quality')) areas.push('Quality Management');
        if (text.includes('cost') || text.includes('budget')) areas.push('Cost Management');
        if (text.includes('scope') || text.includes('requirement')) areas.push('Scope Management');
        if (text.includes('procurement') || text.includes('vendor')) areas.push('Procurement Management');
        
        return areas.length > 0 ? areas : ['General Management'];
    }

    mapToPMOFunctions(content) {
        const text = content.toLowerCase();
        const functions = [];
        
        if (text.includes('governance')) functions.push('Project Governance');
        if (text.includes('standard') || text.includes('methodology')) functions.push('Standards & Methodology');
        if (text.includes('training') || text.includes('coaching')) functions.push('Training & Development');
        if (text.includes('portfolio')) functions.push('Portfolio Management');
        if (text.includes('resource')) functions.push('Resource Management');
        if (text.includes('tool') || text.includes('software')) functions.push('Tools & Technology');
        
        return functions.length > 0 ? functions : ['Process Improvement'];
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.EnhancedAnalysisEngine = EnhancedAnalysisEngine;
}