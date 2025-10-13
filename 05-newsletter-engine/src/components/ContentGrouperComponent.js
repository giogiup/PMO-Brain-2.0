const BaseComponent = require('./BaseComponent');

class ContentGrouperComponent extends BaseComponent {
    constructor(moduleConfig, globalConfig) {
        super(moduleConfig, globalConfig);
        this.groupingStrategy = 'contentType'; // Default grouping by content type
    }

    async process(insights) {
        this.log('Organizing insights into thematic sections...');
        
        // Group insights by content type with priority sorting
        const groupedInsights = this.groupInsights(insights);
        
        this.processedCount = insights.length;
        
        // Return the grouped structure instead of flattening
        return {
            grouped: groupedInsights,
            flat: this.flattenGroups(groupedInsights), // Keep flat version for compatibility
            summary: this.getGroupingSummary(groupedInsights)
        };
    }

    groupInsights(insights) {
        this.log(`Grouping ${insights.length} insights by content type and priority...`);
        
        // Group insights by content type first, then by priority within each type
        const grouped = {};

        insights.forEach(insight => {
            const contentType = insight.contentType || 'Knowledge';
            const impactScore = insight.impactScore || 5;
            
            // Create content type group if it doesn't exist
            if (!grouped[contentType]) {
                grouped[contentType] = [];
            }
            
            grouped[contentType].push(insight);
        });

        // Sort within each content type group by impact score (highest first)
        Object.keys(grouped).forEach(contentType => {
            grouped[contentType].sort((a, b) => (b.impactScore || 5) - (a.impactScore || 5));
        });

        // Reorder groups by strategic priority
        const orderedGroups = {};
        const groupOrder = ['Product', 'Research', 'Case Study', 'Knowledge', 'News', 'Event', 'Opinion'];
        
        groupOrder.forEach(type => {
            if (grouped[type] && grouped[type].length > 0) {
                orderedGroups[this.getGroupDisplayName(type)] = grouped[type];
            }
        });

        // Add any remaining groups not in the standard order
        Object.keys(grouped).forEach(type => {
            if (!groupOrder.includes(type) && grouped[type].length > 0) {
                orderedGroups[this.getGroupDisplayName(type)] = grouped[type];
            }
        });

        // If no grouping worked, return all as "AI+PMO Insights"
        if (Object.keys(orderedGroups).length === 0) {
            orderedGroups['AI+PMO Insights'] = insights;
        }

        this.log(`Grouped into ${Object.keys(orderedGroups).length} categories`);
        return orderedGroups;
    }

    getGroupDisplayName(contentType) {
        const displayNames = {
            'product': '🛠️ Tools & Solutions',
            'Product': '🛠️ Tools & Solutions',
            'knowledge': '💡 Methods & Best Practices',
            'Knowledge': '💡 Methods & Best Practices', 
            'research': '📊 Research & Analysis',
            'Research': '📊 Research & Analysis',
            'case_study': '🏆 Success Stories',
            'Case Study': '🏆 Success Stories',
            'news': '📰 Industry Updates',
            'News': '📰 Industry Updates',
            'event': '🎓 Learning Opportunities',
            'Event': '🎓 Learning Opportunities',
            'opinion': '🔮 Future Perspectives',
            'Opinion': '🔮 Future Perspectives'
        };
        
        return displayNames[contentType] || contentType;
    }

    getGroupingSummary(groupedInsights) {
        const summary = {};
        
        Object.keys(groupedInsights).forEach(group => {
            const insights = groupedInsights[group];
            const contentTypes = {};
            
            // Count content types within each group
            insights.forEach(insight => {
                const type = insight.contentType || 'Unknown';
                contentTypes[type] = (contentTypes[type] || 0) + 1;
            });
            
            summary[group] = {
                count: insights.length,
                averageImpact: Math.round(
                    insights.reduce((sum, insight) => sum + (insight.impactScore || 5), 0) / insights.length * 10
                ) / 10,
                averageConfidence: Math.round(
                    insights.reduce((sum, insight) => sum + (insight.confidenceScore || 5), 0) / insights.length * 10
                ) / 10,
                needsReview: insights.filter(i => i.reviewFlag).length,
                contentTypes: contentTypes
            };
        });

        return summary;
    }

    // Simple method to flatten groups if needed
    flattenGroups(groupedInsights) {
        return Object.values(groupedInsights).flat();
    }

    getMetrics() {
        return {
            ...super.getMetrics(),
            groupingStrategy: this.groupingStrategy
        };
    }
}

module.exports = ContentGrouperComponent;