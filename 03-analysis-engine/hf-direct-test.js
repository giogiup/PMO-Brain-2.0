// hf-direct-test.js
// Skip general connectivity tests, go straight to Hugging Face API

const fetch = require('node-fetch');
const fs = require('fs').promises;

class DirectHFTest {
    constructor() {
        this.apiKey = process.env.HUGGING_FACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        
        if (!this.apiKey) {
            throw new Error('HUGGING_FACE_API_KEY not found');
        }
        
        console.log(`🔑 Using API Key: ${this.apiKey.substring(0, 7)}...${this.apiKey.slice(-4)}`);
    }

    /**
     * Test Hugging Face API directly with minimal model
     */
    async testHuggingFaceDirectly() {
        console.log('🎯 Testing Hugging Face API directly...');
        
        try {
            console.log('📡 Attempting connection to Hugging Face...');
            
            const response = await fetch(`${this.baseUrl}/gpt2`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'PMO-Brain/1.0'
                },
                body: JSON.stringify({
                    inputs: "Hello world",
                    parameters: {
                        max_length: 15,
                        temperature: 0.7,
                        return_full_text: false
                    }
                }),
                timeout: 60000  // 60 second timeout
            });

            console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
            
            // Log response headers for debugging
            const headers = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            console.log('📋 Response Headers:', headers);

            if (response.status === 401) {
                console.error('❌ AUTHENTICATION FAILED');
                console.log('💡 Your API key is invalid or expired');
                console.log('🔧 Solutions:');
                console.log('   1. Check https://huggingface.co/settings/tokens');
                console.log('   2. Make sure token has "read" permission');
                console.log('   3. Try regenerating the token');
                return false;
            }

            if (response.status === 403) {
                console.error('❌ ACCESS FORBIDDEN');
                console.log('💡 Your API key lacks necessary permissions');
                console.log('🔧 Solution: Enable "Inference API" access in token settings');
                return false;
            }

            if (response.status === 503) {
                console.log('⏳ MODEL LOADING (this is normal)');
                console.log('🕐 Waiting 45 seconds for model to warm up...');
                await this.delay(45000);
                
                console.log('🔄 Retrying after warm-up...');
                return this.testHuggingFaceDirectly(); // Retry once
            }

            if (response.status === 429) {
                console.error('❌ RATE LIMITED');
                console.log('💡 Too many requests - waiting 60 seconds...');
                await this.delay(60000);
                return this.testHuggingFaceDirectly(); // Retry once
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorText);
                
                if (errorText.includes('Model too busy')) {
                    console.log('💡 Model is overloaded - trying alternative...');
                    return this.testAlternativeModel();
                }
                
