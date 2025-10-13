// ============================================================================
// CONTENT ENRICHER - Generates all card metadata in ONE AI call
// ============================================================================
// PURPOSE: Generate newsletter card metadata (tagline, TLDR, badges, keywords)
//
// TASK CHARACTERISTICS:
//   - HIGH token usage: ~45,000 tokens per article
//     * Input: 4000 chars of full article content + prompt
//     * Output: Structured JSON with all metadata
//   - Lower volume: Only 10-20 articles/day (top scored only)
//   - Quality over speed: Rich analysis needed
//
// OPTIMAL PROVIDER: Gemini (high token capacity, free tier)
//   - Higher token limits than Groq free tier
//   - 15 requests/min = 900/hour (plenty for 20 articles)
//   - Free tier suitable for this workload
//
// WHY NOT GROQ:
//   - Groq free: 100K tokens/day
//   - This task: 45K tokens/article
//   - Math: 100K / 45K = only 2 articles/day possible
//   - Conclusion: Groq hits limit immediately
//
// CONFIGURATION:
//   Set in .env: AI_PROVIDER_ENRICHMENT=gemini
//   Falls back to AI_PROVIDER if not set
//
// OUTPUT STRUCTURE (JSON):
//   {
//     "tagline": "One-line hook for the card",
//     "tldr": ["Bullet 1", "Bullet 2", "Bullet 3"],
//     "badges": {
//       "pmo_area": "Resource Management",
//       "implementation": "Quick Win",
//       "skill_level": "Beginner",
//       "price": "Free"
//     },
//     "keywords": ["AI", "automation", "workflow"]
//   }
//
// DEPENDENCIES:
//   - AIProvider: Handles multi-provider abstraction  
//   - DatabaseManager: Loads prompts, saves enrichment
//   - ContentFetcher: Must run first to get full_content
//   - newsletter_content table: Must have UNIQUE constraint on article_id
//
// DATA FLOW:
//   1. Load active enrichment prompt from database
//   2. Get top-scored articles with fetched content
//   3. For each: Send content to AI, get structured JSON
//   4. Parse JSON response and validate structure
//   5. Save to newsletter_content + article_keywords tables
//   6. Mark article as enriched (keywords_extracted=1)
//
// MODIFICATIONS CHECKLIST:
//   When changing this file, verify:
//   □ AIProvider task parameter is 'ENRICHMENT' (uppercase)
//   □ JSON parsing handles markdown code blocks from AI
//   □ Validation checks all required fields exist
//   □ Database ON CONFLICT works (requires UNIQUE constraint)
//   □ Rate limiting respects provider delays (4s for Gemini)
//   □ Token usage fits within provider limits
// ============================================================================

const AIRouter = require('./AIRouter');
const path = require('path');

class ContentEnricher {
    constructor(db) {
        this.db = db;
        
        // CRITICAL: Use AIRouter for waterfall failover across multiple providers
        // WHY: Enrichment has different requirements than scoring
        //      - HIGH token usage (full article content, not just title)
        //      - Lower volume (10-20 articles vs 100-200 for scoring)
        //      - Quality matters more than speed
        // PROVIDER WATERFALL: Gemini (primary) → GPT-4o-mini (paid backup)
        // TOKEN MATH:
        //   - Gemini free: High limits = 20+ articles/day
        //   - GPT-4o-mini: $0.15/1M input, $0.60/1M output (emergency only)
        this.aiRouter = new AIRouter(this.db, 'enrichment');
        
        this.prompt = null; // Loaded from database at runtime
        
        this.stats = {
            attempted: 0,
            succeeded: 0,
            failed: 0,
            totalKeywords: 0
        };
    }
    
