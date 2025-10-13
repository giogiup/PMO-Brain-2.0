const path = require('path');
const fs = require('fs-extra');

async function testAnalyzer() {
    console.log('Testing Newsletter Engine...');
    console.log('To run full test: npm start');
    console.log('Check output in: shared-data/output/');
}

if (require.main === module) {
    testAnalyzer();
}

module.exports = { testAnalyzer };
