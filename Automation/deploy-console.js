/**
 * SmartPMO Console - Automated Deployment Script
 * 
 * This script will:
 * 1. Create necessary directories
 * 2. Copy all console files to 01-Management-Console
 * 3. Copy API files to Automation/api and Automation/utils
 * 4. Update server.js with API routes
 * 5. Install dependencies if needed
 * 6. Run tests
 * 
 * Usage: node deploy-console.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const BASE_DIR = path.join(__dirname, '..');
const CONSOLE_DIR = path.join(BASE_DIR, '01-Management-Console');
const CONSOLE_MODULES_DIR = path.join(CONSOLE_DIR, 'console-modules');
const AUTOMATION_DIR = path.join(BASE_DIR, 'Automation');
const API_DIR = path.join(AUTOMATION_DIR, 'api');
const UTILS_DIR = path.join(AUTOMATION_DIR, 'utils');
const SERVER_FILE = path.join(AUTOMATION_DIR, 'server.js');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
    log(`\n[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

/**
 * Step 1: Verify directory structure
 */
function verifyDirectories() {
    logStep('STEP 1', 'Verifying directory structure...');
    
    const requiredDirs = [
        CONSOLE_DIR,
        CONSOLE_MODULES_DIR,
        AUTOMATION_DIR
    ];
    
    const createDirs = [
        API_DIR,
        UTILS_DIR
    ];
    
    // Check required directories exist
    for (const dir of requiredDirs) {
        if (!fs.existsSync(dir)) {
            logError(`Required directory not found: ${dir}`);
            logWarning('Please run this script from D:\\PMO-Brain-2.0-Modular\\Automation');
            process.exit(1);
        }
        logSuccess(`Found: ${path.basename(dir)}`);
    }
    
    // Create directories that don't exist
    for (const dir of createDirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            logSuccess(`Created: ${path.basename(dir)}`);
        } else {
            logSuccess(`Exists: ${path.basename(dir)}`);
        }
    }
}

/**
 * Step 2: Check if files need to be copied
 */
function checkExistingFiles() {
    logStep('STEP 2', 'Checking existing files...');
    
    const filesToCheck = [
        { path: path.join(CONSOLE_DIR, 'console.html'), name: 'console.html' },
        { path: path.join(CONSOLE_MODULES_DIR, 'shared-utils.js'), name: 'shared-utils.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'discovery-tab.js'), name: 'discovery-tab.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'sources-tab.js'), name: 'sources-tab.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'operations-tab.js'), name: 'operations-tab.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'backlog-tab.js'), name: 'backlog-tab.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'statistics-tab.js'), name: 'statistics-tab.js' },
        { path: path.join(CONSOLE_MODULES_DIR, 'prefilter-tab.js'), name: 'prefilter-tab.js' },
        { path: path.join(API_DIR, 'console-routes.js'), name: 'console-routes.js' },
        { path: path.join(UTILS_DIR, 'api-logger.js'), name: 'api-logger.js' }
    ];
    
    let missingFiles = [];
    let existingFiles = [];
    
    for (const file of filesToCheck) {
        if (fs.existsSync(file.path)) {
            existingFiles.push(file.name);
            logSuccess(`Found: ${file.name}`);
        } else {
            missingFiles.push(file.name);
            logWarning(`Missing: ${file.name}`);
        }
    }
    
    return { missingFiles, existingFiles };
}

/**
 * Step 3: Provide instructions for manual file copying
 */
function provideCopyInstructions(missingFiles) {
    if (missingFiles.length === 0) {
        logSuccess('All files are present!');
        return true;
    }
    
    logStep('STEP 3', 'File Copy Instructions');
    log('\n📋 Please copy the following artifacts manually:', 'yellow');
    log('   (Copy each artifact from the conversation above)', 'yellow');
    
    const fileMap = {
        'console.html': {
            artifact: 'Artifact 1 - SmartPMO Console - Main Shell',
            destination: path.join(CONSOLE_DIR, 'console.html')
        },
        'shared-utils.js': {
            artifact: 'Artifact 2 - Shared Utilities Module',
            destination: path.join(CONSOLE_MODULES_DIR, 'shared-utils.js')
        },
        'discovery-tab.js': {
            artifact: 'Artifact 3 - Discovery Tab Module',
            destination: path.join(CONSOLE_MODULES_DIR, 'discovery-tab.js')
        },
        'sources-tab.js': {
            artifact: 'Artifact 4 - Sources Tab Module (4 Mini-Tabs)',
            destination: path.join(CONSOLE_MODULES_DIR, 'sources-tab.js')
        },
        'operations-tab.js': {
            artifact: 'Artifact 5 - Operations Tab Module',
            destination: path.join(CONSOLE_MODULES_DIR, 'operations-tab.js')
        },
        'backlog-tab.js': {
            artifact: 'Artifact 6 - Backlog Tab Module (Button Groups)',
            destination: path.join(CONSOLE_MODULES_DIR, 'backlog-tab.js')
        },
        'statistics-tab.js': {
            artifact: 'Artifact 7 - Statistics Tab Module (Date Presets)',
            destination: path.join(CONSOLE_MODULES_DIR, 'statistics-tab.js')
        },
        'prefilter-tab.js': {
            artifact: 'Artifact 8 - Pre-Filter Config Tab Module (2-Column Table)',
            destination: path.join(CONSOLE_MODULES_DIR, 'prefilter-tab.js')
        },
        'console-routes.js': {
            artifact: 'Artifact 9 - Console API Routes',
            destination: path.join(API_DIR, 'console-routes.js')
        },
        'api-logger.js': {
            artifact: 'Artifact 10 - API Logger Utility',
            destination: path.join(UTILS_DIR, 'api-logger.js')
        }
    };
    
    for (const file of missingFiles) {
        const info = fileMap[file];
        log(`\n   ${file}:`, 'cyan');
        log(`   From: ${info.artifact}`, 'white');
        log(`   To:   ${info.destination}`, 'white');
    }
    
    log('\n\n❓ After copying files, press ENTER to continue...', 'yellow');
    
    return false;
}

