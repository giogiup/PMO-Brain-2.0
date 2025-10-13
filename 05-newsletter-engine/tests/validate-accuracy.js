const ArticleAnalyzer = require('../src/classes/ArticleAnalyzer');
const PromptManager = require('../src/classes/PromptManager');

class AccuracyValidator {
    constructor() {
        this.promptManager = new PromptManager();
    }

    runValidationTests() {
        console.log('🧪 Running Anti-Hallucination Validation Tests...');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const testArticle = {
            title: "New AI Tool Improves Customer Service Response Times",
            content: "A startup called ServiceAI launched a new tool that analyzes customer emails and suggests responses. The company claims their tool reduces response time by helping agents craft better replies. The tool is currently in beta testing with 50 companies.",
            source: "Tech News Daily"
        };

        // Test 1: Check for invented statistics
        console.log('\n📊 Test 1: Checking for invented statistics...');
        const fakeInsight = {
            strategicValue: "PMOs report 75% improvement in stakeholder satisfaction",
            quotedStatistics: ["75% improvement"]
        };
        
        const statWarnings = this.promptManager.checkForSuspiciousStats(
            JSON.stringify(fakeInsight), 
            testArticle.content
        );
        
        if (statWarnings.length > 0) {
            console.log('✅ PASS: Detected suspicious statistics');
            statWarnings.forEach(warning => console.log(`   ⚠️ ${warning}`));
        } else {
            console.log('❌ FAIL: Did not detect invented statistics');
        }

        // Test 2: Confidence level assessment
        console.log('\n🎯 Test 2: Confidence level assessment...');
        const confidence = this.promptManager.assessConfidenceLevel(
            "PMO could use this for stakeholder communication", 
            testArticle.content
        );
        
        console.log(`   Confidence Level: ${confidence}/10`);
        if (confidence <= 6) {
            console.log('✅ PASS: Appropriately low confidence for indirect PMO application');
        } else {
            console.log('❌ FAIL: Confidence too high for indirect application');
        }

        // Test 3: Article term detection
        console.log('\n🔍 Test 3: Term detection accuracy...');
        const analyzer = new ArticleAnalyzer(null); // Fallback mode
        const hasAI = analyzer.checkForAITerms(testArticle);
        const hasPMO = analyzer.checkForPMOTerms(testArticle);
        
        console.log(`   AI Terms Detected: ${hasAI}`);
        console.log(`   PMO Terms Detected: ${hasPMO}`);
        
        if (hasAI && !hasPMO) {
            console.log('✅ PASS: Correctly identified AI content without PMO terms');
        } else {
            console.log('❌ FAIL: Term detection incorrect');
        }

        // Test 4: Safe fallback language
        console.log('\n🛡️ Test 4: Safe fallback language...');
        const fallbackAnalysis = analyzer.generateFallbackAnalysis(testArticle);
        const hasSafeLanguage = fallbackAnalysis.strategicValue.includes('report positive') || 
                               fallbackAnalysis.strategicValue.includes('potential') ||
                               fallbackAnalysis.pmoApplications.includes('could');
        
        if (hasSafeLanguage) {
            console.log('✅ PASS: Uses appropriately cautious language');
        } else {
            console.log('❌ FAIL: Language too assertive for inference');
        }

        // Test 5: Fallback analysis structure
        console.log('\n🏗️ Test 5: Fallback analysis structure...');
        const requiredFields = ['articleTitle', 'tagline', 'articleSummary', 'pmoApplications', 'classification'];
        const hasAllFields = requiredFields.every(field => fallbackAnalysis.hasOwnProperty(field));
        
        if (hasAllFields) {
            console.log('✅ PASS: Fallback analysis contains all required fields');
        } else {
            console.log('❌ FAIL: Missing required fields in fallback analysis');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🏁 Validation tests complete. Review results above.');
        console.log('\n💡 To test the full system:');
        console.log('   cd 05-newsletter-engine');
        console.log('   npm install');
        console.log('   npm start');
    }
}

// Run tests
const validator = new AccuracyValidator();
validator.runValidationTests();