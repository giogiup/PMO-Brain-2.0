// ============================================================================
// SCORING ENGINE - AI-powered PMO relevance scoring
// ============================================================================
// PURPOSE: Score articles (0-100) based on PMO relevance using AI
//
// TASK CHARACTERISTICS:
//   - Low token usage: ~500 tokens per article (just title + URL)
//   - High volume: Need to score 100-200 articles/day
//   - Speed important: Should complete in minutes, not hours
//
// OPTIMAL PROVIDER: Groq (fast, cheap for low-token tasks)
//   - 280 tokens/sec inference speed
//   - 100K tokens/day free tier = 200 articles/day
//   - Perfect fit for this workload
//
// CONFIGURATION:
//   Set in .env: AI_PROVIDER_SCORING=groq
//   Falls back to AI_PROVIDER if not set
//
// DEPENDENCIES:
//   - AIProvider: Handles multi-provider abstraction
//   - DatabaseManager: Loads prompts, saves scores
//   - prompt_templates table: Must have active 'scoring' prompt
//
// DATA FLOW:
//   1. Load active scoring prompt from database (version-controlled)
//   2. Get pre-filtered articles (prefilter_passed=1, no score yet)
//   3. For each article: Send title+URL to AI, get score
//   4. Save score to daily_insights.pmo_score
//   5. Track performance metrics for prompt evaluation
//
// MODIFICATIONS CHECKLIST:
//   When changing this file, verify:
//   □ AIProvider task parameter is 'SCORING' (uppercase)
//   □ Prompt loading from DB still works
//   □ Score extraction regex handles all provider responses
//   □ Rate limiting respects provider-specific delays
//   □ Database updates don't break foreign key constraints
// ============================================================================

const AIProvider = require('./AIProvider');

class ScoringEngine {
    constructor(db, config = {}) {
        this.db = db;
        
        this.config = {
            scoring_batch_size: config.scoring_batch_size || 10,
            max_retries: config.max_retries || 3,
            ...config
        };
        
        // CRITICAL: Pass 'SCORING' task to AIProvider
        // This enables task-specific provider selection (AI_PROVIDER_SCORING)
        // WHY: Scoring has different requirements than enrichment
        //      - Low token usage (just title+URL, not full content)
        //      - High volume (100-200 articles/day)
        //      - Speed matters (users wait for results)
        // BEST PROVIDER: Groq (fast, cheap for low-token)
        this.aiProvider = new AIProvider('SCORING');
        
        this.prompt = null; // Loaded from database at runtime
        
        this.stats = {
            total: 0,
            scored: 0,
            failed: 0,
            highQuality: 0, // score >= 70
            avgScore: 0
        };
    }
    