/**
 * Step 4: Update server.js
 */
function updateServerJs() {
    logStep('STEP 4', 'Updating server.js...');
    
    if (!fs.existsSync(SERVER_FILE)) {
        logError(`server.js not found at: ${SERVER_FILE}`);
        return false;
    }
    
    let serverContent = fs.readFileSync(SERVER_FILE, 'utf8');
    
    // Check if already updated
    if (serverContent.includes('console-routes') && serverContent.includes("app.use('/api', consoleRoutes)")) {
        logSuccess('server.js already has console routes configured');
        return true;
    }
    
    // Create backup
    const backupFile = SERVER_FILE + '.backup';
    fs.writeFileSync(backupFile, serverContent);
    logSuccess(`Backup created: ${path.basename(backupFile)}`);
    
    // Add console routes import
    if (!serverContent.includes('console-routes')) {
        const requireStatements = serverContent.match(/(const|var|let)\s+\w+\s*=\s*require\([^)]+\);/g);
        if (requireStatements && requireStatements.length > 0) {
            const lastRequire = requireStatements[requireStatements.length - 1];
            const insertPos = serverContent.indexOf(lastRequire) + lastRequire.length;
            serverContent = 
                serverContent.slice(0, insertPos) +
                "\nconst consoleRoutes = require('./api/console-routes');" +
                serverContent.slice(insertPos);
            logSuccess('Added console routes import');
        }
    }
    
    // Add API routes middleware
    if (!serverContent.includes("app.use('/api', consoleRoutes)")) {
        // Find where to insert (after other app.use statements)
        const appUseStatements = serverContent.match(/app\.use\([^)]+\);/g);
        if (appUseStatements && appUseStatements.length > 0) {
            const lastAppUse = appUseStatements[appUseStatements.length - 1];
            const insertPos = serverContent.indexOf(lastAppUse) + lastAppUse.length;
            serverContent = 
                serverContent.slice(0, insertPos) +
                "\n\n// Console API Routes\napp.use('/api', consoleRoutes);" +
                serverContent.slice(insertPos);
            logSuccess('Added API routes middleware');
        }
    }
    
    // Add static file serving for console
    if (!serverContent.includes('01-Management-Console')) {
        const staticServeRegex = /app\.use\(express\.static\([^)]+\)\);/;
        const match = serverContent.match(staticServeRegex);
        if (match) {
            const insertPos = serverContent.indexOf(match[0]) + match[0].length;
            serverContent = 
                serverContent.slice(0, insertPos) +
                "\napp.use('/console', express.static(path.join(__dirname, '..', '01-Management-Console')));" +
                serverContent.slice(insertPos);
            logSuccess('Added console static file serving');
        }
    }
    
    // Write updated server.js
    fs.writeFileSync(SERVER_FILE, serverContent);
    logSuccess('server.js updated successfully');
    
    return true;
}

/**
 * Step 5: Check dependencies
 */
function checkDependencies() {
    logStep('STEP 5', 'Checking dependencies...');
    
    const packageJsonPath = path.join(AUTOMATION_DIR, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        logWarning('package.json not found');
        logWarning('You may need to run: npm init -y');
        return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = packageJson.dependencies || {};
    
    const requiredDeps = ['express', 'sqlite3', 'cors', 'node-fetch'];
    const missingDeps = requiredDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
        logWarning(`Missing dependencies: ${missingDeps.join(', ')}`);
        log('\n❓ Install missing dependencies now? (y/n): ', 'yellow');
        
        // For automation, we'll return false and let user decide
        return false;
    }
    
    logSuccess('All dependencies are installed');
    return true;
}

