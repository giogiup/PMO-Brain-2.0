// database/test-database.js
// Test script for DatabaseManager

const DatabaseManager = require('./DatabaseManager');

async function testDatabase() {
    console.log('🧪 Testing PMO Brain Database Integration...\n');
    
    const db = new DatabaseManager();
    
    try {
        // Initialize database
        await db.initialize();
        
        // Test with sample insights (similar to your discovery engine output)
        const sampleInsights = [
            {
                title: "Microsoft Project gets AI-powered timeline optimization",
                url: "https://example.com/ai-project-optimization",
                content: "Microsoft announces AI features for automatic project timeline optimization...",
                pmoRelevanceScore: 9.5,
                aiTechnology: "Machine Learning",
                pmobokArea: "Schedule Management",
                pmoApplication: "Automated timeline optimization and resource allocation",
                businessValue: "30% reduction in project planning time",
                implementationComplexity: "Medium",
                sourceTier: "business",
                sourceName: "Microsoft News"
            },
            {
                title: "Blockchain-based project tracking reduces overhead",
                url: "https://example.com/blockchain-project-tracking",
                content: "New blockchain solution promises transparent project tracking...",
                pmoRelevanceScore: 7.2,
                aiTechnology: "Blockchain",
                pmobokArea: "Communications Management",
                pmoApplication: "Transparent stakeholder reporting and audit trails",
                businessValue: "Improved project transparency and accountability",
                implementationComplexity: "High",
                sourceTier: "frontier",
                sourceName: "Tech Innovation Daily"
            },
            {
                title: "AI sleep optimization app tracks REM cycles",
                url: "https://example.com/sleep-app-rem-cycles",
                content: "Mobile app uses AI to optimize sleep patterns...",
                pmoRelevanceScore: 2.1,
                aiTechnology: "AI/ML",
                pmobokArea: "Not applicable",
                pmoApplication: "No clear PMO application",
                businessValue: "Personal wellness only",
                implementationComplexity: "Low",
                sourceTier: "consumer",
                sourceName: "Health Tech News"
            }
        ];
        
        // Store insights
        const stored = await db.storeDailyInsights(sampleInsights);
        console.log(`📝 Stored ${stored} insights\n`);
        
        // Test rolling insights (website display)
        const rollingInsights = await db.getRollingInsights(5, 50);
        console.log(`📊 Rolling insights for website: ${rollingInsights.length} articles\n`);
        
        // Test daily top (today's featured)
        const dailyTop = await db.getDailyTop(new Date().toISOString().split('T')[0], 10);
        console.log(`🔥 Today's top insights: ${dailyTop.length} articles\n`);
        
        // Test social media highlight
        const highlight = await db.getDailyHighlight();
        if (highlight) {
            console.log(`⭐ Social media highlight: "${highlight.title}" (Score: ${highlight.pmo_relevance_score})\n`);
        }
        
        // Test weekly newsletter compilation
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekEnd = new Date();
        
        const weeklyInsights = await db.getWeeklyTop(
            weekStart.toISOString().split('T')[0],
            weekEnd.toISOString().split('T')[0],
            10
        );
        console.log(`📰 Weekly newsletter insights: ${weeklyInsights.length} articles\n`);
        
        // Show database statistics
        const stats = await db.getStats();
        console.log('📊 Database Statistics:');
        console.log(`   Total insights: ${stats.totalInsights}`);
        console.log(`   High quality (7+ score): ${stats.highQualityInsights}`);
        console.log(`   Average score: ${stats.avgScore}`);
        console.log(`   Newsletters sent: ${stats.newslettersSent}\n`);
        
        // Test sample data display
        if (rollingInsights.length > 0) {
            console.log('📋 Sample rolling insights:');
            rollingInsights.slice(0, 3).forEach((insight, i) => {
                console.log(`   ${i+1}. ${insight.title}`);
                console.log(`      Score: ${insight.pmo_relevance_score} | PMO: ${insight.pmo_application}`);
                console.log(`      URL: ${insight.url}\n`);
            });
        }
        
        console.log('✅ Database test completed successfully!');
        console.log('\n🎯 Next steps:');
        console.log('   1. Integrate with your discovery engine');
        console.log('   2. Modify website to display rolling insights');
        console.log('   3. Update newsletter engine to use weekly compilation');
        
    } catch (error) {
        console.error('❌ Database test failed:', error.message);
    } finally {
        await db.close();
    }
}

// Run test if called directly
if (require.main === module) {
    testDatabase();
}

module.exports = testDatabase;