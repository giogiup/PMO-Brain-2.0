class BaseComponent {
    constructor(moduleConfig, globalConfig) {
        this.moduleConfig = moduleConfig;
        this.globalConfig = globalConfig;
        this.theme = globalConfig.theme;
        this.logger = globalConfig.logger;
        this.processedCount = 0;
    }
    
    async process(data) {
        throw new Error(`${this.constructor.name} must implement process()`);
    }
    
    validate(data) {
        return { isValid: true, errors: [] };
    }
    
    getMetrics() {
        return {
            component: this.constructor.name,
            processed: this.processedCount,
            timestamp: new Date().toISOString()
        };
    }
    
    applyTheme(content, type = 'default') {
        return this.theme.apply(content, type);
    }
    
    log(message, level = 'info') {
        this.logger.log(`[${this.constructor.name}] ${message}`, level);
    }
}

module.exports = BaseComponent;