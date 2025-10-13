// huggingface-analyzer.js
// Two-stage Hugging Face analysis: Re-score 50 + Deep analyze top 10

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class HuggingFaceAnalyzer {
    constructor() {
        this.apiKey = process.env.HUGGING_FACE_API_KEY;
        this.baseUrl = 'https://api-inference.huggingface.co/models';
        this.model = 'meta-llama/Llama-3.2-1B-Instruct'; // Small, fast, instruction-tuned
        
        if (!this.apiKey) {
            throw new Error('HUGGING_FACE_API_KEY environment variable required');
        }
    }

    /**
     * Stage 2A: Re-score all 50 articles with sophisticated prompt
     */
    async rescoreArticles(articlesFile) {
        try {
            console.log('🔄 Stage 2A: Hugging Face re-analysis of 50 articles...');
            
            const fileContent = JSON.parse(await fs.readFile(articlesFile, 'utf8'));
            
            // Handle different JSON structures
            let articlesData;
            if (Array.isArray(fileContent)) {
                articlesData = fileContent;
            } else if (fileContent.top50Articles) {
                articlesData = fileContent.top50Articles;
            } else if (fileContent.articles) {
                articlesData = fileContent.articles;
            } else if (fileContent.results) {
                articlesData = fileContent.results;
            } else {
                throw new Error('Could not find articles array in JSON file');
            }
            
            console.log(`📊 Loaded ${articlesData.length} articles for re-scoring`);
            
            const rescored = [];
            let processed = 0;
            let errors = 0;
            
            for (const article of articlesData) {
                try {
                    console.log(`[${processed + 1}/50] Re-scoring: ${article.title.substring(0, 60)}...`);
                    
                    const analysis = await this.sophisticatedPMOAnalysis(article);
                    
                    rescored.push({
                        ...article,
                        originalScore: article.localScore || 0,
                        huggingfaceScore: analysis.score,
                        confidenceLevel: analysis.confidence,
                        pmoCategories: analysis.categories,
                        businessImpact: analysis.impact,
                        implementationComplexity: analysis.complexity,
                        reasoning: analysis.reasoning,
                        flagged: this.detectAnomalies(article.localScore, analysis.score)
                    });
                    
                    processed++;
                    console.log(`   HF Score: ${analysis.score}/100 (Original: ${article.localScore}/100)`);
                    
                    // Rate limiting
                    await this.delay(2000);
                    
                } catch (error) {
                    console.error(`   Error: ${error.message}`);
                    errors++;
                    
                    // Keep original with error flag
                    rescored.push({
                        ...article,
                        huggingfaceScore: 0,
                        error: error.message,
                        flagged: true
                    });
                }
            }
            
            console.log(`\n✅ Stage 2A Complete: ${processed} processed, ${errors} errors`);
            
            // Sort by Hugging Face score and save
            const sortedArticles = rescored.sort((a, b) => b.huggingfaceScore - a.huggingfaceScore);
            
            const outputFile = `rescored-articles-${Date.now()}.json`;
            await fs.writeFile(outputFile, JSON.stringify(sortedArticles, null, 2));
            
            console.log(`💾 Re-scored articles saved to: ${outputFile}`);
            console.log(`🏆 Top 5 scores: ${sortedArticles.slice(0, 5).map(a => a.huggingfaceScore).join(', ')}`);
            
            return { articles: sortedArticles, outputFile };
            
        } catch (error) {
            console.error('❌ Stage 2A failed:', error.message);
            throw error;
        }
    }

    /**
     * Stage 2B: Deep analysis of top 10 articles
     */
    async deepAnalyzeTop10(rescoredArticles) {
        try {
            console.log('\n🔬 Stage 2B: Deep analysis of top 10 articles...');
            
            const top10 = rescoredArticles.slice(0, 10);
            const analyzed = [];
            
            for (let i = 0; i < top10.length; i++) {
                const article = top10[i];
                console.log(`[${i + 1}/10] Deep analyzing: ${article.title.substring(0, 60)}...`);
                
                try {
                    const deepAnalysis = await this.deepContentAnalysis(article);
                    
                    analyzed.push({
                        ...article,
                        executiveSummary: deepAnalysis.summary,
                        pmoApplications: deepAnalysis.applications,
                        implementationSteps: deepAnalysis.steps,
                        riskAssessment: deepAnalysis.risks,
                        roiProjection: deepAnalysis.roi,
                        stakeholderImpact: deepAnalysis.stakeholders,
                        pmobokAlignment: deepAnalysis.pmbok,
                        recommendedAction: deepAnalysis.recommendation
                    });
                    
                    console.log(`   ✅ Deep analysis complete`);
                    await this.delay(3000); // Longer delay for deep analysis
                    
                } catch (error) {
                    console.error(`   Error in deep analysis: ${error.message}`);
                    analyzed.push({ ...article, deepAnalysisError: error.message });
                }
            }
            
            const outputFile = `deep-analysis-top10-${Date.now()}.json`;
            await fs.writeFile(outputFile, JSON.stringify(analyzed, null, 2));
            
            console.log(`\n🎯 Stage 2B Complete: Deep analysis saved to ${outputFile}`);
            return { articles: analyzed, outputFile };
            
        } catch (error) {
            console.error('❌ Stage 2B failed:', error.message);
            throw error;
        }
    }

    /**
     * Sophisticated PMO relevance analysis prompt
     */
    async sophisticatedPMOAnalysis(article) {
        const prompt = `Analyze this article for PMO (Project Management Office) relevance and score it 0-100.

ARTICLE:
Title: "${article.title}"
Summary: "${article.summary || article.content || 'No summary available'}"
Source: ${article.source?.name || 'Unknown'}

PMO SCORING FRAMEWORK:
Score 90-100: Direct PMO tools/methods (project planning software, PMO frameworks, project analytics)
Score 70-89: Business transformation with clear PMO applications (automation, workflow tools, team collaboration)
Score 50-69: Technology applicable to project work (AI tools for productivity, data analysis, reporting)
Score 30-49: General business content with indirect PMO value (leadership, process improvement)
Score 10-29: Technology/business content with minimal PMO connection
Score 0-9: Not relevant to PMO work (entertainment, personal content, unrelated industries)

PMO CATEGORIES:
- Project Planning & Scheduling
- Resource & Team Management
- Risk & Compliance Management  
- Stakeholder Communication
- Portfolio & Program Management
- Performance Analytics & Reporting
- Process Improvement & Automation
- Technology & Tool Integration

ANALYSIS REQUIREMENTS:
1. Score (0-100): Based on direct PMO applicability
2. Confidence (High/Medium/Low): How certain is this scoring
3. Categories: Which PMO areas this impacts (max 3)
4. Impact: Business value for PMOs (High/Medium/Low)
5. Complexity: Implementation difficulty (High/Medium/Low)  
6. Reasoning: 2-3 sentence explanation

Respond in JSON format:
{
  "score": [number 0-100],
  "confidence": "[High/Medium/Low]",
  "categories": ["category1", "category2"],
  "impact": "[High/Medium/Low]", 
  "complexity": "[High/Medium/Low]",
  "reasoning": "Brief explanation of score and PMO relevance"
}`;

        const response = await this.callHuggingFace(prompt);
        return this.parseAnalysisResponse(response);
    }

    /**
     * Deep content analysis for top articles
     */
    async deepContentAnalysis(article) {
        const prompt = `Provide executive-level analysis of this high-scoring PMO-relevant article.

ARTICLE:
Title: "${article.title}"
Content: "${article.summary || article.content}"
PMO Score: ${article.huggingfaceScore}/100

EXECUTIVE ANALYSIS REQUIRED:
1. Executive Summary (2-3 sentences): Key takeaway for PMO leaders
2. PMO Applications (3-4 bullet points): Specific use cases for project managers
3. Implementation Steps (3-4 steps): How PMOs could adopt this
4. Risk Assessment: Main risks and mitigation strategies
5. ROI Projection: Expected value/benefits for PMOs
6. Stakeholder Impact: Who in the PMO organization benefits most
7. PMBOK Alignment: Which PMBOK knowledge areas this supports
8. Recommendation: Immediate action PMO leaders should take

Respond in JSON format with detailed, actionable insights for PMO professionals.`;

        const response = await this.callHuggingFace(prompt);
        return this.parseDeepAnalysisResponse(response);
    }

    /**
     * Call Hugging Face API with generous timeouts and local fallback
     */
    async callHuggingFace(prompt, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                console.log(`   Trying HuggingFace (attempt ${i + 1})...`);
                
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout
                
                const response = await fetch(`${this.baseUrl}/${this.model}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: {
                            max_length: 2000,
                            temperature: 0.3,
                            do_sample: true,
                            return_full_text: false
                        }
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                if (result.error) {
                    throw new Error(`API Error: ${result.error}`);
                }

                console.log(`   ✅ HuggingFace success`);
                return result[0]?.generated_text || result.generated_text || '';
                
            } catch (error) {
                console.warn(`   HuggingFace failed: ${error.message}`);
                if (i === retries - 1) {
                    console.log(`   🔄 Falling back to local Ollama...`);
                    return await this.callLocalFallback(prompt);
                }
                await this.delay(10000 * (i + 1)); // Longer delays for HF
            }
        }
    }

    /**
     * Local Ollama fallback for failed HuggingFace calls
     */
    async callLocalFallback(prompt) {
        try {
            const { spawn } = require('child_process');
            
            return new Promise((resolve, reject) => {
                const process = spawn('ollama', ['run', 'llama3.1:8b', prompt]);
                let output = '';
                
                process.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                process.on('close', (code) => {
                    if (code === 0) {
                        console.log(`   ✅ Local fallback success`);
                        resolve(output.trim());
                    } else {
                        reject(new Error(`Local process failed with code ${code}`));
                    }
                });
                
                // 10 minute timeout for local processing
                setTimeout(() => {
                    process.kill();
                    reject(new Error('Local processing timeout'));
                }, 600000);
            });
            
        } catch (error) {
            console.error(`   ❌ Local fallback failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Parse PMO analysis response
     */
    parseAnalysisResponse(response) {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const analysis = JSON.parse(jsonMatch[0]);
            
            // Validate required fields
            return {
                score: Math.min(100, Math.max(0, parseInt(analysis.score) || 0)),
                confidence: analysis.confidence || 'Low',
                categories: Array.isArray(analysis.categories) ? analysis.categories : [],
                impact: analysis.impact || 'Low',
                complexity: analysis.complexity || 'Medium',
                reasoning: analysis.reasoning || 'No reasoning provided'
            };
            
        } catch (error) {
            console.warn(`   Parse error: ${error.message}`);
            // Fallback analysis
            return {
                score: 0,
                confidence: 'Low',
                categories: [],
                impact: 'Low',
                complexity: 'High',
                reasoning: 'Analysis parsing failed'
            };
        }
    }

    /**
     * Parse deep analysis response
     */
    parseDeepAnalysisResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return this.createFallbackDeepAnalysis();
            }
            
            return JSON.parse(jsonMatch[0]);
            
        } catch (error) {
            return this.createFallbackDeepAnalysis();
        }
    }

    createFallbackDeepAnalysis() {
        return {
            summary: 'Deep analysis unavailable due to parsing error',
            applications: ['Analysis failed'],
            steps: ['Manual review required'],
            risks: 'Unable to assess',
            roi: 'Unknown',
            stakeholders: 'All PMO roles',
            pmbok: 'Multiple areas',
            recommendation: 'Manual review recommended'
        };
    }

    /**
     * Detect scoring anomalies from Phi-3
     */
    detectAnomalies(originalScore, newScore) {
        // Flag obvious errors
        if (originalScore > 100) return true;
        if (originalScore > 1000) return true; // Years like 2027
        if (Math.abs(originalScore - newScore) > 50) return true; // Large discrepancy
        return false;
    }

    /**
     * Simple delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Run complete two-stage analysis
     */
    async runCompleteAnalysis(inputFile) {
        try {
            console.log('🚀 Starting two-stage Hugging Face analysis...\n');
            
            // Stage 2A: Re-score all 50
            const stage2A = await this.rescoreArticles(inputFile);
            
            // Stage 2B: Deep analyze top 10
            const stage2B = await this.deepAnalyzeTop10(stage2A.articles);
            
            console.log('\n🎉 Complete analysis finished!');
            console.log(`📊 Re-scored articles: ${stage2A.outputFile}`);
            console.log(`🔬 Deep analysis: ${stage2B.outputFile}`);
            
            return {
                rescored: stage2A.outputFile,
                deepAnalysis: stage2B.outputFile,
                topArticles: stage2B.articles
            };
            
        } catch (error) {
            console.error('❌ Complete analysis failed:', error.message);
            throw error;
        }
    }
}

// Command line interface
if (require.main === module) {
    const analyzer = new HuggingFaceAnalyzer();
    
    const inputFile = process.argv[2] || 'top50-articles-1758850338502.json';
    
    analyzer.runCompleteAnalysis(inputFile)
        .then(results => {
            console.log('\n✅ Analysis complete:', results);
        })
        .catch(error => {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        });
}

module.exports = HuggingFaceAnalyzer;