const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, '../02-discovery-engine/pmo_insights.db');
const db = new sqlite3.Database(dbPath);

// Create table if it doesn't exist
db.run(`CREATE TABLE IF NOT EXISTS insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    summary TEXT,
    author TEXT,
    source_name TEXT,
    source_tier TEXT,
    published_date TEXT,
    discovered_at TEXT,
    pmo_score REAL,
    pmo_relevant BOOLEAN,
    analysis_reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

app.post('/analyze', async (req, res) => {
    try {
        const { articles } = req.body;
        console.log(`Received ${articles.length} articles for analysis`);
        
        const results = [];
        
        for (let article of articles) {
            console.log(`Analyzing: ${article.title}`);
            
            // Simple analysis scoring
            const score = calculateScore(article);
            const relevant = score > 15;
            
            const analysisResult = {
                title: article.title,
                url: article.url,
                score: score,
                pmoRelevant: relevant,
                summary: article.summary,
                reasoning: generateReasoning(article, score)
            };
            
            // Save to database
            await saveToDatabase(article, analysisResult);
            results.push(analysisResult);
        }
        
        console.log(`Analysis complete: ${results.length} articles processed and saved`);
        res.json({ success: true, results: results });
        
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

function calculateScore(article) {
    const text = (article.title + ' ' + (article.summary || '')).toLowerCase();
    let score = 10;
    
    if (text.includes('pmo') || text.includes('project management')) score += 8;
    if (text.includes('project')) score += 4;
    if (text.includes('ai') || text.includes('artificial intelligence')) score += 5;
    if (text.includes('automation')) score += 4;
    if (text.includes('management')) score += 3;
    
    return Math.min(30, Math.max(5, score));
}

function generateReasoning(article, score) {
    return `PMO relevance score: ${score}/30. Based on content analysis of title and summary.`;
}

function saveToDatabase(article, analysis) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`INSERT OR REPLACE INTO insights 
            (title, url, summary, author, source_name, source_tier, published_date, 
             discovered_at, pmo_score, pmo_relevant, analysis_reasoning) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        
        stmt.run([
            article.title,
            article.url,
            article.summary,
            article.author,
            article.source?.name,
            article.source?.tier,
            article.publishedDate,
            article.discoveredAt,
            analysis.score,
            analysis.pmoRelevant,
            analysis.reasoning
        ], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
}

app.listen(3003, () => {
    console.log('Analysis Engine with Database Storage running on port 3003');
});