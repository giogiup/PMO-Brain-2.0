// ============================================================================
// SMARTPMO.AI - MASTER DAILY AUTOMATION PIPELINE
// ============================================================================
// PURPOSE: Fully automated content pipeline that discovers, analyzes, and publishes
//          AI + PMO insights to smartpmo.ai website daily
//
// Orchestrates all 7 steps: Discovery → PreFilter → Scoring → Fetch → Enrich → Cards → Deploy
// Run: node automation/run-daily-pipeline.js
// Test: node automation/run-daily-pipeline.js --test
// ============================================================================

require('dotenv').config();
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Import all modules
const DiscoveryEngine = require('./modules/DiscoveryEngine');
const PreFilter = require('./modules/PreFilter');
const ScoringEngine = require('./modules/ScoringEngine');
const ContentFetcher = require('./modules/ContentFetcher');
const ContentEnricher = require('./modules/ContentEnricher');
const CardGenerator = require('./modules/CardGenerator');
const ArticleDisplayManager = require('./modules/ArticleDisplayManager');
const DatabaseManager = require('./modules/DatabaseManager');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    dbPath: path.join(__dirname, '../02-discovery-engine/pmo_insights.db'),
    testMode: process.argv.includes('--test'),
    autoOpenConsole: true,
    consoleUrl: 'http://localhost:8080/console',
    
    // Step control (for testing individual steps)
    steps: {
        discovery: !process.argv.includes('--skip-discovery'),
        prefilter: !process.argv.includes('--skip-prefilter'),
        scoring: !process.argv.includes('--skip-scoring'),
        fetch: !process.argv.includes('--skip-fetch'),
        keywords: !process.argv.includes('--skip-keywords'),
        cards: !process.argv.includes('--skip-cards'),
        display: !process.argv.includes('--skip-display'),
        deploy: !process.argv.includes('--skip-deploy')
    }
};

// ============================================================================
// MAIN PIPELINE
// ============================================================================

