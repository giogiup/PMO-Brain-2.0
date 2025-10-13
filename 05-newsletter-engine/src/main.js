#!/usr/bin/env node

const NewsletterEngineManager = require('./NewsletterEngineManager');
const PromptManager = require('./utils/PromptManager');
const path = require('path');
const fs = require('fs');

class NewsletterEngine {
    constructor() {
        this.setupLogging();
        this.loadConfiguration();
        this.initializeComponents();
    }

    setupLogging() {
        const logDir = path.join(__dirname, '../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        this.logFile = path.join(logDir, `newsletter-engine-${timestamp}.log`);
        
        this.log('🚀 ai.PMO Insights Newsletter Engine v2.0 (Component Architecture)');
        this.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    loadConfiguration() {
        try {
            const configPath = path.join(__dirname, '../config/settings.json');
            this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            this.log(`✅ Configuration loaded: ${this.config.name || 'ai.PMO Insights Engine'}`);
        } catch (error) {
            this.log(`⚠️ Using default configuration: ${error.message}`);
            this.config = {
                name: 'ai.PMO Insights Engine',
                version: '2.0.0',
                fallbackMode: true
            };
        }
    }

    initializeComponents() {
        // Initialize component manager
        this.manager = new NewsletterEngineManager();
        
        // Set up dependencies
        this.promptManager = new PromptManager();
        this.apiClient = this.initializeAPIClient();
        
        this.manager.setPromptManager(this.promptManager);
        this.manager.setAPIClient(this.apiClient);
        
        this.log(`✅ Component system initialized (${this.manager.pipeline.length} components)`);
    }

    initializeAPIClient() {
        try {
            const GroqAPIClient = require('./utils/GroqAPIClient');
            const apiKey = process.env.GROQ_API_KEY || this.config.ai?.groqApiKey;
            
            if (apiKey) {
                this.log('✅ Groq API client initialized');
                return new GroqAPIClient(apiKey);
            } else {
                this.log('⚠️ No API key found - using fallback mode');
                return null;
            }
        } catch (error) {
            this.log(`⚠️ API client initialization failed: ${error.message}`);
            return null;
        }
    }

    async run() {
        try {
            this.log('🔍 Loading content for analysis...');
            
            const content = await this.loadContent();
            this.log(`📄 Loaded ${content.length} articles for analysis`);
            
            if (content.length === 0) {
                this.log('⚠️ No content found - generating sample newsletter');
                content.push(...this.getSampleContent());
            }

            this.log('🤖 Starting component-based analysis...');
            const result = await this.manager.generateNewsletter(content);
            
            // Extract results from component pipeline
            const insights = result.result.insights || result.result;
            const newsletter = result.result.html || result.result;
            const metrics = result.metrics;
            
            this.log(`📊 Component Metrics:`);
            Object.entries(metrics).forEach(([component, metric]) => {
                this.log(`   • ${component}: processed ${metric.processed} items`);
            });

            this.log('📝 Saving outputs...');
            const outputs = await this.saveOutputs(newsletter, insights, metrics);
            
            this.log('✅ Newsletter generation complete!');
            this.log('📁 Output files:');
            outputs.forEach(file => this.log(`   • ${file}`));
            
            return {
                success: true,
                insights: insights.length,
                outputs,
                metrics
            };
            
        } catch (error) {
            this.log(`❌ Newsletter generation failed: ${error.message}`);
            console.error(error);
            return { success: false, error: error.message };
        }
    }

    async loadContent() {
        const content = [];
        
        const decisionLoggerPath = path.join(__dirname, '../../06-decision-logger/shared-data/output');
        if (fs.existsSync(decisionLoggerPath)) {
            try {
                const files = fs.readdirSync(decisionLoggerPath)
                    .filter(f => f.endsWith('.json'))
                    .slice(0, 10);
                
                for (const file of files) {
                    const data = JSON.parse(fs.readFileSync(path.join(decisionLoggerPath, file), 'utf8'));
                    if (data.approvedContent) {
                        content.push(...data.approvedContent);
                    }
                }
                this.log(`📥 Loaded ${content.length} approved articles from Decision Logger`);
            } catch (error) {
                this.log(`⚠️ Could not load from Decision Logger: ${error.message}`);
            }
        }
        
        const sharedInputPath = path.join(__dirname, '../shared-data/input');
        if (fs.existsSync(sharedInputPath)) {
            try {
                const files = fs.readdirSync(sharedInputPath).filter(f => f.endsWith('.json'));
                for (const file of files) {
                    const data = JSON.parse(fs.readFileSync(path.join(sharedInputPath, file), 'utf8'));
                    if (Array.isArray(data)) {
                        content.push(...data);
                    } else if (data.articles) {
                        content.push(...data.articles);
                    }
                }
                this.log(`📥 Loaded additional content from shared input`);
            } catch (error) {
                this.log(`⚠️ Could not load from shared input: ${error.message}`);
            }
        }
        
        return content;
    }

    getSampleContent() {
        return [
            {
                title: "AI-Powered Project Risk Assessment Tools Transform PMO Operations",
                content: "New artificial intelligence tools are revolutionizing how Project Management Offices assess and manage project risks. These advanced systems analyze multiple data points including team communication patterns, resource utilization rates, and historical project data to predict potential failures weeks before they occur. PMOs implementing these tools report 40% improvement in project success rates and 60% faster problem resolution. The technology works by continuously monitoring project health indicators across entire portfolios, alerting PMOs when intervention is needed and suggesting specific actions to take.",
                source: "PMO Today",
                url: "https://pmo-today.com/ai-risk-assessment-tools-2024",
                summary: "AI tools help PMOs predict project failures weeks in advance using data analysis."
            },
            {
                title: "Real-Time Sentiment Analysis Transforms Customer Service Teams",
                content: "Customer service departments are implementing AI sentiment analysis to monitor emotional patterns in support conversations. The technology analyzes tone, word choice, and communication frequency to identify frustrated customers before complaints escalate. Companies using this approach report 30% improvement in customer satisfaction scores. The system can detect early warning signs of customer frustration through subtle changes in language patterns, allowing teams to proactively address issues before they become serious problems.",
                source: "Customer Service Weekly", 
                url: "https://customerservice-weekly.com/sentiment-analysis-breakthrough",
                summary: "AI sentiment analysis helps customer service teams detect frustrated customers before complaints escalate."
            },
            {
                title: "2024 PMO Maturity Survey: 67% of Organizations Still Struggle with AI Integration",
                content: "A comprehensive survey of 500 PMO professionals reveals that while 89% recognize AI's potential for project management, only 33% have successfully integrated AI tools into their operations. The study, conducted by the Project Management Institute, found that the biggest barriers are lack of training (cited by 67% of respondents), unclear ROI metrics (54%), and resistance to change (48%). Organizations that have successfully adopted AI report average productivity gains of 35% and project success rate improvements of 28%.",
                source: "PMI Research",
                url: "https://pmi.org/learning/library/pmo-ai-integration-survey-2024",
                summary: "Survey shows most PMOs struggle with AI adoption despite recognizing its value."
            },
            {
                title: "Fortune 500 Company Cuts Project Delivery Time 45% Using AI Portfolio Management",
                content: "A major telecommunications company successfully implemented an AI-driven portfolio management system that reduced average project delivery time by 45% and increased stakeholder satisfaction scores by 62%. The 18-month implementation involved training 200+ project managers and integrating AI tools across 150+ active projects. The system now automatically prioritizes projects based on strategic value, resource availability, and risk factors. Initial investment of $2.3 million has already generated $12 million in efficiency savings.",
                source: "Harvard Business Review",
                url: "https://hbr.org/2024/ai-portfolio-management-case-study",
                summary: "Large enterprise achieves dramatic efficiency gains through AI portfolio management."
            },
            {
                title: "AI for PMOs: Advanced Certification Workshop - March 2025",
                content: "The Project Management Institute announces its comprehensive 3-day certification workshop on AI applications for PMO professionals. The program covers AI tool selection, implementation strategies, change management, and ROI measurement. Participants will receive hands-on training with leading AI platforms and learn to build business cases for AI adoption. The workshop is designed for PMO directors, senior project managers, and transformation leads. Early bird pricing is $1,495 until January 31st, with regular pricing at $1,895.",
                source: "PMI Events",
                url: "https://pmi.org/events/ai-pmo-certification-2025",
                summary: "Professional development opportunity for PMOs wanting to master AI applications."
            },
            {
                title: "The Death of Traditional PMOs: Why AI Will Reshape Project Leadership by 2030",
                content: "Industry expert Dr. Sarah Chen argues that traditional PMO models will become obsolete within five years as AI takes over routine project management tasks. In her controversial new analysis, Chen predicts that PMO professionals will need to evolve into 'AI orchestrators' who design, monitor, and optimize intelligent project management systems rather than managing projects directly. She estimates that 60% of current PMO activities could be automated by 2028, forcing a fundamental shift in the profession's value proposition.",
                source: "Project Management Quarterly",
                url: "https://pmq.org/future-pmo-ai-transformation-2030",
                summary: "Expert predicts AI will fundamentally reshape the PMO profession within five years."
            }
        ];
    }

    async saveOutputs(newsletter, insights, metrics) {
        const outputDir = path.join(__dirname, '../shared-data/output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        const outputs = [];
        
        const newsletterPath = path.join(outputDir, `ai-pmo-insights-${timestamp}.html`);
        fs.writeFileSync(newsletterPath, newsletter, 'utf8');
        outputs.push(newsletterPath);
        
        const insightsPath = path.join(outputDir, `insights-${timestamp}.json`);
        fs.writeFileSync(insightsPath, JSON.stringify(insights, null, 2), 'utf8');
        outputs.push(insightsPath);
        
        const metricsPath = path.join(outputDir, `metrics-${timestamp}.json`);
        fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
        outputs.push(metricsPath);
        
        return outputs;
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(logMessage);
        
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
        } catch (error) {
        }
    }
}

async function main() {
    console.log('🎯 ai.PMO Insights Newsletter Engine v2.0 (Component Architecture)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const engine = new NewsletterEngine();
    const result = await engine.run();
    
    if (result.success) {
        console.log(`\n✅ SUCCESS: Generated ${result.insights} insights using component architecture`);
        console.log(`📁 Files saved to: shared-data/output/\n`);
    } else {
        console.error(`\n❌ FAILED: ${result.error}\n`);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = NewsletterEngine;