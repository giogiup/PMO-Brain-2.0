const fs = require('fs');
const path = require('path');
const PMOPrompts = require('./pmo-prompts');

class ProductionLocalFilter {
    constructor() {
        this.prompts = new PMOPrompts();
        this.stats = {
            totalProcessed: 0,
            startTime: null,
            endTime: null,
            avgScore: 0,
            topScores: []
        };
        this.logFile = path.join(__dirname, 'logs', `local-filter-${new Date().toISOString().split('T')[0]}.log`);
        this.ensureLogsDir();
    }

    ensureLogsDir() {
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    async processAllArticles() {
        this.stats.startTime = new Date();
        this.log('Starting production local filtering of all articles...');

        // Load discovery results
        const stagingDir = path.join(__dirname, '../02-discovery-engine/staging');
        const files = fs.readdirSync(stagingDir).filter(f => f.startsWith('discovery-'));
        
        if (files.length === 0) {
            throw new Error('No discovery results found in staging directory');
        }

        const latestFile = files.sort().pop();
        const filePath = path.join(stagingDir, latestFile);
        
        this.log(`Processing ${latestFile}...`);
        const discoveryData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const articles = discoveryData.articles;
        
        this.log(`Found ${articles.length} articles to analyze`);
        this.log(`Estimated completion time: ${Math.round(articles.length * 3.5)} minutes (${Math.round(articles.length * 3.5 / 60)} hours)`);
        
        const scoredArticles = [];
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            this.log(`[${i+1}/${articles.length}] Processing: ${article.title.substring(0, 80)}...`);
            
            try {
                const prompt = this.prompts.getSimplifiedSinglePrompt(article);
                const response = await this.runOllama(prompt, 5);
                const score = parseInt(response.match(/\d+/)?.[0] || '0');
                
                const scoredArticle = { ...article, localScore: score };
                scoredArticles.push(scoredArticle);
                
                this.log(`  Score: ${score}/100`);
                this.stats.totalProcessed++;
                
                // Log progress every 10 articles
                if ((i + 1) % 10 === 0) {
                    const elapsed = (Date.now() - this.stats.startTime.getTime()) / 1000 / 60;
                    const remaining = ((articles.length - (i + 1)) * elapsed) / (i + 1);
                    this.log(`Progress: ${i+1}/${articles.length} (${Math.round((i+1)/articles.length*100)}%) | Elapsed: ${Math.round(elapsed)}m | Remaining: ${Math.round(remaining)}m`);
                }
                
            } catch (error) {
                this.log(`  Error: ${error.message}`);
                scoredArticles.push({ ...article, localScore: 0 });
            }
        }
        
        // Calculate statistics
        this.stats.endTime = new Date();
        this.stats.avgScore = Math.round(scoredArticles.reduce((sum, a) => sum + a.localScore, 0) / scoredArticles.length);
        
        // Sort and get top 50
        const sorted = scoredArticles.sort((a, b) => b.localScore - a.localScore);
        const top50 = sorted.slice(0, 50);
        this.stats.topScores = top50.slice(0, 10).map(a => a.localScore);
        
        // Save results
        const outputPath = path.join(__dirname, `top50-articles-${Date.now()}.json`);
        const results = {
            timestamp: this.stats.endTime.toISOString(),
            processingStats: this.stats,
            top50Articles: top50,
            allArticles: sorted // Include all for analysis
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        
        const processingTime = Math.round((this.stats.endTime - this.stats.startTime) / 1000 / 60);
        this.log(`\n=== PRODUCTION FILTERING COMPLETE ===`);
        this.log(`Total processing time: ${processingTime} minutes (${Math.round(processingTime/60)} hours)`);
        this.log(`Articles processed: ${this.stats.totalProcessed}`);
        this.log(`Average score: ${this.stats.avgScore}/100`);
        this.log(`Top 10 scores: ${this.stats.topScores.join(', ')}`);
        this.log(`Results saved to: ${path.basename(outputPath)}`);
        this.log(`Ready for Hugging Face analysis: ${top50.length} articles`);
        
        return results;
    }

    async runOllama(prompt, timeoutMinutes = 5) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMinutes * 60 * 1000);

        try {
            const res = await fetch("http://localhost:11434/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "phi3:mini",
                    prompt: prompt,
                    stream: false
                }),
                signal: controller.signal
            });

            const data = await res.json();
            return data.response.trim();
            
        } catch (err) {
            throw new Error("Ollama API error: " + err.message);
        } finally {
            clearTimeout(timeout);
        }
    }
}