    /**
     * Main execution method - scores all unscored pre-filtered articles
     * 
     * @param {string} runDate - Date to process (YYYY-MM-DD format)
     * @returns {object} Statistics about scoring run
     * 
     * PROCESS FLOW:
     *   1. Load active scoring prompt from database
     *   2. Query articles needing scores (pre-filtered, no score yet)
     *   3. Score each article (with rate limiting)
     *   4. Update database with scores
     *   5. Log prompt performance for future optimization
     * 
     * ERROR HANDLING:
     *   - If prompt loading fails: throw (can't proceed without prompt)
     *   - If individual article fails: log, continue (don't break pipeline)
     *   - If all fail: return stats showing 0 scored (pipeline handles)
     */
    async run(runDate) {
        console.log('\nStarting AI scoring...\n');
        
        // STEP 1: Load scoring prompt from database
        // WHY DATABASE: Prompts are version-controlled, can A/B test versions
        // CRITICAL: Must have is_active=1 prompt in prompt_templates table
        try {
            this.prompt = await this.db.getActivePrompt('scoring');
            console.log(`📋 Using scoring prompt: ${this.prompt.version}\n`);
        } catch (error) {
            console.error('❌ Failed to load scoring prompt:', error.message);
            throw error; // Can't score without prompt
        }
        
        // STEP 2: Get articles to score
        // QUERY LOGIC:
        //   - published_date = runDate (only today's articles)
        //   - prefilter_passed = 1 (only articles that passed keyword filter)
        //   - pmo_score IS NULL (haven't been scored yet)
        //   - ORDER BY prefilter_score DESC (score highest-potential first)
        // WHY: Pre-filtering reduces AI calls by 50-90%, saving tokens/cost
        const articles = await this.db.all(`
            SELECT id, title, url, prefilter_score
            FROM daily_insights
            WHERE published_date = ?
            AND prefilter_passed = 1
            AND pmo_score IS NULL
            ORDER BY prefilter_score DESC
        `, [runDate]);
        
        if (articles.length === 0) {
            console.log('⚠️  No pre-filtered articles to score\n');
            return this.stats;
        }
        
        this.stats.total = articles.length;
        console.log(`Found ${articles.length} articles to score\n`);
        
        // STEP 3: Score each article
        let totalScore = 0;
        
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i + 1}/${articles.length}] Scoring: ${article.title.substring(0, 60)}...`);
            
            try {
                const score = await this.scoreArticle(article);
                
                if (score !== null) {
                    // Save score to database
                    await this.db.run(`
                        UPDATE daily_insights
                        SET pmo_score = ?,
                            scoring_prompt_version = ?
                        WHERE id = ?
                    `, [score, this.prompt.version, article.id]);
                    
                    this.stats.scored++;
                    totalScore += score;
                    
                    if (score >= 70) {
                        this.stats.highQuality++;
                    }
                    
                    console.log(`  Score: ${score}/100`);
                } else {
                    this.stats.failed++;
                    console.log(`  Failed to score`);
                }
                
            } catch (error) {
                this.stats.failed++;
                console.log(`  Error: ${error.message}`);
            }
            
            // RATE LIMITING: Critical to avoid API errors
            // WHY: Each provider has different rate limits
            //      - Groq: 300K tokens/min (generous, but be safe)
            //      - Gemini: 15 req/min (must respect)
            // SOLUTION: Use provider-specific delay from AIProvider
            await this.sleep(this.aiProvider.getRateLimit());
        }
        
        // STEP 4: Calculate statistics
        this.stats.avgScore = this.stats.scored > 0 
            ? Math.round(totalScore / this.stats.scored) 
            : 0;
        
        console.log(`\n✅ Scoring summary:`);
        console.log(`   ${this.stats.scored}/${this.stats.total} articles scored successfully`);
        console.log(`   Average score: ${this.stats.avgScore}/100`);
        console.log(`   High quality (>=70): ${this.stats.highQuality}`);
        console.log();
        
        // STEP 5: Log prompt performance
        // WHY: Track which prompt versions perform best
        //      - Higher avg scores = better at finding quality
        //      - Track over time to optimize prompt engineering
        if (this.stats.scored > 0) {
            await this.db.logPromptPerformance(
                this.prompt.id,
                this.stats.avgScore,
                this.stats.scored
            );
        }
        
        return this.stats;
    }
    
    /**
     * Score a single article using AI
     * 
     * @param {object} article - Article with title, url, prefilter_score
     * @returns {number|null} Score 0-100, or null if failed
     * 
     * PROCESS:
     *   1. Replace {title} and {url} placeholders in prompt template
     *   2. Send to AI provider (Groq/Gemini/OpenAI)
     *   3. Extract numeric score from response
     *   4. Clamp to 0-100 range
     * 
     * PROMPT STRUCTURE:
     *   Database prompt template contains {title} and {url} placeholders
     *   These get replaced with actual article data
     *   Example: "Score this article: {title} from {url}"
     *   Becomes: "Score this article: AI in PMO from example.com"
     * 
     * SCORE EXTRACTION:
     *   AI response format varies but usually: "Score: 85" or just "85"
     *   Regex extracts first number found in response
     *   Clamps to 0-100 range (in case AI returns 105 or -5)
     * 
     * ERROR HANDLING:
     *   - If AI call fails: returns null (logged by caller)
     *   - If no number found: returns null
     *   - If invalid range: clamps to 0-100
     */
    async scoreArticle(article) {
        // Replace placeholders in prompt template with actual article data
        let prompt = this.prompt.prompt_text
            .replace('{title}', article.title)
            .replace('{url}', article.url);

        // Call AI provider (abstracted - could be Groq, Gemini, or OpenAI)
        const text = await this.aiProvider.generateCompletion(prompt, {
            temperature: 0.3,  // Low temperature = more consistent scoring
            maxTokens: 500     // Short response expected (just score + brief reasoning)
        });
        
        if (!text) {
            return null; // AI call failed
        }
        
        // Extract number from response using regex
        // PATTERN: Matches any sequence of 1-3 digits
        // EXAMPLES: 
        //   "Score: 85" → matches "85"
        //   "This rates 72 out of 100" → matches "72"  
        //   "5" → matches "5"
        // WHY 1-3 digits: Scores are 0-100 (max 3 digits)
        const scoreMatch = text.match(/\d+/);
        if (scoreMatch) {
            const score = parseInt(scoreMatch[0]);
            // Clamp to valid range (0-100)
            // Math.min(100, ...) ensures not > 100
            // Math.max(0, ...) ensures not < 0
            return Math.min(100, Math.max(0, score));
        }
        
        return null; // No number found in response
    }
    
    /**
     * Sleep utility for rate limiting
     * 
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Resolves after delay
     * 
     * USAGE: await this.sleep(1000) // Wait 1 second
     * WHY: Prevents rate limit errors from API providers
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================
//
// In run-daily-pipeline.js:
//   const scoring = new ScoringEngine(db, config);
//   const stats = await scoring.run('2025-10-11');
//
// With task-specific .env:
//   AI_PROVIDER_SCORING=groq  # Fast, cheap for scoring
//   AI_PROVIDER_ENRICHMENT=gemini  # High tokens for enrichment
//
// ============================================================================

module.exports = ScoringEngine;