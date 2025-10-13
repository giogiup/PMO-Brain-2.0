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
        console.log(`\n🎴 Generating smart cards for ${runDate}...\n`);
        
        // Get enriched articles with all metadata
        const articles = await this.db.all(`
            SELECT 
                di.id,
                di.title,
                di.url,
                di.published_date,
                di.pmo_score,
                nc.tagline,
                nc.tldr,
                nc.pmo_area,
                nc.implementation_speed,
                nc.skill_level,
                nc.read_time,
                nc.price_info
            FROM daily_insights di
            INNER JOIN newsletter_content nc ON di.id = nc.article_id
            WHERE di.published_date = ?
            AND di.newsletter_created = 1
            AND di.pmo_score >= 70
            ORDER BY di.pmo_score DESC
        `, [runDate]);
        
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
                tagline: article.tagline,
                tldr: JSON.parse(article.tldr || '[]'),
                badges: {
                    pmoArea: article.pmo_area,
                    implementation: article.implementation_speed,
                    skillLevel: article.skill_level,
                    readTime: article.read_time,
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
        
        // Apply smart logic: 10-20 cards based on quality
        const finalCards = this.applySmartLogic(cards);
        this.stats.cardsGenerated = finalCards.length;
        
        // Save to JSON file
        await this.saveToFile(finalCards, runDate);
        
        console.log(`\n✅ Card generation complete:`);
        console.log(`   ${this.stats.cardsGenerated} cards generated`);
        if (this.stats.premiumCount > 0) {
            console.log(`   ${this.stats.premiumCount} premium articles (score >= 89)`);
        }
        console.log();
        
        return this.stats;
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
        const outputPath = path.join(__dirname, '../website/api/daily-cards.json');
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
        
        console.log(`   💾 Saved to: ${outputPath}`);
    }
}

module.exports = CardGenerator;