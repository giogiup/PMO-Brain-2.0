const BaseComponent = require('./BaseComponent');

class DecisionFrameworkComponent extends BaseComponent {
    async process(insights) {
        this.log('Building decision frameworks...');

        for (const insight of insights) {
            insight.decisionFramework = this.buildFramework(insight);
            insight.formattedFactors = this.formatFactors(insight);
            this.processedCount++;
        }
        return insights;
    }

    buildFramework(insight) {
        // Generate framework based on actual insight data
        const factors = this.generateFactorsFromInsight(insight);
        const labels = this.getFactorLabels(insight.contentType);
        const icons = this.getFactorIcons(insight.contentType);

        // Basic framework using real data
        const basic = this.formatBasicFramework(factors, labels, icons);

        // Enhanced framework with real assessments
        const enhanced = this.buildEnhancedFramework(insight);

        return {
            basic: basic,
            enhanced: enhanced,
            recommendation: this.generateRecommendation(insight)
        };
    }

    buildEnhancedFramework(insight) {
        // Generate assessment based on actual insight properties
        const assessment = {
            complexity: this.assessComplexity(insight),
            implementation: this.assessImplementation(insight),
            roi: this.assessROI(insight),
            timeline: this.assessTimeline(insight),
            risk: this.assessRisk(insight)
        };

        return this.formatEnhancedFramework(assessment);
    }

    // Generate factors dynamically from insight data instead of using mock data
    generateFactorsFromInsight(insight) {
        const factorCount = 5;
        const factors = {};

        // Use PMO applications if available
        if (insight.pmoApplications && insight.pmoApplications.length > 0) {
            for (let i = 0; i < Math.min(factorCount, insight.pmoApplications.length); i++) {
                const app = insight.pmoApplications[i];
                factors[`factor${i + 1}`] = this.assessApplication(app, insight);
            }
        }

        // Fill remaining factors with strategic assessments
        const usedFactors = Object.keys(factors).length;
        if (usedFactors < factorCount) {
            const strategicFactors = this.generateStrategicFactors(insight);
            for (let i = usedFactors; i < factorCount; i++) {
                const factorKey = `factor${i + 1}`;
                factors[factorKey] = strategicFactors[i] || 'Assessment needed';
            }
        }

        return factors;
    }

    assessApplication(application, insight) {
        // Assess individual PMO application
        const confidence = application.confidence || 'medium';
        const isInferred = application.isInferred || false;
        
        if (isInferred && confidence === 'low') {
            return 'Requires validation';
        } else if (isInferred && confidence === 'high') {
            return 'Promising opportunity';
        } else if (!isInferred) {
            return 'Direct application';
        } else {
            return 'Consider implementation';
        }
    }

    generateStrategicFactors(insight) {
        const factors = [];
        
        // Factor based on content type
        factors.push(this.getContentTypeAssessment(insight.contentType));
        
        // Factor based on inference level
        if (insight.inferenceFlags) {
            factors.push(this.getInferenceAssessment(insight.inferenceFlags));
        } else {
            factors.push('Analysis required');
        }
        
        // Factor based on strategic value
        if (insight.strategicValue) {
            factors.push(this.getStrategicAssessment(insight.strategicValue));
        } else {
            factors.push('Value assessment needed');
        }
        
        // Factor based on confidence
        if (insight.confidenceScore) {
            factors.push(this.getConfidenceAssessment(insight.confidenceScore));
        } else {
            factors.push('Confidence evaluation needed');
        }
        
        // Factor based on implementation readiness
        factors.push(this.getReadinessAssessment(insight));
        
        return factors;
    }

    getContentTypeAssessment(contentType) {
        const assessments = {
            'AI Technology': 'Technical evaluation required',
            'PMO Practice': 'Direct implementation possible',
            'Technology': 'Infrastructure assessment needed',
            'Research': 'Methodology review required',
            'Case Study': 'Adaptation planning needed'
        };
        return assessments[contentType] || 'Content analysis required';
    }

