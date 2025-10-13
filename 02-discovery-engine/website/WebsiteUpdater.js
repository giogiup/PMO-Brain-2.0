// website/WebsiteUpdater.js
// Updates smartPMO.ai website with daily database content

const DatabaseManager = require('../database/DatabaseManager');
const fs = require('fs').promises;
const path = require('path');

class WebsiteUpdater {
   constructor(websitePath = '../../website') {
        this.websitePath = websitePath;
        this.database = new DatabaseManager();
        this.isDatabaseReady = false;
    }

    async initialize() {
        try {
            console.log('🌐 Initializing Website Updater...');
            await this.database.initialize();
            this.isDatabaseReady = true;
            console.log('✅ Website Updater ready');
        } catch (error) {
            console.error('❌ Website Updater initialization failed:', error);
            throw error;
        }
    }

    /**
     * Update website with daily insights
     */
    async updateDailyContent() {
        try {
            console.log('📝 Updating website with daily insights...');

            // Get rolling 50 articles for website
            const rollingArticles = await this.database.getRollingInsights(5, 50);
            
            // Get today's highlight for featured section
            const dailyHighlight = await this.database.getDailyHighlight();

            if (rollingArticles.length === 0) {
                console.log('⚠️ No articles found in database');
                return false;
            }

            // Create articles data file for website
            const articlesData = {
                lastUpdated: new Date().toISOString(),
                totalArticles: rollingArticles.length,
                dailyHighlight: dailyHighlight ? this.formatArticleForWeb(dailyHighlight) : null,
                articles: rollingArticles.map(article => this.formatArticleForWeb(article))
            };

            // Save articles data as JSON file
            await this.saveArticlesData(articlesData);

            // Update the preview section in index.html
            await this.updatePreviewSection(articlesData);

            console.log(`✅ Website updated with ${rollingArticles.length} articles`);
            return true;

        } catch (error) {
            console.error('❌ Website update failed:', error);
            return false;
        }
    }

    /**
     * Format database article for web display
     */
    formatArticleForWeb(article) {
        return {
            id: article.id,
            title: article.title,
            url: article.url,
            summary: article.content_summary || 'Analysis available',
            score: article.pmo_score || 0,
            scoreLevel: this.getScoreLevel(article.pmo_score),
            aiTechnology: article.ai_technology || 'General AI',
            pmobokArea: article.pmbok_area || 'Integration Management',
            pmoApplication: article.pmo_application || 'General enhancement',
            source: article.source || 'Unknown',
            publishedDate: article.created_at,
            featured: article.featured_status === 1
        };
    }

    /**
     * Get score level description
     */
    getScoreLevel(score) {
        if (score >= 8) return 'High Score: Direct PMO';
        if (score >= 6) return 'Medium Score: Inferred PMO';
        if (score >= 4) return 'Low Score: General Business';
        return 'Minimal Score: Tangential';
    }

    /**
     * Save articles data to website directory
     */
    async saveArticlesData(articlesData) {
        const dataPath = path.join(__dirname, this.websitePath, 'data');
        
        // Create data directory if it doesn't exist
        await fs.mkdir(dataPath, { recursive: true });
        
        // Save articles data
        const articlesFile = path.join(dataPath, 'articles.json');
        await fs.writeFile(articlesFile, JSON.stringify(articlesData, null, 2));
        
        console.log('💾 Articles data saved to website/data/articles.json');
    }

    /**
     * Update the preview section in index.html with live data
     */
    async updatePreviewSection(articlesData) {
        try {
            const indexPath = path.join(__dirname, this.websitePath, 'index.html');
            let htmlContent = await fs.readFile(indexPath, 'utf8');

            // Generate HTML for preview items from top 3 articles
            const topArticles = articlesData.articles
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            const previewItemsHtml = topArticles.map(article => `
                <div class="preview-item">
                    <div class="score-badge">${article.scoreLevel}</div>
                    <h4>${article.title}</h4>
                    <p>${article.summary}</p>
                    <a href="${article.url}" class="source-link" target="_blank">Read Full Article →</a>
                </div>
            `).join('\n                ');

            // Find and replace the preview items section
            const previewSectionStart = htmlContent.indexOf('<div class="preview-items">');
            const previewSectionEnd = htmlContent.indexOf('</div>', previewSectionStart + 1) + 6;

            if (previewSectionStart !== -1 && previewSectionEnd !== -1) {
                const newPreviewSection = `<div class="preview-items">
                ${previewItemsHtml}
            </div>`;

                htmlContent = htmlContent.substring(0, previewSectionStart) + 
                             newPreviewSection + 
                             htmlContent.substring(previewSectionEnd);

                await fs.writeFile(indexPath, htmlContent, 'utf8');
                console.log('🔄 Preview section updated in index.html');
            } else {
                console.log('⚠️ Could not find preview section to update');
            }

        } catch (error) {
            console.error('❌ Failed to update preview section:', error);
        }
    }

