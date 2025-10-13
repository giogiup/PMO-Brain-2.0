const { PMOBrainEnhancedDiscoveryEngine } = require('./src/discovery-engine');

async function run() {
    const engine = new PMOBrainEnhancedDiscoveryEngine();
    await engine.initialize();
    const results = await engine.runFullDiscovery();
    console.log('Discovery complete:', results.stats);
}

run();