    getInferenceAssessment(inferenceFlags) {
        if (inferenceFlags.hasExplicitPMOContent) {
            return 'Clear PMO relevance';
        } else if (inferenceFlags.inferenceRatio > 0.8) {
            return 'High inference - verify applicability';
        } else if (inferenceFlags.inferenceRatio > 0.5) {
            return 'Moderate inference - consider pilot';
        } else {
            return 'Low inference - direct application';
        }
    }

    getStrategicAssessment(strategicValue) {
        const impact = strategicValue.businessImpact || 'Unknown';
        const impactMap = {
            'Very High': 'Critical priority',
            'High': 'High priority',
            'Medium': 'Standard priority',
            'Low': 'Low priority'
        };
        return impactMap[impact] || 'Priority assessment needed';
    }

    getConfidenceAssessment(confidenceScore) {
        if (confidenceScore >= 9) return 'Very high confidence';
        if (confidenceScore >= 7) return 'High confidence';
        if (confidenceScore >= 5) return 'Moderate confidence';
        if (confidenceScore >= 3) return 'Low confidence';
        return 'Very low confidence';
    }

    getReadinessAssessment(insight) {
        const appCount = insight.pmoApplications ? insight.pmoApplications.length : 0;
        const hasInference = insight.inferenceFlags && insight.inferenceFlags.requiresValidation;
        
        if (appCount >= 3 && !hasInference) {
            return 'Implementation ready';
        } else if (appCount >= 2) {
            return 'Planning phase ready';
        } else if (appCount >= 1) {
            return 'Exploration phase';
        } else {
            return 'Research required';
        }
    }

    // Assessment methods using real insight data
    assessComplexity(insight) {
        const appCount = insight.pmoApplications ? insight.pmoApplications.length : 0;
        const inferenceRatio = insight.inferenceFlags ? insight.inferenceFlags.inferenceRatio : 0;
        
        if (inferenceRatio > 0.8 || appCount > 4) {
            return 'High - Complex implementation required';
        } else if (inferenceRatio > 0.5 || appCount > 2) {
            return 'Medium - Moderate complexity';
        } else {
            return 'Low - Straightforward implementation';
        }
    }

    assessImplementation(insight) {
        const confidence = insight.confidenceScore || 5;
        const hasExplicitPMO = insight.inferenceFlags && insight.inferenceFlags.hasExplicitPMOContent;
        
        if (confidence >= 8 && hasExplicitPMO) {
            return 'Ready - High confidence implementation';
        } else if (confidence >= 6) {
            return 'Consider pilot - Good potential';
        } else if (confidence >= 4) {
            return 'Research phase - Validate approach';
        } else {
            return 'Hold - Insufficient confidence';
        }
    }

    assessROI(insight) {
        const impact = insight.strategicValue ? insight.strategicValue.businessImpact : 'Unknown';
        const confidence = insight.confidenceScore || 5;
        
        if (impact === 'Very High' && confidence >= 7) {
            return 'Excellent ROI expected';
        } else if (impact === 'High' && confidence >= 6) {
            return 'Good ROI potential';
        } else if (impact === 'Medium') {
            return 'Moderate ROI expected';
        } else {
            return 'ROI assessment required';
        }
    }

    assessTimeline(insight) {
        const readiness = this.getReadinessAssessment(insight);
        const complexity = this.assessComplexity(insight);
        
        if (readiness === 'Implementation ready' && complexity.includes('Low')) {
            return 'Immediate - 1-3 months';
        } else if (readiness.includes('Planning') || complexity.includes('Medium')) {
            return 'Short term - 3-6 months';
        } else if (complexity.includes('High')) {
            return 'Long term - 6-12 months';
        } else {
            return 'Timeline assessment needed';
        }
    }

