const { PMOBrainEnhancedDiscoveryEngine } = require('./src/discovery-engine');
const DiscoveryLogger = require('./src/DiscoveryLogger');

async function testRun() {
    console.log('=== TEST RUN - NO DATABASE UPDATES ===\n');
    
    const logger = new DiscoveryLogger();
    await logger.initialize();
    
    // Test logger methods
    console.log('Testing logger methods...\n');
    
    await logger.logRSSStart(85);
    await logger.logRSSSuccess('TechCrunch AI', 'https://techcrunch.com/feed', 5, ['Article 1', 'Article 2', 'Article 3']);
    await logger.logRSSFailed('AI News Daily', 'https://ainews.com/feed', 'Connection timeout');
    await logger.logRSSComplete(137, 82, 3);
    
    await logger.logGoogleStart(75);
    await logger.logGoogleCategory('generalAI', 22);
    await logger.logGoogleSuccess('AI tools 2025', 4, 1.234, ['Tool A', 'Tool B', 'Tool C', 'Tool D']);
    await logger.logGoogleSuccess('AI automation', 0, 0.987, []);
    await logger.logGoogleFailed('AI bad query', 'Rate limit exceeded');
    await logger.logGoogleComplete(26, 75, 100.5);
    
    await logger.logImportStart('D:\\PMO-Brain-2.0-Modular\\02-discovery-engine\\pmo_insights.db', 163);
    await logger.logImportProgress(50, 163);
    await logger.logImportProgress(100, 163);
    await logger.logImportProgress(163, 163);
    await logger.logImportComplete(163, 0, 163);
    
    await logger.logDiscoveryComplete(137, 26, 163, 248.5);
    
    console.log('\n=== TEST COMPLETE ===');
    console.log('Check log file at: D:\\PMO-Brain-2.0-Modular\\00-Daily Runner\\Logs\\discovery-' + new Date().toISOString().split('T')[0] + '.log');
}

testRun();