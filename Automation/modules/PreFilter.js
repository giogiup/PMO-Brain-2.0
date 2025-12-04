// ============================================================================
// PRE-FILTER V3 - Hybrid Semantic + Keyword Scoring
// ============================================================================
// Purpose: Reduce 800+ discovered articles to ~100 most promising candidates
// Method: Semantic similarity (embeddings) OR keyword matching
// Output: Top N articles marked as prefilter_passed=1 for Gemini scoring
// ============================================================================

const SemanticPrefilter = require('./SemanticPrefilter');

class PreFilter {
    constructor(db) {
        this.db = db;
        this.config = {};
        this.semanticPrefilter = new SemanticPrefilter();
        this.keywords = {
            ai_core: [],
            ai_tools: [],
            pmo_core: [],
            pmo_inference: [],
            excludes: []
        };
        this.bonusSources = [];
        this.bonusCompanies = [];
        
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            avgScore: 0,
            topScore: 0
        };
    }
    
    async run(runDate) {
        console.log(`\n🔍 Pre-filtering articles for ${runDate}...\n`);
        
        // Step 1: Load configuration
        await this.loadConfig();
        await this.semanticPrefilter.initialize();
        
        // Check if pre-filter is enabled
        if (this.config.enable_prefilter === 'false') {
            console.log('⚠️  Pre-filter is disabled in configuration\n');
            return { ...this.stats, enabled: false };
        }
        
        // Step 2: Load keywords and bonus lists
        await this.loadKeywords();
        await this.loadBonuses();
        
        const useSemanticMode = this.config.use_semantic_prefilter === 'true' && this.semanticPrefilter.enabled;
        
        console.log(`📊 Loaded configuration:`);
        console.log(`   Mode: ${useSemanticMode ? 'SEMANTIC' : 'KEYWORD'}`);
        console.log(`   Pass threshold: ${this.config.pass_threshold} points`);
        console.log(`   Max articles to pass: ${this.config.max_articles_to_pass}`);
        if (!useSemanticMode) {
            console.log(`   Keywords: ${this.keywords.ai_core.length} AI-core, ${this.keywords.ai_tools.length} AI-tools, ${this.keywords.pmo_core.length} PMO-core, ${this.keywords.pmo_inference.length} PMO-inference`);
            console.log(`   Excludes: ${this.keywords.excludes.length} soft excludes`);
        }
        console.log();
        
        // Step 3: Get all unscored articles discovered today
        // NOTE: We filter by discovered_at, NOT published_date
        // published_date is for discovery logic only - prefilter evaluates ALL discoveries
        // CRITICAL FIX: Limit to 500 articles per run to prevent timeout/hanging
        const articles = await this.db.all(`
    SELECT id, title, url
    FROM daily_insights
    WHERE DATE(discovered_at) = ?
    AND pmo_score IS NULL
    AND prefilter_passed = 0
    ORDER BY id
    LIMIT 500
`, [runDate]);
        
        if (articles.length === 0) {
            console.log('⚠️  No articles to filter\n');
            return this.stats;
        }
        
        this.stats.total = articles.length;
        console.log(`🔍 Processing ${articles.length} articles...\n`);
        
        // Step 4: Score all articles
        let scoredArticles = [];
        let semanticFailed = false;

        if (useSemanticMode) {
            // SEMANTIC MODE (with fallback to keyword mode on timeout/error)
            console.log('   Using semantic similarity scoring...\n');
            const articlesToScore = articles.map(a => ({
                title: a.title,
                url: a.url,
                id: a.id
            }));

            try {
                const semanticScored = await this.semanticPrefilter.scoreArticles(articlesToScore);
                const semanticStats = this.semanticPrefilter.getStats(semanticScored);

                console.log(`   Semantic stats: ${semanticStats.passRate} pass rate, avg score: ${semanticStats.avgScore}`);
                console.log(`   Tiers: ${JSON.stringify(semanticStats.tiers)}\n`);

                // Merge semantic scores with article data
                const scoreMap = new Map(semanticScored.map(s => [s.url, s]));

                for (const article of articles) {
                    const scores = scoreMap.get(article.url);
                    if (scores) {
                        const normalizedScore = Math.round(scores.total_score * 100); // 0-1 -> 0-100
                        const passed = this.semanticPrefilter.shouldPass(scores);

                        scoredArticles.push({
                            ...article,
                            score: normalizedScore,
                            category: 'SEMANTIC',
                            matches: [`TIER:${scores.quality_tier}`, `AI:${scores.sim_ai}`, `ENT:${scores.sim_enterprise}`, `PMO:${scores.sim_pmo}`],
                            passed,
                            reason: `Semantic: ${scores.quality_tier} (score: ${scores.total_score})`,
                            semantic_scores: scores
                        });

                        // Log with semantic data
                        await this.logSemanticDecision(article.id, runDate, normalizedScore, passed, scores);
                    } else {
                        scoredArticles.push({
                            ...article,
                            score: 0,
                            category: 'ERROR',
                            matches: [],
                            passed: false,
                            reason: 'Semantic scoring failed'
                        });
                    }
                }
            } catch (error) {
                // GRACEFUL FALLBACK: If semantic mode fails, fall back to keyword mode
                console.warn(`\n⚠️  Semantic prefilter failed: ${error.message}`);
                console.warn('   Falling back to keyword mode...\n');
                semanticFailed = true;
            }
        }

        if (!useSemanticMode || semanticFailed) {
            // KEYWORD MODE
            console.log('   Using keyword matching scoring...\n');
            scoredArticles = []; // Reset if falling back from semantic failure

            let processed = 0;
            for (const article of articles) {
                const scoreData = await this.scoreArticle(article);
                scoredArticles.push({ ...article, ...scoreData });

                // Log decision
                await this.logDecision(article.id, runDate, scoreData);

                // Progress logging every 100 articles
                processed++;
                if (processed % 100 === 0) {
                    console.log(`   Progress: ${processed}/${articles.length} articles scored`);
                }
            }
        }
        
        // Step 5: Filter by threshold
        const passThreshold = parseInt(this.config.pass_threshold);
        const passedArticles = scoredArticles.filter(a => a.score >= passThreshold);
        
        // Step 6: Sort by score and take top N
        const maxArticles = parseInt(this.config.max_articles_to_pass);
        const sortedPassed = passedArticles.sort((a, b) => b.score - a.score);
        const finalPassed = sortedPassed.slice(0, Math.min(maxArticles, sortedPassed.length));
        
        // Step 7: Mark selected articles in database
        for (const article of finalPassed) {
            await this.db.run(`
                UPDATE daily_insights
                SET prefilter_passed = 1,
                    prefilter_score = ?
                WHERE id = ?
            `, [article.score, article.id]);
        }
        
        // Calculate stats
        this.stats.passed = finalPassed.length;
        this.stats.failed = this.stats.total - this.stats.passed;
        this.stats.avgScore = Math.round(
            scoredArticles.reduce((sum, a) => sum + a.score, 0) / scoredArticles.length
        );
        this.stats.topScore = sortedPassed.length > 0 ? sortedPassed[0].score : 0;
        
        // Summary output
        console.log(`\n✅ Pre-filter complete:`);
        console.log(`   ${this.stats.passed}/${this.stats.total} articles passed`);
        console.log(`   Average score: ${this.stats.avgScore}`);
        console.log(`   Top score: ${this.stats.topScore}`);
        console.log(`   Pass rate: ${Math.round(this.stats.passed / this.stats.total * 100)}%\n`);
        
        if (this.stats.passed > 0) {
            console.log(`   Top 5 articles:`);
            finalPassed.slice(0, 5).forEach((a, i) => {
                console.log(`   ${i + 1}. [${a.score}] ${a.title.substring(0, 60)}...`);
            });
            console.log();
        }
        
        return this.stats;
    }
    
    async scoreArticle(article) {
        // Prepare search text (title + URL, lowercase)
        const searchText = `${article.title} ${article.url}`.toLowerCase();
        
        // Count keyword matches by category
        const ai_core_matches = this.countMatches(searchText, this.keywords.ai_core);
        const ai_tool_matches = this.countMatches(searchText, this.keywords.ai_tools);
        const pmo_core_matches = this.countMatches(searchText, this.keywords.pmo_core);
        const pmo_inference_matches = this.countMatches(searchText, this.keywords.pmo_inference);
        const exclude_matches = this.countMatches(searchText, this.keywords.excludes);
        
        // Determine content type
        const has_ai = (ai_core_matches > 0 || ai_tool_matches > 0);
        const has_pmo_core = (pmo_core_matches > 0);
        const has_pmo_inference = (pmo_inference_matches > 0);
        
        let score = 0;
        let cap = 100;
        let category = '';
        let matches = [];
        
        // SCORING ALGORITHM - Multiplicative & Contextual
        if (has_ai && has_pmo_core) {
            // GOLD: AI + explicit PMO = 80-100
            const base = 80;
            const multiplier = 1.0 + (Math.min(ai_core_matches, 5) * 0.02) + (Math.min(pmo_core_matches, 5) * 0.03);
            const bonus = (ai_core_matches * 2) + (ai_tool_matches * 1) + (pmo_core_matches * 3);
            score = Math.round((base * multiplier) + bonus);
            cap = 100;
            category = 'AI+PMO_CORE';
            matches.push(`AI_CORE:${ai_core_matches}`, `AI_TOOLS:${ai_tool_matches}`, `PMO_CORE:${pmo_core_matches}`);
            
        } else if (has_ai && has_pmo_inference) {
            // GOOD: AI + PMO inference = 70-90
            const base = 70;
            const bonus = (ai_core_matches * 3) + (ai_tool_matches * 2) + (pmo_inference_matches * 2);
            score = base + bonus;
            cap = 90;
            category = 'AI+PMO_INFERENCE';
            matches.push(`AI_CORE:${ai_core_matches}`, `AI_TOOLS:${ai_tool_matches}`, `PMO_INF:${pmo_inference_matches}`);
            
        } else if (has_ai) {
            // PASS: AI only = 50-75
            const base = 50;
            const bonus = (ai_core_matches * 3) + (ai_tool_matches * 2);
            score = base + bonus;
            cap = 75;
            category = 'AI_ONLY';
            matches.push(`AI_CORE:${ai_core_matches}`, `AI_TOOLS:${ai_tool_matches}`);
            
        } else if (has_pmo_core || has_pmo_inference) {
            // FAIL: PMO only, no AI = <50
            const base = 30;
            const bonus = (pmo_core_matches * 2) + (pmo_inference_matches * 1);
            score = base + bonus;
            cap = 45;
            category = 'PMO_ONLY';
            matches.push(`PMO_CORE:${pmo_core_matches}`, `PMO_INF:${pmo_inference_matches}`);
            
        } else {
            // FAIL: Neither = <50
            score = 10;
            cap = 10;
            category = 'NONE';
        }
        
        // Apply bonuses
        if (this.config.enable_source_bonus === 'true') {
            const sourceBonus = this.checkSourceBonus(article.url);
            if (sourceBonus > 0) {
                score += sourceBonus;
                matches.push(`SOURCE_BONUS:+${sourceBonus}`);
            }
        }
        
        if (this.config.enable_company_bonus === 'true') {
            const companyBonus = this.checkCompanyBonus(searchText);
            if (companyBonus > 0) {
                score += companyBonus;
                matches.push(`COMPANY_BONUS:+${companyBonus}`);
            }
        }
        
        // Cap score
        score = Math.min(score, cap);
        
        // Apply soft exclude penalty
        if (exclude_matches > 0) {
            score = Math.round(score * 0.7); // 30% penalty
            matches.push(`EXCLUDES:${exclude_matches} (-30%)`);
        }
        
        // Determine pass/fail
        const passed = score >= parseInt(this.config.pass_threshold);
        
        // Build reason
        const reason = `[${category}] Score: ${score} | ${matches.join(', ')} | ${passed ? 'PASS' : 'FAIL'}`;
        
        return {
            score,
            category,
            matches,
            passed,
            reason
        };
    }
    
    countMatches(text, keywordList) {
        let count = 0;
        for (const keywordObj of keywordList) {
            if (this.matchKeyword(text, keywordObj)) {
                count++;
            }
        }
        return count;
    }
    
    matchKeyword(text, keywordObj) {
        const keyword = keywordObj.keyword.toLowerCase();
        
        if (keywordObj.case_sensitive) {
            return text.includes(keywordObj.keyword);
        } else {
            return text.includes(keyword);
        }
    }
    
    checkSourceBonus(url) {
        for (const source of this.bonusSources) {
            const pattern = new RegExp(source.source_pattern, 'i');
            if (pattern.test(url)) {
                return source.bonus_points;
            }
        }
        return 0;
    }
    
    checkCompanyBonus(text) {
        for (const company of this.bonusCompanies) {
            const pattern = new RegExp(company.company_pattern, 'i');
            if (pattern.test(text)) {
                return company.bonus_points;
            }
        }
        return 0;
    }
    
    async logDecision(articleId, runDate, scoreData) {
        await this.db.run(`
            INSERT INTO prefilter_log (
                article_id,
                run_date,
                passed,
                score,
                include_matches,
                exclude_matches,
                match_count,
                decision_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            articleId,
            runDate,
            scoreData.passed ? 1 : 0,
            scoreData.score,
            JSON.stringify(scoreData.matches),
            JSON.stringify([]),
            scoreData.matches.length,
            scoreData.reason
        ]);
    }
    
    async logSemanticDecision(articleId, runDate, score, passed, semanticScores) {
        await this.db.run(`
            INSERT INTO prefilter_log (
                article_id,
                run_date,
                passed,
                score,
                sim_ai,
                sim_enterprise,
                sim_pmo,
                bm25_score,
                total_score,
                keyword_density,
                quality_tier,
                decision_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            articleId,
            runDate,
            passed ? 1 : 0,
            score,
            semanticScores.sim_ai,
            semanticScores.sim_enterprise,
            semanticScores.sim_pmo,
            semanticScores.bm25_score,
            semanticScores.total_score,
            semanticScores.keyword_density,
            semanticScores.quality_tier,
            `Semantic: ${semanticScores.quality_tier} (${semanticScores.total_score})`
        ]);
    }
    
    async loadConfig() {
        const rows = await this.db.all(`SELECT config_key, config_value FROM prefilter_config`);
        
        for (const row of rows) {
            this.config[row.config_key] = row.config_value;
        }
    }
    
    async loadKeywords() {
        const rows = await this.db.all(`
            SELECT keyword, keyword_type, category, case_sensitive
            FROM prefilter_keywords
            WHERE enabled = 1
        `);
        
        for (const row of rows) {
            if (row.keyword_type === 'include') {
                // Map to new categories
                if (row.category === 'ai-core') {
                    this.keywords.ai_core.push(row);
                } else if (row.category === 'ai-tools') {
                    this.keywords.ai_tools.push(row);
                } else if (row.category === 'pmo-core') {
                    this.keywords.pmo_core.push(row);
                } else if (row.category === 'pmo-inference') {
                    this.keywords.pmo_inference.push(row);
                }
            } else if (row.keyword_type === 'exclude') {
                this.keywords.excludes.push(row);
            }
        }
    }
    
    async loadBonuses() {
        this.bonusSources = await this.db.all(`
            SELECT source_name, source_pattern, bonus_points
            FROM prefilter_bonus_sources
            WHERE enabled = 1
        `);
        
        this.bonusCompanies = await this.db.all(`
            SELECT company_name, company_pattern, bonus_points
            FROM prefilter_bonus_companies
            WHERE enabled = 1
        `);
    }
}

module.exports = PreFilter;