    assessRisk(insight) {
        const hasReviewFlag = insight.reviewFlag || false;
        const inferenceRatio = insight.inferenceFlags ? insight.inferenceFlags.inferenceRatio : 0;
        const confidence = insight.confidenceScore || 5;
        
        if (hasReviewFlag || inferenceRatio > 0.8) {
            return 'High risk - Validation required';
        } else if (inferenceRatio > 0.5 || confidence < 6) {
            return 'Medium risk - Pilot recommended';
        } else {
            return 'Low risk - Proceed with confidence';
        }
    }

    formatEnhancedFramework(assessment) {
        return Object.entries(assessment).map(([key, value]) => {
            const icon = this.getEnhancedIcon(key);
            return `${icon} **${this.capitalize(key)}:** ${value}`;
        }).join(' | ');
    }

    getEnhancedIcon(key) {
        const icons = {
            complexity: '🧠',
            implementation: '🚀',
            roi: '💰',
            timeline: '⏱️',
            risk: '⚠️'
        };
        return icons[key] || '📊';
    }

    formatBasicFramework(factors, labels, icons) {
        return Object.entries(factors).map(([key, value], index) => {
            const label = labels[index] || key;
            const icon = icons[index] || '🔧';
            return `${icon} **${label}:** ${value}`;
        }).join(' | ');
    }

    formatFactors(insight) {
        const factors = this.generateFactorsFromInsight(insight);
        const labels = this.getFactorLabels(insight.contentType);
        const icons = this.getFactorIcons(insight.contentType);

        return Object.entries(factors).map(([key, value], index) => {
            const label = labels[index] || key;
            const icon = icons[index] || '🔧';
            return `${icon} **${label}:** ${value}`;
        }).join(' | ');
    }

    getFactorLabels(contentType) {
        const factorMaps = {
            'AI Technology': ['Implementation', 'Scale', 'Integration', 'Learning', 'Validation'],
            'PMO Practice': ['Applicability', 'Complexity', 'Evidence', 'Practicality', 'Adoption'],
            'Technology': ['Setup', 'Scope', 'Cost', 'Integration', 'Training'],
            'Research': ['Methodology', 'Scope', 'Access', 'Credibility', 'Actionability'],
            'Case Study': ['Scalability', 'Context', 'Results', 'Replicability', 'Detail']
        };
        return factorMaps[contentType] || ['Assessment', 'Planning', 'Implementation', 'Monitoring', 'Optimization'];
    }

    getFactorIcons(contentType) {
        const iconMaps = {
            'AI Technology': ['⚙️', '👥', '🔗', '🎓', '✅'],
            'PMO Practice': ['🧠', '🎯', '📊', '⚡', '📚'],
            'Technology': ['🛠️', '🌐', '💰', '🔗', '🎓'],
            'Research': ['📊', '🌍', '💰', '🔗', '⚡'],
            'Case Study': ['📈', '🏢', '🎯', '🔄', '📋']
        };
        return iconMaps[contentType] || ['🔧', '📋', '🚀', '📊', '⭐'];
    }

    generateRecommendation(insight) {
        const confidence = insight.confidenceScore || 5;
        const impact = insight.strategicValue ? insight.strategicValue.businessImpact : null;
        const hasReviewFlag = insight.reviewFlag || false;
        const inferenceRatio = insight.inferenceFlags ? insight.inferenceFlags.inferenceRatio : 0;

        if (hasReviewFlag || inferenceRatio > 0.8) {
            return "REVIEW REQUIRED - Validate inference assumptions before implementation";
        } else if (impact === 'Very High' && confidence >= 8) {
            return "STRONGLY RECOMMENDED - High impact, high confidence opportunity";
        } else if (impact === 'High' && confidence >= 7) {
            return "RECOMMENDED - Strong potential value";
        } else if (confidence >= 6 && inferenceRatio < 0.5) {
            return "CONSIDER - Good potential with direct application";
        } else if (confidence < 5) {
            return "RESEARCH NEEDED - Build confidence before proceeding";
        } else {
            return "EVALUATE - Assess fit for your specific context";
        }
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = DecisionFrameworkComponent;