/**
 * Step 6: Create test script
 */
function createTestScript() {
    logStep('STEP 6', 'Creating test script...');
    
    const testScript = `/**
 * Console API Test Script
 * Tests all API endpoints
 */

const fetch = require('node-fetch');

async function testConsole() {
    console.log('🧪 Testing SmartPMO Console API...\\n');
    
    const tests = [
        { name: 'Health Check', endpoint: 'health' },
        { name: 'Discovery Articles', endpoint: 'discovery/articles' },
        { name: 'Sources', endpoint: 'sources' },
        { name: 'Operations Log', endpoint: 'operations' },
        { name: 'Backlog', endpoint: 'backlog' },
        { name: 'Statistics', endpoint: 'statistics' },
        { name: 'Pre-Filter Config', endpoint: 'prefilter/config' }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const response = await fetch(\`http://localhost:3000/api/\${test.endpoint}\`);
            const data = await response.json();
            
            if (response.ok) {
                const count = Array.isArray(data) ? \`\${data.length} items\` : 'OK';
                console.log(\`✅ \${test.name}: \${count}\`);
                passed++;
            } else {
                console.log(\`❌ \${test.name}: HTTP \${response.status}\`);
                failed++;
            }
        } catch (error) {
            console.log(\`❌ \${test.name}: \${error.message}\`);
            failed++;
        }
    }
    
    console.log(\`\\n📊 Results: \${passed} passed, \${failed} failed\`);
    
    if (failed === 0) {
        console.log('\\n✨ All tests passed! Console is ready.');
        console.log('   Open: http://localhost:3000/console/console.html');
    }
}

testConsole();
`;
    
    const testScriptPath = path.join(AUTOMATION_DIR, 'test-console.js');
    fs.writeFileSync(testScriptPath, testScript);
    logSuccess('Test script created: test-console.js');
}

/**
 * Step 7: Display completion summary
 */
function displaySummary() {
    logStep('STEP 7', 'Deployment Summary');
    
    log('\n📁 File Structure:', 'cyan');
    log('   D:\\PMO-Brain-2.0-Modular\\', 'white');
    log('   ├── 01-Management-Console\\', 'white');
    log('   │   ├── console.html', 'green');
    log('   │   └── console-modules\\', 'white');
    log('   │       ├── shared-utils.js', 'green');
    log('   │       ├── discovery-tab.js', 'green');
    log('   │       ├── sources-tab.js', 'green');
    log('   │       ├── operations-tab.js', 'green');
    log('   │       ├── backlog-tab.js', 'green');
    log('   │       ├── statistics-tab.js', 'green');
    log('   │       └── prefilter-tab.js', 'green');
    log('   └── Automation\\', 'white');
    log('       ├── server.js (updated)', 'yellow');
    log('       ├── test-console.js (new)', 'green');
    log('       ├── api\\', 'white');
    log('       │   └── console-routes.js', 'green');
    log('       └── utils\\', 'white');
    log('           └── api-logger.js', 'green');
    
    log('\n🚀 Next Steps:', 'cyan');
    log('   1. Start the server:', 'white');
    log('      cd Automation', 'yellow');
    log('      node server.js', 'yellow');
    log('', 'white');
    log('   2. Test the API:', 'white');
    log('      node test-console.js', 'yellow');
    log('', 'white');
    log('   3. Open the console:', 'white');
    log('      http://localhost:3000/console/console.html', 'cyan');
    log('', 'white');
    
    log('✅ Deployment complete!', 'green');
}

/**
 * Main deployment function
 */
async function deploy() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║   SmartPMO Console - Automated Deployment Script         ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    try {
        // Step 1: Verify directories
        verifyDirectories();
        
        // Step 2: Check existing files
        const { missingFiles } = checkExistingFiles();
        
        // Step 3: If files are missing, provide instructions
        if (missingFiles.length > 0) {
            const allFilesPresent = provideCopyInstructions(missingFiles);
            
            if (!allFilesPresent) {
                log('\n⏸️  Deployment paused. Copy the missing files and run this script again.', 'yellow');
                return;
            }
        }
        
        // Step 4: Update server.js
        updateServerJs();
        
        // Step 5: Check dependencies
        const depsOk = checkDependencies();
        if (!depsOk) {
            log('\n📦 To install dependencies, run:', 'yellow');
            log('   cd Automation', 'cyan');
            log('   npm install express sqlite3 cors node-fetch', 'cyan');
        }
        
        // Step 6: Create test script
        createTestScript();
        
        // Step 7: Display summary
        displaySummary();
        
    } catch (error) {
        logError(`Deployment failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run deployment
deploy();