    /**
     * Main execution method - enriches top-scored articles with metadata
     * 
     * @param {string} runDate - Date to process (YYYY-MM-DD format)
     * @param {number} limit - Max articles to enrich (default 20)
     * @returns {object} Statistics about enrichment run
     * 
     * PROCESS FLOW:
     *   1. Load active enrichment prompt from database
     *   2. Query top-scored articles with fetched content
     *   3. For each: Generate all metadata in one AI call
     *   4. Save to newsletter_content + article_keywords tables
     *   5. Log prompt performance
     * 
     * WHY LIMIT TO 20:
     *   - Only top-scored articles go to newsletter
     *   - Saves API tokens (don't enrich low-quality articles)
     *   - Each enrichment = 45K tokens, expensive
     * 
     * ORDERING LOGIC:
     *   ORDER BY pmo_score DESC = highest scores first
     *   This ensures best articles get enriched even if we hit limits
     * 
     * ERROR HANDLING:
     *   - If prompt loading fails: throw (can't proceed)
     *   - If individual article fails: log, continue (don't break pipeline)
     *   - If all fail: return stats showing 0 enriched (pipeline handles)
     */
    async run(runDate, limit = 20) {
        console.log(`\n🎨 Enriching content for top ${limit} articles...\n`);
        
        // STEP 1: Load enrichment prompt from database
        // WHY DATABASE: Prompts are version-controlled, can A/B test
        // CRITICAL: Must have is_active=1 prompt in prompt_templates table
        try {
            this.prompt = await this.db.getActivePrompt('enrichment');
            console.log(`📋 Using enrichment prompt: ${this.prompt.version}\n`);
        } catch (error) {
            console.error('❌ Failed to load enrichment prompt:', error.message);
            throw error; // Can't enrich without prompt
        }
        
        // STEP 2: Get articles to enrich
        // QUERY LOGIC:
        //   - published_date = runDate (only today)
        //   - content_fetched = 1 (must have full content)
        //   - full_content IS NOT NULL (validate content exists)
        //   - keywords_extracted = 0 (not enriched yet)
        //   - ORDER BY pmo_score DESC (best articles first)
        //   - LIMIT (only top N articles)
        // WHY: Can only enrich if we have full article content
        const articles = await this.db.all(`
            SELECT id, title, url, full_content, pmo_score
            FROM daily_insights
            WHERE published_date = ?
            AND content_fetched = 1
            AND full_content IS NOT NULL
            AND keywords_extracted = 0
            ORDER BY pmo_score DESC
            LIMIT ?
        `, [runDate, limit]);
        
        if (articles.length === 0) {
            console.log('⚠️  No articles need enrichment\n');
            return this.stats;
        }
        
        console.log(`📊 Found ${articles.length} articles to enrich\n`);
        
        // STEP 3: Enrich each article
        for (const article of articles) {
            this.stats.attempted++;
            
            try {
                console.log(`  Processing: ${article.title.substring(0, 60)}...`);
                
                const enrichment = await this.enrichArticle(article);
                
                if (enrichment) {
                    await this.saveEnrichment(article.id, enrichment);
                    
                    this.stats.succeeded++;
                    this.stats.totalKeywords += enrichment.keywords.length;
                    
                    console.log(`  ✅ Enriched with ${enrichment.keywords.length} keywords\n`);
                } else {
                    this.stats.failed++;
                    console.log(`  ❌ Failed to enrich\n`);
                }
                
                // RATE LIMITING: 4 seconds between enrichment calls
                // WHY: Enrichment uses 45K tokens/article (high token usage)
                // GEMINI: 15 req/min = must wait 4 seconds
                // GPT-4o-mini: Higher limits, but 4s is safe for both
                await this.sleep(4000);
                
            } catch (error) {
                this.stats.failed++;
                console.log(`  ❌ Error: ${error.message}\n`);
                
                // Log error to database for debugging
                await this.db.run(`
                    UPDATE daily_insights 
                    SET fetch_error = ?
                    WHERE id = ?
                `, [error.message, article.id]);
            }
        }
        
        console.log(`\n✅ Content enrichment complete:`);
        console.log(`   ${this.stats.succeeded}/${this.stats.attempted} articles enriched`);
        console.log(`   ${this.stats.totalKeywords} total keywords extracted\n`);
        
        // STEP 4: Log prompt performance
        // WHY: Track which enrichment prompts produce best results
        //      No avg_score for enrichment (different metric than scoring)
        if (this.stats.succeeded > 0) {
            await this.db.logPromptPerformance(
                this.prompt.id,
                null, // No avg_score for enrichment
                this.stats.succeeded
            );
        }
        
        return this.stats;
    }
    
