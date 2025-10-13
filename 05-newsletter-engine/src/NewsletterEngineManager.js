const { GlobalConfig } = require('./themes/GlobalConfig');
const TaglineComponent = require('./components/TaglineComponent');
const AudienceComponent = require('./components/AudienceComponent');
const DecisionFrameworkComponent = require('./components/DecisionFrameworkComponent');
const InferenceValidatorComponent = require('./components/InferenceValidatorComponent');
const ContentGrouperComponent = require('./components/ContentGrouperComponent');
const RendererComponent = require('./components/RendererComponent');

class NewsletterEngineManager {
    constructor() {
        this.globalConfig = new GlobalConfig();
        this.moduleConfig = this.globalConfig.getModuleConfig('newsletter-engine');
        this.components = new Map();
        this.pipeline = [];
        this.setupComponents();
    }
    
    setPromptManager(promptManager) {
        this.globalConfig.promptManager = promptManager;
    }
    
    setAPIClient(apiClient) {
        this.globalConfig.apiClient = apiClient;
    }
    
    setupComponents() {
        // Register all components
        this.registerComponent('tagline', TaglineComponent);
        this.registerComponent('audience', AudienceComponent);
        this.registerComponent('decisionFramework', DecisionFrameworkComponent);
        this.registerComponent('inferenceValidator', InferenceValidatorComponent);
        this.registerComponent('contentGrouper', ContentGrouperComponent);  // ✅ NEW
        this.registerComponent('renderer', RendererComponent);
        
        // Set processing pipeline
        this.setPipeline([
            'tagline',
            'audience',
            'decisionFramework',
            'inferenceValidator',
            'contentGrouper',     // ✅ NEW - Groups insights into sections
            'renderer'
        ]);
    }
    
    registerComponent(name, componentClass, config = {}) {
        const component = new componentClass(
            { ...this.moduleConfig, ...config }, 
            this.globalConfig
        );
        this.components.set(name, component);
        return this;
    }
    
    setPipeline(componentNames) {
        this.pipeline = componentNames;
        return this;
    }
    
    async generateNewsletter(articles) {
        let data = articles;
        const metrics = {};
        
        this.globalConfig.logger.log(`Starting newsletter generation with ${articles.length} articles`);
        
        for (const componentName of this.pipeline) {
            const component = this.components.get(componentName);
            if (!component) throw new Error(`Component ${componentName} not found`);
            
            this.globalConfig.logger.log(`Running ${componentName}...`);
            data = await component.process(data);
            metrics[componentName] = component.getMetrics();
        }
        
        this.globalConfig.logger.log('Newsletter generation complete');
        
        return { 
            result: data, 
            metrics: metrics 
        };
    }
}

module.exports = NewsletterEngineManager;