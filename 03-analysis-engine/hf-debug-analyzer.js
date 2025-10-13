// hf-debug-analyzer.js
// Comprehensive debugging and testing script for Hugging Face API issues

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class HuggingFaceDebugger {
    constructor() {
        this.apiKey = process.env.HUGGING_FACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        
        // Test with multiple models in case of model-specific issues
        this.testModels = [
            'gpt2',                                    // Small, always available
            'microsoft/DialoGPT-medium',               // Conversational
            'facebook/bart-large-cnn',                 // Summarization
            'meta-llama/Llama-3.2-1B-Instruct',      // Your original choice
            'microsoft/Phi-3-mini-4k-instruct'        // Alternative instruction model
        ];
    }

    /**
     * Step 1: Environment and Setup Checks
     */
    async checkEnvironment() {
        console.log('🔍 STEP 1: Environment Diagnostics');
        console.log('=' .repeat(50));
        
        // Check API key
        if (!this.apiKey) {
            console.error('❌ HUGGING_FACE_API_KEY not found in environment');
            console.log('💡 Solutions:');
            console.log('   Windows CMD: set HUGGING_FACE_API_KEY=hf_your_key_here');
            console.log('   Windows PowerShell: $env:HUGGING_FACE_API_KEY="hf_your_key_here"');
            console.log('   Or add to .env file');
            return false;
        }
        
        console.log(`✅ API Key found: ${this.apiKey.substring(0, 7)}...${this.apiKey.slice(-4)}`);
        
        // Validate API key format
        if (!this.apiKey.startsWith('hf_')) {
            console.warn('⚠️  API key should start with "hf_" - this might be wrong format');
        }
        
        if (this.apiKey.length < 20) {
            console.warn('⚠️  API key seems too short - typical keys are 37+ characters');
        }
        
        // Check node-fetch
        try {
            const fetchVersion = require('node-fetch/package.json').version;
            console.log(`✅ node-fetch version: ${fetchVersion}`);
        } catch (error) {
            console.error('❌ node-fetch not installed');
            console.log('💡 Run: npm install node-fetch');
            return false;
        }
        
        // Check internet connectivity
        try {
            const response = await fetch('https://httpbin.org/get', { timeout: 5000 });
            if (response.ok) {
                console.log('✅ Internet connectivity working');
            }
        } catch (error) {
            console.error('❌ Internet connectivity issue:', error.message);
            return false;
        }
        
        return true;
    }

    /**
     * Step 2: API Authentication Test
     */
    async testAuthentication() {
        console.log('\n🔐 STEP 2: API Authentication Test');
        console.log('=' .repeat(50));
        
        try {
            // Test with the simplest possible request
            const response = await fetch(`${this.baseUrl}/gpt2`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'PMO-Brain-2.0/1.0'
                },
                body: JSON.stringify({
                    inputs: "Hello",
                    parameters: {
                        max_length: 10,
                        temperature: 0.1
                    }
                })
            });

            console.log(`Response Status: ${response.status} ${response.statusText}`);
            console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
            
            if (response.status === 401) {
                console.error('❌ Authentication failed - API key is invalid');
                console.log('💡 Solutions:');
                console.log('   1. Check your API key at https://huggingface.co/settings/tokens');
                console.log('   2. Make sure the token has "read" permissions');
                console.log('   3. Try regenerating the token');
                return false;
            }
            
            if (response.status === 403) {
                console.error('❌ Access forbidden - API key lacks permissions');
                console.log('💡 Your API key needs "Inference API" access');
                return false;
            }
            
            if (response.status === 503) {
                console.log('⏳ Model loading (this is normal for new API keys)');
                console.log('   Waiting 30 seconds for model to load...');
                await this.delay(30000);
                return this.testAuthentication(); // Retry once
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API Error ${response.status}:`, errorText);
                return false;
            }
            
            const result = await response.json();
            console.log('✅ Authentication successful!');
            console.log('Sample response:', JSON.stringify(result, null, 2));
            return true;
            
        } catch (error) {
            console.error('❌ Network/Connection error:', error.message);
            
            if (error.code === 'ENOTFOUND') {
                console.log('💡 DNS resolution failed - check your internet connection');
            } else if (error.code === 'ECONNREFUSED') {
                console.log('💡 Connection refused - check firewall/proxy settings');
            } else if (error.code === 'TIMEOUT') {
                console.log('💡 Request timeout - try again or check network speed');
            }
            
            return false;
        }
    }

    /**
     * Step 3: Model Availability Test
     */
    async testModelAvailability() {
        console.log('\n🤖 STEP 3: Testing Model Availability');
        console.log('=' .repeat(50));
        
        const workingModels = [];
        
        for (const model of this.testModels) {
            try {
                console.log(`Testing ${model}...`);
                
                const response = await fetch(`${this.baseUrl}/${model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: "Test",
                        parameters: { max_length: 5 }
                    })
                });
                
                if (response.status === 503) {
                    console.log(`   ⏳ ${model} is loading...`);
                    continue;
                }
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`   ✅ ${model} working`);
                    workingModels.push(model);
                } else {
                    console.log(`   ❌ ${model} failed: ${response.status}`);
                }
                
                await this.delay(2000); // Rate limiting
                
            } catch (error) {
                console.log(`   ❌ ${model} error: ${error.message}`);
            }
        }
        
        console.log(`\n✅ Working models: ${workingModels.length}/${this.testModels.length}`);
        return workingModels;
    }

    /**
     * Step 4: File System Check
     */
    async checkFiles() {
        console.log('\n📁 STEP 4: File System Check');
        console.log('=' .repeat(50));
        
        const expectedFiles = [
            'top50-articles-1758850338502.json',
            'huggingface-analyzer.js'
        ];
        
        const currentDir = process.cwd();
        console.log(`Current directory: ${currentDir}`);
        
        for (const file of expectedFiles) {
            try {
                const stats = await fs.stat(file);
                console.log(`✅ ${file} exists (${stats.size} bytes)`);
                
                if (file.endsWith('.json')) {
                    // Test JSON parsing
                    const content = await fs.readFile(file, 'utf8');
                    const parsed = JSON.parse(content);
                    
                    if (Array.isArray(parsed)) {
                        console.log(`   📊 Contains ${parsed.length} items`);
                    } else if (parsed.articles) {
                        console.log(`   📊 Contains ${parsed.articles.length} articles`);
                    } else {
                        console.log(`   📊 JSON structure:`, Object.keys(parsed));
                    }
                }
                
            } catch (error) {
                console.error(`❌ ${file} issue: ${error.message}`);
            }
        }
        
        return true;
    }

    /**
     * Step 5: Simplified API Test with Working Model
     */
    async runSimplifiedTest(workingModels) {
        console.log('\n🧪 STEP 5: Simplified Analysis Test');
        console.log('=' .repeat(50));
        
        if (workingModels.length === 0) {
            console.error('❌ No working models available');
            return false;
        }
        
        const testModel = workingModels[0];
        console.log(`Using working model: ${testModel}`);
        
        // Create test article
        const testArticle = {
            title: "AI-Powered Project Management Dashboard Streamlines Team Workflows",
            summary: "New project management tool uses artificial intelligence to automate task scheduling, resource allocation, and progress tracking for remote teams.",
            source: { name: "TechCrunch" }
        };
        
        try {
            const score = await this.simplifiedPMOScore(testArticle, testModel);
            console.log(`✅ Test scoring successful: ${score}/100`);
            
            if (score >= 0 && score <= 100) {
                console.log('✅ Score validation working');
                return testModel;
            } else {
                console.warn(`⚠️  Score out of range: ${score}`);
                return testModel; // Still usable
            }
            
        } catch (error) {
            console.error(`❌ Simplified test failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Simplified scoring function for testing
     */
    async simplifiedPMOScore(article, model) {
        const prompt = `Rate this article's relevance to project management from 0-100:

Title: "${article.title}"
Summary: "${article.summary}"

Consider: project planning, team management, PMO tools, workflow automation.

Respond with just a number from 0 to 100:`;

        try {
            const response = await fetch(`${this.baseUrl}/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_length: prompt.length + 10,
                        temperature: 0.1,
                        return_full_text: false
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const text = result[0]?.generated_text || result.generated_text || '0';
            
            // Extract number from response
            const scoreMatch = text.match(/\b(\d{1,2}|100)\b/);
            const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
            
            return Math.min(100, Math.max(0, score));
            
        } catch (error) {
            throw new Error(`API call failed: ${error.message}`);
        }
    }

    /**
     * Step 6: Create Fixed Version
     */
    async createFixedVersion(workingModel) {
        console.log('\n🔧 STEP 6: Creating Fixed Version');
        console.log('=' .repeat(50));
        
        const fixedCode = `// huggingface-analyzer-fixed.js
// Fixed version based on diagnostic results

const fetch = require('node-fetch');
const fs = require('fs').promises;

class HuggingFaceAnalyzer {
    constructor() {
        this.apiKey = process.env.HUGGING_FACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.model = '${workingModel}'; // Verified working model
        
        if (!this.apiKey) {
            throw new Error('HUGGING_FACE_API_KEY environment variable required');
        }
    }

    async rescoreArticles(articlesFile) {
        try {
            console.log('🔄 Re-scoring articles with verified working model...');
            
            const fileContent = JSON.parse(await fs.readFile(articlesFile, 'utf8'));
            let articlesData = Array.isArray(fileContent) ? fileContent : 
                              fileContent.articles || fileContent.top50Articles || [];
            
            console.log(\`📊 Processing \${articlesData.length} articles\`);
            
            const results = [];
            
            for (let i = 0; i < articlesData.length; i++) {
                const article = articlesData[i];
                console.log(\`[\${i + 1}/\${articlesData.length}] \${article.title?.substring(0, 50)}...\`);
                
                try {
                    const score = await this.scoreArticle(article);
                    results.push({
                        ...article,
                        originalScore: article.localScore || article.pmo_score || 0,
                        huggingfaceScore: score,
                        flagged: (article.localScore || 0) > 100 || Math.abs((article.localScore || 0) - score) > 50
                    });
                    
                    console.log(\`   Score: \${score}/100\`);
                    await this.delay(3000); // Conservative rate limiting
                    
                } catch (error) {
                    console.error(\`   Error: \${error.message}\`);
                    results.push({
                        ...article,
                        huggingfaceScore: 0,
                        error: error.message
                    });
                }
            }
            
            // Sort and save
            results.sort((a, b) => b.huggingfaceScore - a.huggingfaceScore);
            const outputFile = \`rescored-\${Date.now()}.json\`;
            await fs.writeFile(outputFile, JSON.stringify(results, null, 2));
            
            console.log(\`✅ Results saved to: \${outputFile}\`);
            return results;
            
        } catch (error) {
            console.error('❌ Rescoring failed:', error.message);
            throw error;
        }
    }

    async scoreArticle(article) {
        const prompt = \`Rate this article's PMO relevance (0-100):

Title: "\${article.title}"
Content: "\${article.summary || article.content || 'No content'}"

PMO scoring:
90-100: Direct PMO tools/frameworks
70-89: Business transformation with PMO applications  
50-69: Technology applicable to project work
30-49: General business with indirect PMO value
10-29: Minimal PMO connection
0-9: Not PMO relevant

Respond with only a number 0-100:\`;

        const response = await fetch(\`\${this.baseUrl}/\${this.model}\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${this.apiKey}\`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_length: prompt.length + 20,
                    temperature: 0.1,
                    return_full_text: false
                }
            })
        });

        if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }

        const result = await response.json();
        const text = result[0]?.generated_text || result.generated_text || '0';
        
        const scoreMatch = text.match(/\\b(\\d{1,2}|100)\\b/);
        return scoreMatch ? Math.min(100, parseInt(scoreMatch[1])) : 0;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Usage
if (require.main === module) {
    const analyzer = new HuggingFaceAnalyzer();
    const inputFile = process.argv[2] || 'top50-articles-1758850338502.json';
    
    analyzer.rescoreArticles(inputFile)
        .then(results => {
            console.log(\`\\n🎉 Complete! Top 5 scores: \${results.slice(0, 5).map(a => a.huggingfaceScore).join(', ')}\`);
        })
        .catch(error => {
            console.error('❌ Failed:', error.message);
        });
}

module.exports = HuggingFaceAnalyzer;`;

        await fs.writeFile('huggingface-analyzer-fixed.js', fixedCode);
        console.log('✅ Created: huggingface-analyzer-fixed.js');
        console.log('💡 Run with: node huggingface-analyzer-fixed.js');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run complete diagnostic
     */
    async runDiagnostic() {
        console.log('🚀 PMO BRAIN 2.0 - HUGGING FACE DIAGNOSTIC');
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Environment
            const envOk = await this.checkEnvironment();
            if (!envOk) return false;
            
            // Step 2: Authentication
            const authOk = await this.testAuthentication();
            if (!authOk) return false;
            
            // Step 3: Models
            const workingModels = await this.testModelAvailability();
            if (workingModels.length === 0) {
                console.error('❌ No models available - this might be a new API key issue');
                console.log('💡 New API keys sometimes need 24-48 hours for full model access');
                return false;
            }
            
            // Step 4: Files
            await this.checkFiles();
            
            // Step 5: Test
            const testModel = await this.runSimplifiedTest(workingModels);
            if (!testModel) return false;
            
            // Step 6: Create fixed version
            await this.createFixedVersion(testModel);
            
            console.log('\n🎉 DIAGNOSTIC COMPLETE!');
            console.log('✅ Your Hugging Face setup is working');
            console.log('🔧 Use the fixed version: huggingface-analyzer-fixed.js');
            
            return true;
            
        } catch (error) {
            console.error('💥 Diagnostic failed:', error.message);
            return false;
        }
    }
}

// Run diagnostic
if (require.main === module) {
    const diagnostic = new HuggingFaceDebugger();
    diagnostic.runDiagnostic();
}

module.exports = HuggingFaceDebugger;