async function runDailyPipeline() {
    const startTime = Date.now();
    const dateArg = process.argv.find(arg => arg.startsWith('--date='));
    // Use local date instead of UTC
    const d = new Date();
    const runDate = dateArg ? dateArg.split('=')[1] : 
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         SMARTPMO.AI DAILY AUTOMATION PIPELINE                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log(`📅 Date: ${runDate}`);
    console.log(`⏰ Started: ${new Date().toLocaleTimeString()}`);
    console.log(`🧪 Mode: ${CONFIG.testMode ? 'TEST' : 'PRODUCTION'}\n`);
    
    const db = new DatabaseManager(CONFIG.dbPath);
    await db.initialize();
    
    const results = {
        discovery: null,
        prefilter: null,
        scoring: null,
        fetch: null,
        keywords: null,
        cards: null,
        display: null,
        deploy: null
    };
    
    let masterRunId = null;
    
    try {
        // ====================================================================
        // STEP 1: DISCOVERY ENGINE
        // ====================================================================
        if (CONFIG.steps.discovery) {
            console.log('═'.repeat(60));
            console.log('STEP 1/7: DISCOVERY ENGINE');
            console.log('═'.repeat(60));
            
            const discovery = new DiscoveryEngine(db);
            results.discovery = await discovery.run();
            masterRunId = results.discovery.runId;
            
            console.log(`\n✅ Discovery complete: ${results.discovery.articlesInserted} articles inserted\n`);
            
            if (results.discovery.articlesInserted === 0) {
                console.log('⚠️  No new articles found. Stopping pipeline.');
                return results;
            }
        }
        
        // ====================================================================
        // STEP 1.5: PRE-FILTER (Keyword-based selection)
        // ====================================================================
        if (CONFIG.steps.prefilter) {
            console.log('═'.repeat(60));
            console.log('STEP 1.5/7: PRE-FILTER (Keyword Matching)');
            console.log('═'.repeat(60));
            
            const prefilter = new PreFilter(db);
            results.prefilter = await prefilter.run(runDate);
            
            console.log(`\n✅ Pre-filter complete: ${results.prefilter.passed}/${results.prefilter.total} articles passed\n`);
            
            if (results.prefilter.passed === 0) {
                console.log('⚠️  No articles passed pre-filter. Stopping pipeline.');
                return results;
            }
        }
        
        // ====================================================================
        // STEP 2: AI SCORING
        // ====================================================================
        if (CONFIG.steps.scoring) {
            console.log('═'.repeat(60));
            console.log('STEP 2/7: AI SCORING (Gemini 2.0 Flash)');
            console.log('═'.repeat(60));
            
            const scorer = new ScoringEngine(db);
            results.scoring = await scorer.run(runDate);
            
            console.log(`\n✅ Scoring complete: ${results.scoring.scored} articles scored\n`);
            
            if (results.scoring.highQuality === 0) {
                console.log('⚠️  No high-quality articles (score >= 70). Stopping pipeline.');
                return results;
            }
        }
        
        // ====================================================================
        // STEP 3: CONTENT FETCH (Top 20)
        // ====================================================================
        if (CONFIG.steps.fetch) {
            console.log('═'.repeat(60));
            console.log('STEP 3/7: CONTENT FETCH (Jina AI - Top 20)');
            console.log('═'.repeat(60));
            
            const fetcher = new ContentFetcher(db, CONFIG);
            results.fetch = await fetcher.run(runDate, 20); // Top 20 articles
            
            console.log(`\n✅ Content fetch complete: ${results.fetch.fetched}/${results.fetch.attempted} articles\n`);
            
            if (results.fetch.fetched < 5) {
                console.log('⚠️  Too few articles fetched. Check errors in console.');
                // Continue anyway - we might still have enough from previous days
            }
        }
        
        // ====================================================================
        // STEP 4: CONTENT ENRICHMENT (Tagline, TLDR, Badges, Keywords)
        // ====================================================================
        if (CONFIG.steps.keywords) {
            console.log('═'.repeat(60));
            console.log('STEP 4/7: CONTENT ENRICHMENT (Gemini - All Metadata)');
            console.log('═'.repeat(60));
            
            const enricher = new ContentEnricher(db);
            results.keywords = await enricher.run(runDate, 20); // Top 20 articles
            
            console.log(`\n✅ Content enriched: ${results.keywords.totalKeywords} keywords from ${results.keywords.succeeded} articles\n`);
        }
        
        // ====================================================================
        // STEP 5: CARD GENERATION (Smart 10-20 logic)
        // ====================================================================
        if (CONFIG.steps.cards) {
            console.log('═'.repeat(60));
            console.log('STEP 5/7: SMART CARD GENERATION');
            console.log('═'.repeat(60));

            const generator = new CardGenerator(db);
            results.cards = await generator.run(runDate);

            console.log(`\n✅ Cards generated: ${results.cards.cardsGenerated} cards`);
            if (results.cards.premiumCount > 0) {
                console.log(`   ⭐ Premium articles (>=89): ${results.cards.premiumCount}`);
            }
            console.log();
        }

        // ====================================================================
        // STEP 6: ARTICLE DISPLAY MANAGER (FIFO - 20 article limit)
        // ====================================================================
        if (CONFIG.steps.display) {
            console.log('═'.repeat(60));
            console.log('STEP 6/7: ARTICLE DISPLAY MANAGER (Latest Intelligence)');
            console.log('═'.repeat(60));

            // ArticleDisplayManager uses better-sqlite3 (sync), so create separate connection
            const Database = require('better-sqlite3');
            const syncDb = new Database(CONFIG.dbPath);
            const displayManager = new ArticleDisplayManager(syncDb);

            // Get top scored articles from today that aren't already displayed
            const articlesToDisplay = syncDb.prepare(`
                SELECT id, title, pmo_score, discovered_at
                FROM daily_insights
                WHERE DATE(discovered_at) = ?
                  AND pmo_score >= 70
                  AND content_fetched = 1
                  AND is_displayed = 0
                ORDER BY pmo_score DESC, discovered_at DESC
                LIMIT 20
            `).all(runDate);

            console.log(`\n   Found ${articlesToDisplay.length} articles ready for display`);

            let displayedCount = 0;
            let skippedCount = 0;

            for (const article of articlesToDisplay) {
                try {
                    const result = await displayManager.updateAutoSection(article.id);
                    displayedCount++;
                    console.log(`   ✅ Displayed: ${article.title.substring(0, 60)}... (score: ${article.pmo_score})`);
                } catch (error) {
                    skippedCount++;
                    console.log(`   ⚠️  Skipped article ${article.id}: ${error.message}`);
                }
            }

            results.display = {
                attempted: articlesToDisplay.length,
                displayed: displayedCount,
                skipped: skippedCount
            };

            // Close sync database connection
            syncDb.close();

            console.log(`\n✅ Display update complete: ${displayedCount} articles added to Latest Intelligence\n`);
        }

        // ====================================================================
        // STEP 7: GIT DEPLOY
        // ====================================================================
        if (CONFIG.steps.deploy && !CONFIG.testMode) {
            console.log('═'.repeat(60));
            console.log('STEP 6/7: GIT DEPLOY');
            console.log('═'.repeat(60));
            
            results.deploy = await deployToGit();
            
            console.log(`\n✅ Deploy complete: Changes pushed to GitHub\n`);
        } else if (CONFIG.testMode) {
            console.log('═'.repeat(60));
            console.log('STEP 6/7: GIT DEPLOY - SKIPPED (test mode)');
            console.log('═'.repeat(60));
            console.log('\n⭐️  Skipping git deploy in test mode\n');
        }
        
        // ====================================================================
        // FINALIZE
        // ====================================================================
        const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
        
        console.log('═'.repeat(60));
        console.log('📊 PIPELINE SUMMARY');
        console.log('═'.repeat(60));
        console.log(`⏱️  Total time: ${duration} minutes`);
        console.log(`📥 Articles discovered: ${results.discovery?.articlesInserted || 0}`);
        console.log(`🔍 Articles pre-filtered: ${results.prefilter?.passed || 0}/${results.prefilter?.total || 0}`);
        console.log(`🎯 Articles scored: ${results.scoring?.scored || 0}`);
        console.log(`📄 Content fetched: ${results.fetch?.fetched || 0}`);
        console.log(`🎨 Articles enriched: ${results.keywords?.succeeded || 0}`);
        console.log(`🎴 Cards generated: ${results.cards?.cardsGenerated || 0}`);
        if (results.cards?.premiumCount > 0) {
            console.log(`   ⭐ Premium (>=89): ${results.cards.premiumCount}`);
        }
        console.log(`📺 Articles displayed: ${results.display?.displayed || 0}/${results.display?.attempted || 0}`);
        console.log(`🚀 Deployed: ${results.deploy?.success ? 'YES' : 'NO'}`);
        console.log('═'.repeat(60));
        console.log();
        
        // Update daily_runs table
        await updateDailyRunsTable(db, runDate, results, duration);
        
        // Log to operations_log
        await db.logOperation('pipeline-complete', 'automation', 'success',
            `Daily pipeline completed in ${duration} minutes`,
            JSON.stringify(results)
        );

        // Create and auto-open summary log
        await createAndOpenSummaryLog(runDate, duration, results);

    } catch (error) {
        console.error('\n❌ PIPELINE FAILED:', error.message);
        console.error(error.stack);
        
        await db.logOperation('pipeline-failed', 'automation', 'failed', 
            `Pipeline failed: ${error.message}`, 
            error.stack
        );
        
        throw error;
    } finally {
        await db.close();
        
        // Open console if configured
        if (CONFIG.autoOpenConsole && !CONFIG.testMode) {
            console.log(`\n🌐 Opening console: ${CONFIG.consoleUrl}\n`);
            await openConsole();
        }
    }
    
    return results;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createAndOpenSummaryLog(runDate, duration, results) {
    const fs = require('fs');
    const logsDir = path.join(__dirname, 'logs');

    // Create logs directory if needed
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    // Clean up old logs (>30 days)
    try {
        const files = fs.readdirSync(logsDir);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        let deletedCount = 0;

        files.forEach(file => {
            const match = file.match(/(\d{4}-\d{2}-\d{2})-(summary|detailed)\.log$/);
            if (match) {
                const fileDate = new Date(match[1]);
                if (fileDate < cutoffDate) {
                    fs.unlinkSync(path.join(logsDir, file));
                    deletedCount++;
                }
            }
        });

        if (deletedCount > 0) {
            console.log(`🗑️  Cleaned up ${deletedCount} log files older than 30 days`);
        }
    } catch (error) {
        console.log(`⚠️  Could not cleanup old logs: ${error.message}`);
    }

    // Build summary content
    const separator = '='.repeat(70);
    const summaryContent = [
        separator,
        'DAILY PIPELINE SUMMARY',
        `Date: ${runDate}`,
        `Duration: ${duration} minutes`,
        separator,
        '',
        '📊 PIPELINE RESULTS:',
        `  Discovery:    ${results.discovery?.articlesInserted || 0} articles found`,
        `  PreFilter:    ${results.prefilter?.passed || 0}/${results.prefilter?.total || 0} passed (${calcPercentage(results.prefilter?.passed, results.prefilter?.total)}%)`,
        `  Scoring:      ${results.scoring?.scored || 0} articles scored`,
        `  Fetch:        ${results.fetch?.fetched || 0} articles fetched`,
        `  Enrichment:   ${results.keywords?.succeeded || 0} articles enriched`,
        `  Cards:        ${results.cards?.cardsGenerated || 0} cards generated`,
        results.cards?.premiumCount > 0 ? `    Premium (>=89): ${results.cards.premiumCount}` : '',
        `  Deployed:     ${results.deploy?.success ? 'YES ✅' : 'NO ❌'}`,
        '',
        separator,
        'DISCOVERY DETAILS:',
        separator
    ];

    // Add Discovery stats if available
    if (results.discovery?.stats) {
        const stats = results.discovery.stats;
        summaryContent.push(
            `  RSS:      ${stats.sourcesSucceeded || 0} sources successful`,
            `  Retries:  ${stats.retryStats?.totalRetries || 0} total retry attempts`
        );
    }

    summaryContent.push(
        '',
        separator,
        'NOTES:',
        separator,
        '- Check daily-run.log for detailed output',
        '- Check database for article-level details',
        '- Visit http://localhost:8080/console for web interface',
        separator,
        ''
    );

    // Write summary file
    const summaryFile = path.join(logsDir, `${runDate}-summary.log`);
    fs.writeFileSync(summaryFile, summaryContent.filter(line => line !== '').join('\n'));

    console.log(`\n📄 Summary log: ${summaryFile}`);

    // Auto-open summary log
    try {
        exec(`powershell.exe Start-Process "${summaryFile}"`, (error) => {
            if (!error) {
                console.log('📂 Auto-opened summary log\n');
            }
        });
    } catch (error) {
        console.log(`⚠️  Could not auto-open summary: ${error.message}\n`);
    }
}

function calcPercentage(part, total) {
    if (!total || total === 0) return '0.0';
    return ((part / total) * 100).toFixed(1);
}

async function deployToGit() {
    const websitePath = path.join(__dirname, '../website');
    
    try {
        // Check for changes
        const { stdout: status } = await execPromise('git status --porcelain', { 
            cwd: websitePath 
        });
        
        if (!status.trim()) {
            console.log('   No changes to commit');
            return { success: true, message: 'No changes' };
        }
        
        // Git add
        console.log('   📦 Adding changes...');
        await execPromise('git add api/daily-cards.json', { cwd: websitePath });
        
        // Git commit
        const commitMsg = `Daily cards update - ${new Date().toISOString().split('T')[0]}`;
        console.log(`   💾 Committing: ${commitMsg}`);
        await execPromise(`git commit -m "${commitMsg}"`, { cwd: websitePath });
        
        // Git push
        console.log('   🚀 Pushing to GitHub...');
        await execPromise('git push origin main', { cwd: websitePath });
        
        console.log('   ✅ Cloudflare Pages will auto-deploy (~30 seconds)');
        
        return { success: true, message: 'Deployed successfully' };
        
    } catch (error) {
        console.error('   ❌ Deploy failed:', error.message);
        
        // Retry once
        console.log('   🔄 Retrying in 5 seconds...');
        await sleep(5000);
        
        try {
            await execPromise('git push origin main', { cwd: websitePath });
            return { success: true, message: 'Deployed after retry' };
        } catch (retryError) {
            return { success: false, error: retryError.message };
        }
    }
}

async function openConsole() {
    const platform = process.platform;
    const command = platform === 'win32' ? 'start' : 
                   platform === 'darwin' ? 'open' : 'xdg-open';
    
    try {
        await execPromise(`${command} ${CONFIG.consoleUrl}`);
    } catch (error) {
        console.log(`   ℹ️  Couldn't auto-open console. Visit: ${CONFIG.consoleUrl}`);
    }
}

async function updateDailyRunsTable(db, runDate, results, duration) {
    // Get UTC datetime for timestamps
    const utcDateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    const data = {
        run_date: runDate,
        step1_discovery_status: results.discovery ? 'completed' : 'skipped',
        step1_articles_found: results.discovery?.articlesInserted || 0,
        step2_scoring_status: results.scoring ? 'completed' : 'skipped',
        step2_articles_scored: results.scoring?.scored || 0,
        step3_fetch_status: results.fetch ? 'completed' : 'skipped',
        step3_articles_fetched: results.fetch?.fetched || 0,
        step4_keywords_status: results.keywords ? 'completed' : 'skipped',
        step4_articles_processed: results.keywords?.succeeded || 0,
        step5_newsletter_status: results.cards ? 'completed' : 'skipped',
        step5_articles_processed: results.cards?.cardsGenerated || 0,
        updated_at: utcDateTime  // UTC timestamp
    };
    
    // Insert or update
    await db.run(`
        INSERT INTO daily_runs (
            run_date, 
            step1_discovery_status, step1_articles_found,
            step2_scoring_status, step2_articles_scored,
            step3_fetch_status, step3_articles_fetched,
            step4_keywords_status, step4_articles_processed,
            step5_newsletter_status, step5_articles_processed,
            updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(run_date) DO UPDATE SET
            step1_discovery_status = excluded.step1_discovery_status,
            step1_articles_found = excluded.step1_articles_found,
            step2_scoring_status = excluded.step2_scoring_status,
            step2_articles_scored = excluded.step2_articles_scored,
            step3_fetch_status = excluded.step3_fetch_status,
            step3_articles_fetched = excluded.step3_articles_fetched,
            step4_keywords_status = excluded.step4_keywords_status,
            step4_articles_processed = excluded.step4_articles_processed,
            step5_newsletter_status = excluded.step5_newsletter_status,
            step5_articles_processed = excluded.step5_articles_processed,
            updated_at = excluded.updated_at
    `, Object.values(data));
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
    runDailyPipeline()
        .then((results) => {
            console.log('✅ Pipeline completed successfully!\n');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Pipeline failed with error:\n', error);
            process.exit(1);
        });
}

module.exports = runDailyPipeline;