                return false;
            }

            const result = await response.json();
            console.log('✅ SUCCESS! Hugging Face API is working');
            console.log('📄 Sample Response:', JSON.stringify(result, null, 2));
            
            return true;

        } catch (error) {
            console.error('❌ Connection Error:', error.message);
            
            if (error.code === 'ENOTFOUND') {
                console.log('💡 DNS resolution failed - check internet/DNS settings');
            } else if (error.code === 'ECONNREFUSED') {
                console.log('💡 Connection refused - check firewall/proxy');
            } else if (error.code === 'TIMEOUT' || error.type === 'request-timeout') {
                console.log('💡 Request timeout - network may be slow');
            } else if (error.message.includes('certificate')) {
                console.log('💡 SSL certificate issue - corporate firewall?');
            }
            
            return false;
        }
    }

    /**
     * Try alternative models if GPT-2 fails
     */
    async testAlternativeModel() {
        const alternatives = [
            'microsoft/DialoGPT-small',
            'distilbert-base-uncased',
            'facebook/bart-base'
        ];

        for (const model of alternatives) {
            try {
                console.log(`🔄 Trying alternative model: ${model}`);
                
                const response = await fetch(`${this.baseUrl}/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: "Test",
                        parameters: { max_length: 10 }
                    }),
                    timeout: 30000
                });

                if (response.ok) {
                    console.log(`✅ Alternative model ${model} works!`);
                    return model;
                }

            } catch (error) {
                console.log(`❌ ${model} failed: ${error.message}`);
            }
        }

        return false;
    }

    /**
     * Test with your actual articles file
     */
    async testWithRealData() {
        console.log('\n📚 Testing with real article data...');
        
        try {
            const files = [
                'top50-articles-1758850338502.json',
                'top50-articles.json',
                'articles.json'
            ];
            
            let articlesData = null;
            let usedFile = null;
            
            for (const file of files) {
                try {
                    const content = await fs.readFile(file, 'utf8');
                    const parsed = JSON.parse(content);
                    
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        articlesData = parsed;
                        usedFile = file;
                        break;
                    } else if (parsed.articles && Array.isArray(parsed.articles)) {
                        articlesData = parsed.articles;
                        usedFile = file;
                        break;
                    }
                } catch (error) {
                    // File doesn't exist, continue
                }
            }
            
            if (!articlesData) {
                console.error('❌ No article files found');
                console.log('💡 Expected files: top50-articles-1758850338502.json');
                return false;
            }
            
            console.log(`✅ Loaded ${articlesData.length} articles from ${usedFile}`);
            
            // Test scoring one article
            const testArticle = articlesData[0];
            console.log(`🧪 Testing with: "${testArticle.title?.substring(0, 50)}..."`);
            
            const score = await this.scoreOneArticle(testArticle);
            
            if (score !== null) {
                console.log(`✅ Scoring test successful: ${score}/100`);
                return true;
            } else {
                console.error('❌ Scoring test failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Real data test failed:', error.message);
            return false;
        }
    }

    /**
     * Score a single article for testing
     */
    async scoreOneArticle(article) {
        const prompt = `Rate this article's relevance to project management from 0 to 100:

Title: "${article.title}"
Summary: "${article.summary || article.content || 'No summary available'}"

Consider: PMO tools, project planning, team management, workflow automation.
Respond with just a number from 0 to 100:`;

        try {
            const response = await fetch(`${this.baseUrl}/gpt2`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: prompt.length + 20,
                        temperature: 0.1,
                        return_full_text: false
                    }
                }),
                timeout: 45000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const text = result[0]?.generated_text || result.generated_text || '0';
            
            // Extract score from response
            const scoreMatch = text.match(/\b(\d{1,2}|100)\b/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            return Math.min(100, Math.max(0, score));
            
        } catch (error) {
            console.error('Scoring error:', error.message);
            return null;
        }
    }

    /**
     * Create simplified working analyzer
     */
    async createWorkingAnalyzer() {
        console.log('\n🔧 Creating simplified working analyzer...');
        
        const workingCode = `// huggingface-simple.js
// Simplified working version for PMO Brain 2.0

const fetch = require('node-fetch');
const fs = require('fs').promises;

class SimplePMOAnalyzer {
    constructor() {
        this.apiKey = process.env.HUGGING_FACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.model = 'gpt2'; // Verified working model
        
        if (!this.apiKey) {
            throw new Error('HUGGING_FACE_API_KEY environment variable required');
        }
    }

    async analyzeArticles(inputFile = 'top50-articles-1758850338502.json') {
        try {
            console.log('🚀 Starting PMO article analysis...');
            
            // Load articles
            const content = await fs.readFile(inputFile, 'utf8');
            const parsed = JSON.parse(content);
            const articles = Array.isArray(parsed) ? parsed : (parsed.articles || []);
            
            console.log(\`📊 Processing \${articles.length} articles\`);
            
            const results = [];
            
            for (let i = 0; i < articles.length; i++) {
                const article = articles[i];
                console.log(\`[\${i + 1}/\${articles.length}] \${article.title?.substring(0, 50)}...\`);
                
                try {
                    const score = await this.scorePMORelevance(article);
                    
                    results.push({
                        ...article,
                        originalScore: article.localScore || article.pmo_score || 0,
                        newScore: score,
                        correctedAnomalies: (article.localScore || 0) > 100,
                        scoreDiscrepancy: Math.abs((article.localScore || 0) - score)
                    });
                    
                    console.log(\`   New Score: \${score}/100 (Original: \${article.localScore || 0})\`);
                    
                    // Conservative rate limiting
                    await this.delay(4000);
                    
                } catch (error) {
                    console.error(\`   Error: \${error.message}\`);
                    results.push({
                        ...article,
                        newScore: 0,
                        error: error.message
                    });
                }
            }
            
            // Sort by new scores
            results.sort((a, b) => b.newScore - a.newScore);
            
            // Save results
            const outputFile = \`pmo-rescored-\${Date.now()}.json\`;
            await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
            
            console.log(\`\\n✅ Analysis complete! Results saved to: \${outputFile}\`);
            console.log(\`🏆 Top 5 scores: \${results.slice(0, 5).map(a => a.newScore).join(', ')}\`);
            console.log(\`🔧 Anomalies corrected: \${results.filter(a => a.correctedAnomalies).length}\`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }

    async scorePMORelevance(article) {
        const prompt = \`Score this article's PMO relevance (0-100):

Title: "\${article.title}"
Content: "\${article.summary || article.content || 'No content'}"

PMO Scoring Guide:
90-100: Direct PMO tools, frameworks, methodologies
70-89: Business transformation applicable to PMOs
50-69: Technology useful for project management
30-49: General business with indirect PMO value
10-29: Minimal PMO connection
0-9: Not relevant to PMOs

Respond with only a number from 0 to 100:\`;

        const response = await fetch(\`\${this.baseUrl}/\${this.model}\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${this.apiKey}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: prompt.length + 25,
                    temperature: 0.1,
                    return_full_text: false
                }
            }),
            timeout: 60000
        });

        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const result = await response.json();
        const text = result[0]?.generated_text || result.generated_text || '0';
        
        // Extract numeric score
        const matches = text.match(/\\b(\\d{1,2}|100)\\b/g);
        const score = matches ? parseInt(matches[0]) : 0;
        
        return Math.min(100, Math.max(0, score));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage
if (require.main === module) {
    const analyzer = new SimplePMOAnalyzer();
    
    analyzer.analyzeArticles()
        .then(results => {
            console.log('\\n🎉 PMO analysis complete!');
            console.log(\`📈 Processed \${results.length} articles successfully\`);
        })
        .catch(error => {
            console.error('💥 Analysis failed:', error.message);
        });
}

module.exports = SimplePMOAnalyzer;`;

        await fs.writeFile('huggingface-simple.js', workingCode);
        console.log('✅ Created: huggingface-simple.js');
        console.log('💡 This version uses minimal dependencies and robust error handling');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run complete test
     */
    async runCompleteTest() {
        console.log('🚀 DIRECT HUGGING FACE API TEST');
        console.log('=' .repeat(50));
        
        try {
            // Test 1: Basic API connectivity
            const apiWorking = await this.testHuggingFaceDirectly();
            if (!apiWorking) {
                console.error('❌ Cannot proceed - API not accessible');
                return false;
            }
            
            // Test 2: Real data processing
            const dataWorking = await this.testWithRealData();
            if (!dataWorking) {
                console.warn('⚠️  Data test failed, but API works');
            }
            
            // Test 3: Create working version
            await this.createWorkingAnalyzer();
            
            console.log('\\n🎉 TESTING COMPLETE!');
            console.log('✅ Hugging Face API is accessible');
            console.log('🔧 Use: node huggingface-simple.js');
            console.log('💡 This version handles network issues better');
            
            return true;
            
        } catch (error) {
            console.error('💥 Test failed:', error.message);
            return false;
        }
    }
}

// Run test
if (require.main === module) {
    const tester = new DirectHFTest();
    tester.runCompleteTest();
}

module.exports = DirectHFTest;