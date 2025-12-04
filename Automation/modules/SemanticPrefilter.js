// SemanticPrefilter.js
// Node.js wrapper for Python semantic prefilter
// Handles article scoring using semantic similarity + BM25

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SemanticPrefilter {
    constructor(config = {}) {
        this.pythonPath = config.pythonPath || 'python';
        this.scriptPath = config.scriptPath || 
            path.join(__dirname, '../Advanced-Pre-Filter/prefilter_titles.py');
        this.tempDir = config.tempDir || path.join(__dirname, '../temp/prefilter');
        this.enabled = config.enabled !== false;
    }

    async initialize() {
        if (!this.enabled) {
            console.log('⚠️  Semantic Prefilter disabled by config');
            return;
        }

        // Ensure temp directory exists
        await fs.mkdir(this.tempDir, { recursive: true });
        
        // Verify Python script exists
        try {
            await fs.access(this.scriptPath);
            console.log('✅ Semantic Prefilter initialized');
        } catch (error) {
            console.warn('⚠️  Prefilter script not found:', this.scriptPath);
            console.warn('   Semantic prefilter will be disabled');
            this.enabled = false;
        }
    }

    async scoreArticles(articles) {
        if (!this.enabled) {
            return articles.map(a => ({
                ...a,
                sim_ai: null,
                sim_enterprise: null,
                sim_pmo: null,
                bm25_score: null,
                total_score: null,
                quality_tier: 'Unknown',
                keyword_density: null
            }));
        }

        if (!articles || articles.length === 0) {
            return [];
        }

        const timestamp = Date.now();
        const inputPath = path.join(this.tempDir, `input_${timestamp}.json`);
        const outputPath = path.join(this.tempDir, `output_${timestamp}.json`);

        try {
            console.log(`   Scoring ${articles.length} articles with semantic prefilter...`);
            
            await fs.writeFile(inputPath, JSON.stringify(articles, null, 2));

            const startTime = Date.now();
            await this.runPythonPrefilter(inputPath, outputPath);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);

            const resultsJson = await fs.readFile(outputPath, 'utf-8');
            const scoredArticles = JSON.parse(resultsJson);

            console.log(`   ✅ Scored ${scoredArticles.length} articles in ${duration}s`);

            await this.cleanup([inputPath, outputPath]);

            return scoredArticles;

        } catch (error) {
            console.error('   ❌ Semantic prefilter error:', error.message);
            await this.cleanup([inputPath, outputPath]);
            
            return articles.map(a => ({
                ...a,
                sim_ai: null,
                sim_enterprise: null,
                sim_pmo: null,
                bm25_score: null,
                total_score: null,
                quality_tier: 'Error',
                keyword_density: null
            }));
        }
    }

    async runPythonPrefilter(inputPath, outputPath) {
        return new Promise((resolve, reject) => {
            const args = [
                this.scriptPath,
                '--input', inputPath,
                '--out', outputPath,
                '--csv_out', outputPath.replace('.json', '.csv')
            ];

            const process = spawn(this.pythonPath, args);
            let stderr = '';
            let timedOut = false;

            // CRITICAL FIX: Add 5-minute timeout to prevent zombie processes
            const timeout = setTimeout(() => {
                timedOut = true;
                process.kill('SIGTERM');

                // Force kill if still running after 5 seconds
                setTimeout(() => {
                    if (!process.killed) {
                        process.kill('SIGKILL');
                    }
                }, 5000);

                reject(new Error('Prefilter timeout after 5 minutes - batch too large or Python script hung'));
            }, 5 * 60 * 1000); // 5 minutes

            process.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output.includes('✅') || output.includes('Scoring')) {
                    console.log('      ', output);
                }
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                clearTimeout(timeout);

                if (timedOut) {
                    return; // Already rejected in timeout handler
                }

                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Prefilter exited with code ${code}\n${stderr}`));
                }
            });

            process.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to start prefilter: ${error.message}`));
            });
        });
    }

    async cleanup(files) {
        for (const file of files) {
            try {
                await fs.unlink(file);
            } catch (error) {
                // Ignore
            }
        }
    }

    shouldPass(article) {
        if (!article.quality_tier) return false;
        return ['Excellent', 'Good'].includes(article.quality_tier);
    }

    getStats(scoredArticles) {
        if (!scoredArticles || scoredArticles.length === 0) {
            return {
                total: 0,
                passed: 0,
                rejected: 0,
                tiers: {},
                avgScore: 0
            };
        }

        const tiers = scoredArticles.reduce((acc, article) => {
            const tier = article.quality_tier || 'Unknown';
            acc[tier] = (acc[tier] || 0) + 1;
            return acc;
        }, {});

        const passed = scoredArticles.filter(a => this.shouldPass(a));
        
        const scores = scoredArticles
            .map(a => a.total_score)
            .filter(s => s !== undefined && s !== null);
        
        const avgScore = scores.length > 0 
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
            : 0;

        return {
            total: scoredArticles.length,
            passed: passed.length,
            rejected: scoredArticles.length - passed.length,
            passRate: ((passed.length / scoredArticles.length) * 100).toFixed(1) + '%',
            tiers,
            avgScore: avgScore.toFixed(4),
            scoreRange: scores.length > 0 ? {
                min: Math.min(...scores).toFixed(4),
                max: Math.max(...scores).toFixed(4)
            } : null
        };
    }
}

module.exports = SemanticPrefilter;
