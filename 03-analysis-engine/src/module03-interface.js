// Module 03 Interface - PMO Brain Analysis Engine
class Module03Interface {
    constructor() {
        this.analysisEngine = new EnhancedAnalysisEngine();
        this.stats = {
            totalProcessed: 0,
            autoApproved: 0,
            automationRate: 0
        };
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('Initializing PMO Brain Module 03...');
            this.initialized = true;
            return { success: true, message: 'Module 03 initialized successfully' };
        } catch (error) {
            console.error('Module 03 initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    async analyzeContent(content) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            // Try Hugging Face AI first
            let analysis;
            try {
                analysis = await this.analysisEngine.huggingFaceAnalyze(content);
                console.log('Using Hugging Face AI analysis');
            } catch (error) {
                console.warn('Hugging Face unavailable, using enhanced mock analysis');
                analysis = this.analysisEngine.enhancedMockAnalyze(content);
            }

            // Update stats
            this.stats.totalProcessed++;
            if (['AUTO_APPROVE_FEATURED', 'AUTO_APPROVE_STANDARD'].includes(analysis.auto_approval.status)) {
                this.stats.autoApproved++;
            }
            this.stats.automationRate = Math.round((this.stats.autoApproved / this.stats.totalProcessed) * 100);

            // Generate recommendation
            const recommendation = this.generateRecommendation(analysis);

            return {
                success: true,
                analysis: analysis,
                recommendation: recommendation,
                stats: this.stats
            };

        } catch (error) {
            console.error('Analysis error:', error);
            return {
                success: false,
                error: error.message,
                fallbackAnalysis: this.analysisEngine.enhancedMockAnalyze(content)
            };
        }
    }

    generateRecommendation(analysis) {
        const score = analysis.overall_pmo_relevance;
        const status = analysis.auto_approval.status;

        let action = 'review';
        let message = 'Manual review recommended';

        switch (status) {
            case 'AUTO_APPROVE_FEATURED':
                action = 'approve_featured';
                message = `High PMO relevance (${score}/10). Auto-approve for featured newsletter section.`;
                break;
            case 'AUTO_APPROVE_STANDARD':
                action = 'approve_standard';
                message = `Good PMO relevance (${score}/10). Auto-approve for standard newsletter section.`;
                break;
            case 'FLAG_FOR_REVIEW':
                action = 'review';
                message = `Moderate PMO relevance (${score}/10). Flag for manual review.`;
                break;
            case 'AUTO_REJECT':
                action = 'reject';
                message = `Low PMO relevance (${score}/10). Auto-reject from newsletter.`;
                break;
        }

        return { action, message, score, section: analysis.auto_approval.section };
    }

    getStats() {
        return {
            totalProcessed: this.stats.totalProcessed,
            autoApproved: this.stats.autoApproved,
            automationRate: this.stats.automationRate,
            lastUpdated: new Date().toISOString()
        };
    }

    resetStats() {
        this.stats = {
            totalProcessed: 0,
            autoApproved: 0,
            automationRate: 0
        };
        console.log('Stats reset');
    }
}

// Make Module03 available globally
if (typeof window !== 'undefined') {
    window.Module03 = new Module03Interface();
}