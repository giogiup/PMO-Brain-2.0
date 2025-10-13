#!/usr/bin/env node

/**
 * SmartPMO.ai - Daily Insights JSON Generator
 * 
 * Pulls from: daily_insights + newsletter_content + article_keywords
 * Run: node generate-daily-cards.js
 * 
 * Requirements: npm install better-sqlite3
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Configuration
const DB_PATH = '../02-discovery-engine/pmo_insights.db';
const OUTPUT_PATH = '../website/api/daily-cards.json';
const TOP_N = 10;

// Helper: Parse TLDR into array of bullet points
function parseTLDR(tldrText) {
  if (!tldrText) return ['No summary available'];
  
  // Try to split by sentence-ending periods followed by space and capital letter
  // This matches the 4-sentence format you're using
  const sentences = tldrText
    .split(/\.\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 20)
    .map(s => s.endsWith('.') ? s : s + '.');
  
  // If we got 3-5 sentences, return them
  if (sentences.length >= 3 && sentences.length <= 5) {
    return sentences;
  }
  
  // Fallback: try splitting by common patterns
  const bullets = tldrText
    .split(/[\n\r]+/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 20);
  
  return bullets.length > 0 ? bullets : [tldrText];
}

// Helper: Get keywords for an article
function getKeywords(db, articleId, limit = 5) {
  const keywords = db.prepare(`
    SELECT keyword, keyword_category
    FROM article_keywords
    WHERE article_id = ?
    ORDER BY relevance_score DESC
    LIMIT ?
  `).all(articleId, limit);
  
  return keywords.map(k => k.keyword);
}

// Main function
async function generateDailyCards() {
  try {
    console.log('SmartPMO Daily Cards Generator');
    console.log('================================\n');

    // Open database
    const db = new Database(DB_PATH, { readonly: true });
    console.log('Database connected');

    // Get today's date or most recent date with newsletter content
    const latestDate = db.prepare(`
      SELECT MAX(nc.newsletter_date) as latest 
      FROM newsletter_content nc
      INNER JOIN daily_insights di ON nc.article_id = di.id
    `).get().latest;

    console.log(`Latest newsletter date: ${latestDate}`);

// Query top 10 articles with full enriched content (lines 69-90)
const articles = db.prepare(`
  SELECT 
    di.id,
    di.title,
    di.url,
    di.published_date,
    di.daily_rank,
    nc.tagline,
    nc.tldr,
    nc.read_time,
    nc.price_info,
    nc.pmo_area,
    nc.implementation_speed,
    nc.skill_level
  FROM daily_insights di
  INNER JOIN newsletter_content nc ON di.id = nc.article_id
  WHERE nc.newsletter_date = ?
  ORDER BY COALESCE(di.daily_rank, 999), di.id
  LIMIT ?
`).all(latestDate, TOP_N);

    console.log(`Found ${articles.length} articles\n`);

    if (articles.length === 0) {
      console.error('No articles found with newsletter content!');
      console.log('   Make sure newsletter_content table has data.');
      process.exit(1);
    }

    // Transform to card format
    const cards = articles.map((article, index) => {
      const keywords = getKeywords(db, article.id);
      
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Keywords: ${keywords.join(', ')}`);
      console.log(`     Read time: ${article.read_time || 'N/A'} min\n`);

      return {
        id: article.id,
        tagline: article.tagline || 'AI Strategy & Implementation',
        title: article.title,
        url: article.url,
        tldr: parseTLDR(article.tldr),
        tags: keywords.length > 0 ? keywords : ['AI', 'Technology'],
        badges: {
          pmoArea: article.pmo_area || 'Strategy',
          implementation: article.implementation_speed || 'Weeks to Deploy',
          skillLevel: article.skill_level || 'Intermediate',
          time: article.read_time || 3,
          price: article.price_info || 'Free'
        }
      };
    });

    // Ensure api directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }

    // Write JSON file
    const output = {
      generated_at: new Date().toISOString(),
      date: latestDate,
      count: cards.length,
      cards: cards
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
    
    console.log('================================');
    console.log(`Generated ${cards.length} cards`);
    console.log(`Output: ${OUTPUT_PATH}`);
    console.log(`Date: ${latestDate}`);
    console.log('================================\n');

    db.close();

  } catch (error) {
    console.error('Error generating cards:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
generateDailyCards();