// Scheduler class
class FilterScheduler {
    constructor() {
        this.configFile = path.join(__dirname, 'scheduler-config.json');
        this.loadConfig();
    }

    loadConfig() {
        if (fs.existsSync(this.configFile)) {
            this.config = JSON.parse(fs.readFileSync(this.configFile));
        } else {
            // Default configuration
            this.config = {
                enabled: false,
                startTime: "23:00", // 11 PM default
                runDiscoveryFirst: true,
                waitBetweenSteps: 5 // minutes between discovery and analysis
            };
            this.saveConfig();
        }
    }

    saveConfig() {
        fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    }

    setStartTime(time) {
        this.config.startTime = time;
        this.saveConfig();
        console.log(`Scheduler start time set to: ${time}`);
    }

    enable() {
        this.config.enabled = true;
        this.saveConfig();
        console.log('Scheduler enabled');
    }

    disable() {
        this.config.enabled = false;
        this.saveConfig();
        console.log('Scheduler disabled');
    }

    async runFullPipeline() {
        console.log('Starting full pipeline: Discovery → Analysis');
        
        if (this.config.runDiscoveryFirst) {
            console.log('Step 1: Running discovery engine...');
            const { spawn } = require('child_process');
            
            // Run discovery engine
            const discoveryProcess = spawn('node', ['../02-discovery-engine/src/discovery-engine.js'], {
                cwd: __dirname,
                stdio: 'inherit'
            });
            
            await new Promise((resolve, reject) => {
                discoveryProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('Discovery completed successfully');
                        resolve();
                    } else {
                        reject(new Error(`Discovery failed with code ${code}`));
                    }
                });
            });
            
            // Wait between steps
            console.log(`Waiting ${this.config.waitBetweenSteps} minutes before analysis...`);
            await new Promise(resolve => setTimeout(resolve, this.config.waitBetweenSteps * 60 * 1000));
        }
        
        console.log('Step 2: Running local analysis filter...');
        const filter = new ProductionLocalFilter();
        const results = await filter.processAllArticles();
        
        console.log('Full pipeline completed successfully!');
        return results;
    }

    scheduleNextRun() {
        const [hours, minutes] = this.config.startTime.split(':').map(Number);
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // If scheduled time is in the past today, schedule for tomorrow
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const msUntilRun = scheduledTime.getTime() - now.getTime();
        const hoursUntil = Math.round(msUntilRun / 1000 / 60 / 60);
        
        console.log(`Next run scheduled for: ${scheduledTime.toLocaleString()} (in ${hoursUntil} hours)`);
        
        setTimeout(() => {
            if (this.config.enabled) {
                this.runFullPipeline().then(() => {
                    console.log('Scheduled run completed. Scheduling next run...');
                    this.scheduleNextRun(); // Schedule next run
                }).catch(console.error);
            }
        }, msUntilRun);
    }
}

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const scheduler = new FilterScheduler();
    
    switch(command) {
        case 'run':
            // Run immediately
            const filter = new ProductionLocalFilter();
            filter.processAllArticles().catch(console.error);
            break;
            
        case 'pipeline':
            // Run full pipeline immediately
            scheduler.runFullPipeline().catch(console.error);
            break;
            
        case 'schedule':
            // Set start time and enable scheduler
            const time = args[1];
            if (time && time.match(/^\d{1,2}:\d{2}$/)) {
                scheduler.setStartTime(time);
                scheduler.enable();
                scheduler.scheduleNextRun();
                console.log('Scheduler started. Press Ctrl+C to stop.');
                // Keep process running
                setInterval(() => {}, 1000);
            } else {
                console.log('Usage: node production-local-filter.js schedule HH:MM (e.g., schedule 23:00)');
            }
            break;
            
        case 'status':
            console.log('Scheduler configuration:', scheduler.config);
            break;
            
        case 'disable':
            scheduler.disable();
            break;
            
        default:
            console.log(`
Usage:
  node production-local-filter.js run                    - Run analysis only
  node production-local-filter.js pipeline              - Run discovery + analysis  
  node production-local-filter.js schedule HH:MM        - Schedule daily runs (e.g., schedule 23:00)
  node production-local-filter.js status                - Show scheduler status
  node production-local-filter.js disable               - Disable scheduler
            `);
    }
}

module.exports = { ProductionLocalFilter, FilterScheduler };