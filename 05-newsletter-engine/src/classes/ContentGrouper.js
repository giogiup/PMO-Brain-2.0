class ContentGrouper {
    constructor() {
        this.groupingStrategy = 'contentType'; // Default grouping by content type
    }

    groupInsights(insights) {
        console.log(`📋 Grouping ${insights.length} insights by content type and priority...`);
        
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

        console.log(`✅ Grouped into ${Object.keys(orderedGroups).length} categories`);
        return orderedGroups;
    }

    getGroupDisplayName(contentType) {
        const displayNames = {
            'Product': '🛠️ Tools & Solutions',
            'Knowledge': '💡 Methods & Best Practices', 
            'Research': '📊 Research & Analysis',
            'Case Study': '🏆 Success Stories',
            'News': '📰 Industry Updates',
            'Event': '🎓 Learning Opportunities',
            'Opinion': '🔮 Future Perspectives'
        };
        
        return displayNames[contentType] || contentType;
    }

    groupByPriority(insights) {
        // Alternative grouping by impact priority
        const grouped = {
            'High Impact': [],           // Impact Score 8+
            'Medium Impact': [],         // Impact Score 6-7
            'Future Consideration': []   // Impact Score 5 or below
        };

        insights.forEach(insight => {
            const impact = insight.impactScore || 5;

            if (impact >= 8) {
                grouped['High Impact'].push(insight);
            } else if (impact >= 6) {
                grouped['Medium Impact'].push(insight);
            } else {
                grouped['Future Consideration'].push(insight);
            }
        });

        // Sort within each group by impact score (highest first)
        Object.keys(grouped).forEach(group => {
            grouped[group].sort((a, b) => (b.impactScore || 5) - (a.impactScore || 5));
        });

        // Remove empty groups
        Object.keys(grouped).forEach(group => {
            if (grouped[group].length === 0) {
                delete grouped[group];
            }
        });

        return Object.keys(grouped).length > 0 ? grouped : { 'All Insights': insights };
    }

    groupByImplementationComplexity(insights) {
        // Group by how easy/hard to implement
        const grouped = {
            'Quick Wins': [],          // Easy implementation + good impact
            'Strategic Projects': [],   // Medium complexity, high impact
            'Long-term Planning': []    // Complex or experimental
        };

        insights.forEach(insight => {
            const factor1 = insight.classification?.factor1 || '';
            const impact = insight.impactScore || 5;

            // Quick wins: easy implementation with decent impact
            if ((factor1.includes('Immediate') || factor1.includes('Plug and Play') || factor1.includes('Intuitive')) && impact >= 6) {
                grouped['Quick Wins'].push(insight);
            }
            // Strategic: medium implementation but high impact
            else if (impact >= 7) {
                grouped['Strategic Projects'].push(insight);
            }
            // Everything else
            else {
                grouped['Long-term Planning'].push(insight);
            }
        });

        Object.keys(grouped).forEach(group => {
            if (grouped[group].length === 0) {
                delete grouped[group];
            }
        });

        return Object.keys(grouped).length > 0 ? grouped : { 'All Insights': insights };
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
                    insights.reduce((sum, insight) => sum + (insight.confidenceLevel || 5), 0) / insights.length * 10
                ) / 10,
                needsReview: insights.filter(i => i.needsReview).length,
                contentTypes: contentTypes
            };
        });

        return summary;
    }

    // Simple method to flatten groups if needed
    flattenGroups(groupedInsights) {
        return Object.values(groupedInsights).flat();
    }

    // Alternative grouping strategies for different use cases
    switchGroupingStrategy(strategy, insights) {
        switch (strategy) {
            case 'priority':
                return this.groupByPriority(insights);
            case 'implementation':
                return this.groupByImplementationComplexity(insights);
            case 'contentType':
            default:
                return this.groupInsights(insights);
        }
    }
}

module.exports = ContentGrouper;