    /**
     * Enrich a single article with all metadata
     * 
     * @param {object} article - Article with title, url, full_content
     * @returns {object|null} Enrichment data, or null if failed
     * 
     * PROCESS:
     *   1. Replace placeholders in prompt template
     *   2. Truncate content to 4000 chars (token limit consideration)
     *   3. Send to AI provider for structured JSON response
     *   4. Extract and parse JSON (handle markdown wrappers)
     *   5. Validate structure
     *   6. Calculate read time from word count
     * 
     * CONTENT TRUNCATION:
     *   Why 4000 chars: Balance between context and token usage
     *   - Too short: Miss important details
     *   - Too long: Waste tokens, hit limits
     *   - 4000 chars ≈ 1000 tokens input
     *   - With prompt + response: ~1500 tokens total per article
     * 
     * JSON EXTRACTION:
     *   AI may wrap JSON in markdown: ```json {...} ```
     *   Regex extracts {...} pattern regardless of wrapper
     *   Handles both clean JSON and markdown-wrapped
     * 
     * VALIDATION:
     *   Must have: tagline, tldr, badges, keywords
     *   Missing any = invalid, return null
     *   Prevents partial enrichment from breaking cards
     * 
     * ERROR HANDLING:
     *   - If AI call fails: return null
     *   - If JSON parse fails: return null
     *   - If validation fails: return null
     *   All logged by caller, pipeline continues
     */
    async enrichArticle(article) {
        // Replace placeholders in prompt template
        // PLACEHOLDERS: {title}, {url}, {content}
        // WHY: Prompt template is reusable across all articles
        let prompt = this.prompt.prompt_text
            .replace('{title}', article.title)
            .replace('{url}', article.url)
            .replace('{content}', article.full_content.substring(0, 4000));
        
        // Call AI router with waterfall failover
        // Format prompt as OpenAI-style messages array
        const messages = [
            { role: 'user', content: prompt }
        ];
        
        const result = await this.aiRouter.complete(messages, { temperature: 0.3, max_tokens: 2000 }, article.id);
        const text = result?.content;
        
        if (!text) {
            return null; // AI call failed
        }
        
        try {
            // Extract JSON from response
            // PATTERN: Matches {...} including nested objects/arrays
            // HANDLES: Both clean JSON and markdown-wrapped (```json...```)
            // WHY REGEX: AI responses inconsistent (sometimes wrapped)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const enrichment = JSON.parse(jsonMatch[0]);
            
            // Validate structure
            // REQUIRED FIELDS: All must exist for card generation to work
            // WHY: Partial data causes card render errors
            if (!enrichment.tagline || !enrichment.tldr || !enrichment.badges || !enrichment.keywords) {
                throw new Error('Invalid enrichment structure - missing required fields');
            }
            
            // Calculate read time from word count
            // FORMULA: words / 200 = minutes (average reading speed)
            // ROUND UP: ceil ensures non-zero for short articles
            // USAGE: Displayed on cards ("3 min read")
            const wordCount = article.full_content.split(/\s+/).length;
            enrichment.read_time = Math.ceil(wordCount / 200);
            
            return enrichment;
            
        } catch (error) {
            console.error(`    Parsing error: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Save enrichment data to database
     * 
     * @param {number} articleId - Article ID to update
     * @param {object} enrichment - Enrichment data from AI
     * 
     * DATABASE OPERATIONS:
     *   1. Upsert to newsletter_content (main metadata)
     *   2. Delete + insert to article_keywords (many-to-many)
     *   3. Mark article as enriched (keywords_extracted=1)
     * 
     * ON CONFLICT STRATEGY:
     *   Uses ON CONFLICT(article_id) DO UPDATE
     *   WHY: If re-running enrichment, update existing record
     *   REQUIRES: article_id UNIQUE constraint (added in DB migration)
     * 
     * KEYWORDS HANDLING:
     *   Delete old keywords first, then insert new ones
     *   WHY: Simpler than trying to diff and update
     *   SAFE: Foreign key ensures no orphaned keywords
     * 
     * TLDR FORMAT:
     *   Stored as JSON string: JSON.stringify(["item1", "item2", "item3"])
     *   WHY: SQLite doesn't have array type
     *   PARSED: When generating cards, JSON.parse() to get array
     * 
     * ERROR HANDLING:
     *   If any query fails, entire transaction should fail
     *   Database errors logged and thrown to caller
     */
    async saveEnrichment(articleId, enrichment) {
        // STEP 1: Save main metadata to newsletter_content table
        // ON CONFLICT: If article already enriched, update with new data
        // CRITICAL: Requires article_id UNIQUE constraint in schema
        await this.db.run(`
            INSERT INTO newsletter_content (
                article_id,
                newsletter_date,
                tagline,
                tldr,
                pmo_area,
                implementation_speed,
                skill_level,
                read_time,
                price_info,
                created_at,
                updated_at
            ) VALUES (?, DATE('now'), ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(article_id) DO UPDATE SET
                tagline = excluded.tagline,
                tldr = excluded.tldr,
                pmo_area = excluded.pmo_area,
                implementation_speed = excluded.implementation_speed,
                skill_level = excluded.skill_level,
                read_time = excluded.read_time,
                price_info = excluded.price_info,
                updated_at = CURRENT_TIMESTAMP
        `, [
            articleId,
            enrichment.tagline,
            JSON.stringify(enrichment.tldr), // Array → JSON string
            enrichment.badges.pmo_area,
            enrichment.badges.implementation,
            enrichment.badges.skill_level,
            enrichment.read_time,
            enrichment.badges.price
        ]);
        
        // STEP 2: Delete old keywords (if re-enriching)
        // WHY: Simpler than diff/update, and keywords may change
        await this.db.run(`DELETE FROM article_keywords WHERE article_id = ?`, [articleId]);
        
        // STEP 3: Insert new keywords
        // MANY-TO-MANY: One article can have multiple keywords
        // LOOP: Insert each keyword individually (no batch insert in SQLite)
        for (const keyword of enrichment.keywords) {
            await this.db.run(`
                INSERT INTO article_keywords (article_id, keyword)
                VALUES (?, ?)
            `, [articleId, keyword.trim()]);
        }
        
        // STEP 4: Mark article as enriched
        // FLAGS:
        //   - keywords_extracted = 1 (won't process again)
        //   - keyword_count = N (for queries/reporting)
        //   - newsletter_created = 1 (ready for card generation)
        await this.db.run(`
            UPDATE daily_insights 
            SET keywords_extracted = 1,
                keyword_count = ?,
                newsletter_created = 1
            WHERE id = ?
        `, [enrichment.keywords.length, articleId]);
    }
    
    /**
     * Sleep utility for rate limiting
     * 
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise} Resolves after delay
     * 
     * USAGE: await this.sleep(4000) // Wait 4 seconds (Gemini)
     * WHY CRITICAL FOR ENRICHMENT:
     *   - Each call uses 45K tokens (100x more than scoring)
     *   - Gemini free: 15 req/min = must wait 4 seconds
     *   - Too fast = rate limit error, pipeline fails
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
//   const enricher = new ContentEnricher(db);
//   const stats = await enricher.run('2025-10-11', 20);
//
// With task-specific .env:
//   AI_PROVIDER_SCORING=groq       # Fast, low-token scoring
//   AI_PROVIDER_ENRICHMENT=gemini  # High-token enrichment
//
// Token usage per article:
//   Scoring: ~500 tokens (title + URL)
//   Enrichment: ~45,000 tokens (full content + metadata)
//
// Why this matters:
//   Groq free: 100K/day = 200 scored articles OR 2 enriched articles
//   Solution: Use Groq for scoring, Gemini for enrichment
//
// ============================================================================

module.exports = ContentEnricher;