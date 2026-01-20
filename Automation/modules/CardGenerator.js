// ============================================================================
// CARD GENERATOR - Pulls enriched content and generates daily-cards.json
// ============================================================================
// Note: Content enrichment (tagline, TLDR, badges, keywords) is done by
// ContentEnricher in Step 4. This module just formats and exports JSON.
// ============================================================================

const fs = require('fs');
const path = require('path');

class CardGenerator {
    constructor(db) {
        this.db = db;
        this.stats = {
            cardsGenerated: 0,
            premiumCount: 0
        };
    }
    
    async run(runDate) {
        console.log(`\n🎴 Generating rolling 20 cards (FIFO)...\n`);

        // Get articles marked for display (Latest Intelligence section)
        // ArticleDisplayManager sets is_displayed=1 with FIFO and deduplication
        const articles = await this.db.all(`
            SELECT
                di.id,
                di.title,
                di.url,
                di.published_date,
                di.pmo_score,
                di.pmo_relevance,
                di.pmo_category,
                nc.tldr,
                nc.pmo_area as pmo_focus,
                nc.value_type,
                nc.read_time,
                nc.implementation_speed,
                nc.price_info
            FROM daily_insights di
            INNER JOIN newsletter_content nc ON di.id = nc.article_id
            WHERE di.is_displayed = 1
            AND di.pmo_score >= 70
            ORDER BY di.published_date DESC, di.pmo_score DESC
            LIMIT 20
        `);
        
        if (articles.length === 0) {
            console.log('⚠️  No enriched articles found for card generation\n');
            return this.stats;
        }
        
        // Get keywords for each article
        const cards = [];
        
        for (const article of articles) {
            const keywords = await this.db.all(`
                SELECT keyword 
                FROM article_keywords 
                WHERE article_id = ?
                ORDER BY id
            `, [article.id]);
            
            const card = {
                id: article.id,
                title: article.title,
                url: article.url,
                date: article.published_date,
                score: Math.round(article.pmo_score),
                pmo_relevance: article.pmo_relevance,
                pmo_category: article.pmo_category || this.classifyPMOCategory(article),
                tldr: JSON.parse(article.tldr || '[]'),
                badges: {
                    read_time: article.read_time,
                    pmo_focus: article.pmo_focus,
                    value_type: article.value_type,
                    // Legacy for dynamic badge selection:
                    implementation: article.implementation_speed,
                    price: article.price_info
                },
                keywords: keywords.map(k => k.keyword)
            };
            
            cards.push(card);
            
            // Count premium articles (score >= 89)
            if (article.pmo_score >= 89) {
                this.stats.premiumCount++;
            }
        }
        
        // No filtering - use all 20 enriched articles (FIFO logic)
        this.stats.cardsGenerated = cards.length;

        // Save to JSON file
        await this.saveToFile(cards, runDate);
        
        console.log(`\n✅ Card generation complete:`);
        console.log(`   ${this.stats.cardsGenerated} cards generated`);
        if (this.stats.premiumCount > 0) {
            console.log(`   ${this.stats.premiumCount} premium articles (score >= 89)`);
        }
        console.log();
        
        return this.stats;
    }
    
    classifyPMOCategory(article) {
        const score = article.pmo_score;
        const title = article.title || '';
        const tldr = article.tldr || '';
        const text = (title + ' ' + tldr).toLowerCase();

        // PMO keywords for RELATED classification
        const pmoKeywords = /\b(pmo|project management|portfolio|resource allocation|stakeholder|risk management|deliverable|milestone|gantt|agile|scrum|waterfall|program management|project planning)\b/i;

        // AI keywords for GENERAL classification
        const aiKeywords = /\b(llm|gpt|claude|gemini|model release|new capability|ai tool|machine learning|neural network|training|inference|chatgpt|openai|anthropic)\b/i;

        // PMO_RELATED: score >= 70 + explicit PMO keywords
        if (score >= 70 && pmoKeywords.test(text)) {
            return 'PMO_RELATED';
        }

        // PMO_POTENTIAL: score 40-69 OR high score without explicit keywords
        if (score >= 40 && score < 70) {
            return 'PMO_POTENTIAL';
        }
        if (score >= 70) {
            // High score but no explicit PMO keywords
            return 'PMO_POTENTIAL';
        }

        // AI_GENERAL: Everything else
        return 'AI_GENERAL';
    }

    applySmartLogic(cards) {
        // Smart 10-20 logic based on quality distribution
        const premium = cards.filter(c => c.score >= 89);
        const excellent = cards.filter(c => c.score >= 80 && c.score < 89);
        const good = cards.filter(c => c.score >= 70 && c.score < 80);

        let finalCards = [];

        // Always include all premium
        finalCards = [...premium];

        // Fill to 10 minimum with excellent
        const needed = Math.max(10 - finalCards.length, 0);
        finalCards = [...finalCards, ...excellent.slice(0, needed)];

        // If still under 10, add good articles
        if (finalCards.length < 10) {
            const stillNeeded = 10 - finalCards.length;
            finalCards = [...finalCards, ...good.slice(0, stillNeeded)];
        }

        // Can go up to 20 if we have excellent articles
        if (finalCards.length < 20 && excellent.length > needed) {
            const extras = excellent.slice(needed, needed + (20 - finalCards.length));
            finalCards = [...finalCards, ...extras];
        }

        return finalCards;
    }
    
    async saveToFile(cards, runDate) {
        const output = {
            generated: new Date().toISOString(),
            date: runDate,
            count: cards.length,
            cards: cards
        };
        
        // Save to website/api/ folder
        // Path: modules/ -> Automation/ -> PMO-Brain-2.0-Modular/ -> website/
        const outputPath = path.join(__dirname, '../../website/api/daily-cards.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        
        console.log(`   💾 Saved to: ${outputPath}`);
    }
}

module.exports = CardGenerator;