    /**
     * Create a dedicated insights page
     */
    async createInsightsPage() {
        try {
            const rollingArticles = await this.database.getRollingInsights(5, 50);
            
            const insightsPageHtml = this.generateInsightsPageHtml(rollingArticles);
            
            const insightsPath = path.join(__dirname, this.websitePath, 'insights.html');
            await fs.writeFile(insightsPath, insightsPageHtml, 'utf8');
            
            console.log('📄 Insights page created at insights.html');
            
        } catch (error) {
            console.error('❌ Failed to create insights page:', error);
        }
    }

    /**
     * Generate HTML for insights page
     */
    generateInsightsPageHtml(articles) {
        const articlesHtml = articles.map(article => {
            const formattedArticle = this.formatArticleForWeb(article);
            return `
            <div class="insight-card">
                <div class="insight-header">
                    <div class="score-badge">${formattedArticle.scoreLevel}</div>
                    <div class="date">${new Date(formattedArticle.publishedDate).toLocaleDateString()}</div>
                </div>
                <h3>${formattedArticle.title}</h3>
                <p class="summary">${formattedArticle.summary}</p>
                <div class="insight-meta">
                    <span class="ai-tech">${formattedArticle.aiTechnology}</span>
                    <span class="pmbok-area">${formattedArticle.pmobokArea}</span>
                </div>
                <div class="insight-footer">
                    <span class="source">${formattedArticle.source}</span>
                    <a href="${formattedArticle.url}" target="_blank" class="read-link">Read Article →</a>
                </div>
            </div>`;
        }).join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Latest AI Insights - smartPMO.ai</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-teal: #00ffcc;
            --secondary-teal: #00d4aa;
            --tertiary-teal: #008866;
            --dark-primary: #0a0a0a;
            --dark-secondary: #1a1a1a;
            --glass-bg: rgba(255, 255, 255, 0.1);
            --glass-border: rgba(0, 255, 204, 0.3);
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background: var(--dark-primary);
            color: #ffffff;
            margin: 0;
            padding: 2rem;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 3rem;
        }
        
        .header h1 {
            color: var(--primary-teal);
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }
        
        .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
        }
        
        .insight-card {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 15px;
            padding: 1.5rem;
            transition: all 0.3s ease;
        }
        
        .insight-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0, 255, 204, 0.2);
        }
        
        .insight-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .score-badge {
            background: linear-gradient(45deg, var(--primary-teal), var(--secondary-teal));
            color: var(--dark-primary);
            padding: 0.5rem 1rem;
            border-radius: 25px;
            font-weight: 500;
            font-size: 0.8rem;
        }
        
        .date {
            color: #888;
            font-size: 0.9rem;
        }
        
        .insight-card h3 {
            color: var(--primary-teal);
            margin-bottom: 1rem;
            font-size: 1.1rem;
        }
        
        .summary {
            color: #e0e0e0;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }
        
        .insight-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        
        .ai-tech, .pmbok-area {
            background: rgba(0, 255, 204, 0.1);
            color: var(--secondary-teal);
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            font-size: 0.8rem;
        }
        
        .insight-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .source {
            color: #888;
            font-size: 0.8rem;
        }
        
        .read-link {
            color: var(--secondary-teal);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
        }
        
        .read-link:hover {
            color: var(--primary-teal);
        }
        
        @media (max-width: 768px) {
            .insights-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Latest AI Insights</h1>
            <p>Rolling 50 articles from the past 5 days, scored for PMO relevance</p>
            <p><a href="index.html" style="color: var(--primary-teal);">← Back to Home</a></p>
        </div>
        
        <div class="insights-grid">
            ${articlesHtml}
        </div>
    </div>
</body>
</html>`;
    }

    /**
     * Get stats for website display
     */
    async getWebsiteStats() {
        const stats = await this.database.getStats();
        return {
            totalInsights: stats.totalInsights,
            highQualityInsights: stats.highQualityInsights,
            averageScore: stats.avgScore,
            lastUpdate: new Date().toISOString()
        };
    }

    async close() {
        if (this.database) {
            await this.database.close();
        }
    }
}

module.exports = WebsiteUpdater;