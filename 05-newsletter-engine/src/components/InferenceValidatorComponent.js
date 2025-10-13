const BaseComponent = require('./BaseComponent');

class InferenceValidatorComponent extends BaseComponent {
    constructor() {
        super();
        // Configurable thresholds for inference detection
        this.config = {
            // Inference ratio threshold (0.7 = 70% of applications are inferred)
            inferenceRatioThreshold: 0.7,
            
            // Minimum applications to consider inference patterns
            minApplicationsForInference: 2,
            
            // High inference ratio that always triggers warning
            highInferenceThreshold: 0.8,
            
            // Low confidence that triggers warning regardless of ratio
            lowConfidenceThreshold: 0.6
        };
    }

    async process(insights) {
        this.log('Validating inference connections...');
        for (const insight of insights) {
            this.validateInference(insight);
            this.processedCount++;
        }
        return insights;
    }

    validateInference(insight) {
        // Check if we have the necessary data
        if (!insight.pmoApplications || insight.pmoApplications.length === 0) {
            this.log('No PMO applications found - skipping inference validation');
            return;
        }

        // Use Module 03 inference flags if available (preferred method)
        if (insight.inferenceFlags) {
            this.validateUsingInferenceFlags(insight);
        } else {
            // Fallback to analyzing individual applications
            this.validateUsingApplicationAnalysis(insight);
        }
    }

    validateUsingInferenceFlags(insight) {
        const flags = insight.inferenceFlags;
        
        // If Module 03 explicitly says this requires validation, flag it
        if (flags.requiresValidation === true) {
            this.flagForReview(insight, 'high-inference', flags.inferenceRatio || 'unknown');
            return;
        }

        // Check inference ratio from Module 03
        if (flags.inferenceRatio >= this.config.highInferenceThreshold) {
            this.flagForReview(insight, 'high-inference', flags.inferenceRatio);
            return;
        }

        // Check for moderate inference on non-PMO content
        if (!flags.hasExplicitPMOContent && 
            flags.inferenceRatio >= this.config.inferenceRatioThreshold) {
            this.flagForReview(insight, 'moderate-inference', flags.inferenceRatio);
            return;
        }

        // Check confidence score if available
        if (flags.confidenceScore && flags.confidenceScore < this.config.lowConfidenceThreshold) {
            this.flagForReview(insight, 'low-confidence', flags.confidenceScore);
            return;
        }

        this.log('Inference validation passed for: ' + insight.title);
    }

    validateUsingApplicationAnalysis(insight) {
        // Fallback method when Module 03 inference flags are not available
        const totalApps = insight.pmoApplications.length;
        
        if (totalApps < this.config.minApplicationsForInference) {
            this.log('Too few applications for meaningful inference analysis');
            return;
        }

        // Count inferred applications
        const inferredApps = insight.pmoApplications.filter(app => app.isInferred === true);
        const inferenceRatio = inferredApps.length / totalApps;

        // Check for explicit PMO content
        const hasExplicitPMOTerms = this.checkForPMOTerms(insight);

        // Flag if high inference ratio on non-PMO content
        if (!hasExplicitPMOTerms && inferenceRatio >= this.config.inferenceRatioThreshold) {
            this.flagForReview(insight, 'calculated-inference', inferenceRatio);
            return;
        }

        // Check for low confidence applications
        const lowConfidenceApps = insight.pmoApplications.filter(app => 
            app.confidence === 'low' || app.confidence === 'very low'
        );
        
        if (lowConfidenceApps.length > 0 && inferenceRatio > 0.5) {
            this.flagForReview(insight, 'low-confidence-apps', lowConfidenceApps.length + '/' + totalApps);
            return;
        }

        this.log('Application analysis passed for: ' + insight.title);
    }

    flagForReview(insight, reason, metric) {
        insight.reviewFlag = true;
        
        // Generate appropriate review note based on reason
        const reasonMessages = {
            'high-inference': 'High inference ratio (' + Math.round(metric * 100) + '%) - most PMO applications are inferred rather than explicit',
            'moderate-inference': 'Moderate inference detected (' + Math.round(metric * 100) + '%) on non-PMO content',
            'low-confidence': 'Low confidence score (' + metric + ') indicates uncertain analysis',
            'calculated-inference': 'Calculated inference ratio (' + Math.round(metric * 100) + '%) exceeds threshold',
            'low-confidence-apps': 'Multiple low-confidence applications detected (' + metric + ')'
        };

        insight.reviewNote = reasonMessages[reason] || 'Inference validation triggered: ' + reason;
        
        // Add confidence score if available
        if (insight.confidenceScore) {
            insight.reviewNote += '. Overall confidence: ' + insight.confidenceScore + '/10';
        }

        this.log('Inference detected and flagged: ' + reason + ' - ' + insight.title);
    }

    checkForPMOTerms(insight) {
        const pmoTerms = [
            'project', 'portfolio', 'PMO', 'program', 'programme', 
            'initiative', 'stakeholder', 'governance', 'delivery',
            'milestone', 'scope', 'budget', 'timeline', 'resource',
            'risk management', 'change management', 'quality assurance'
        ];
        
        // Check title, summary, and source for PMO terms
        const title = (insight.title || '').toLowerCase();
        const summary = (insight.summary || '').toLowerCase();
        const source = (insight.source || '').toLowerCase();
        const content = [title, summary, source].join(' ');
        
        return pmoTerms.some(term => content.includes(term.toLowerCase()));
    }
}

module.exports = InferenceValidatorComponent;