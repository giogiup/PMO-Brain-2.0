/**
 * Article Display Manager
 * Manages dual-section article display for SmartPMO.ai
 *
 * Sections:
 * 1. Latest Intelligence (Auto) - 20-article FIFO queue from discovery pipeline
 * 2. Strategic Insights (Manual) - Unlimited curated articles
 *
 * FIFO Logic:
 * - Max 20 articles in auto section
 * - When 21st article added, oldest is automatically removed
 * - is_displayed=1 indicates article is shown in Latest Intelligence
 *
 * Date: 2026-01-16
 */

const path = require('path');

class ArticleDisplayManager {
    constructor(db) {
        if (!db) {
            throw new Error('Database instance required');
        }
        this.db = db;
        this.AUTO_SECTION_LIMIT = 20;
    }


    /**
     * Update auto section with FIFO logic
     * Called when a new article is ready to be displayed
     *
     * @param {number} articleId - ID from daily_insights table
     * @returns {Object} - Stats about the operation
     */
    async updateAutoSection(articleId) {
        try {
            // Validate article exists and has required fields
            const article = this.db.prepare(`
                SELECT id, title, url, pmo_score, discovered_at
                FROM daily_insights
                WHERE id = ?
            `).get(articleId);

            if (!article) {
                throw new Error(`Article ${articleId} not found`);
            }

            if (!article.pmo_score) {
                throw new Error(`Article ${articleId} has no PMO score`);
            }

            // Check if this URL is already displayed (prevent duplicates)
            const existingUrl = this.db.prepare(`
                SELECT id, title
                FROM daily_insights
                WHERE is_displayed = 1
                AND url = ?
            `).get(article.url);

            if (existingUrl) {
                throw new Error(`URL already displayed (article ${existingUrl.id}): ${article.url}`);
            }

            // Check current count of displayed articles
            const currentCount = this.db.prepare(`
                SELECT COUNT(*) as count
                FROM daily_insights
                WHERE is_displayed = 1
            `).get();

            let removedArticle = null;

            // If at limit, remove oldest article (FIFO)
            if (currentCount.count >= this.AUTO_SECTION_LIMIT) {
                const oldest = this.db.prepare(`
                    SELECT id, title, discovered_at
                    FROM daily_insights
                    WHERE is_displayed = 1
                    ORDER BY discovered_at ASC
                    LIMIT 1
                `).get();

                if (oldest) {
                    // Remove oldest from display
                    this.db.prepare(`
                        UPDATE daily_insights
                        SET is_displayed = 0
                        WHERE id = ?
                    `).run(oldest.id);

                    removedArticle = oldest;

                    console.log(`  🗑️  FIFO: Removed oldest article (${oldest.id}) from display`);
                    console.log(`     Title: ${oldest.title.substring(0, 60)}...`);
                }
            }

            // Add new article to display
            this.db.prepare(`
                UPDATE daily_insights
                SET is_displayed = 1
                WHERE id = ?
            `).run(articleId);

            // Get updated count
            const newCount = this.db.prepare(`
                SELECT COUNT(*) as count
                FROM daily_insights
                WHERE is_displayed = 1
            `).get();

            console.log(`  ✅ Added article ${articleId} to Latest Intelligence`);
            console.log(`     Display count: ${newCount.count}/${this.AUTO_SECTION_LIMIT}`);

            return {
                success: true,
                added: article,
                removed: removedArticle,
                displayCount: newCount.count
            };

        } catch (error) {
            console.error('❌ ERROR in updateAutoSection:', error.message);
            throw error;
        }
    }

    /**
     * Get all articles in Latest Intelligence section
     * Returns max 20 articles, newest first
     *
     * @returns {Array} - Array of article objects
     */
    getAutoArticles() {
        try {
            const articles = this.db.prepare(`
                SELECT
                    id,
                    title,
                    url,
                    content_summary as summary,
                    pmo_score as score,
                    published_date,
                    discovered_at,
                    pmbok_area
                FROM daily_insights
                WHERE is_displayed = 1
                  AND pmo_score IS NOT NULL
                ORDER BY discovered_at DESC
                LIMIT ?
            `).all(this.AUTO_SECTION_LIMIT);

            return articles.map(article => ({
                id: article.id,
                title: article.title,
                url: article.url,
                summary: article.summary || '',
                score: article.score,
                publishedDate: article.published_date,
                discoveredAt: article.discovered_at,
                pmbokArea: article.pmbok_area,
                section: 'auto'
            }));

        } catch (error) {
            console.error('❌ ERROR in getAutoArticles:', error.message);
            return [];
        }
    }

    /**
     * Get all curated articles in Strategic Insights section
     * Returns all active curated articles, ordered by display_order
     *
     * @returns {Array} - Array of curated article objects
     */
    getCuratedArticles() {
        try {
            const articles = this.db.prepare(`
                SELECT
                    id,
                    title,
                    url,
                    summary,
                    source_name,
                    published_date,
                    added_date,
                    display_order
                FROM curated_articles
                WHERE is_active = 1
                ORDER BY display_order ASC, added_date DESC
            `).all();

            return articles.map(article => ({
                id: article.id,
                title: article.title,
                url: article.url,
                summary: article.summary || '',
                source: article.source_name,
                publishedDate: article.published_date,
                addedDate: article.added_date,
                displayOrder: article.display_order,
                section: 'curated'
            }));

        } catch (error) {
            console.error('❌ ERROR in getCuratedArticles:', error.message);
            return [];
        }
    }

    /**
     * Get all displayed articles (both sections)
     * Used by API endpoint to generate displayed-articles.json
     *
     * @returns {Object} - Object with latestIntelligence and strategicInsights arrays
     */
    getAllDisplayedArticles() {
        const auto = this.getAutoArticles();
        const curated = this.getCuratedArticles();

        return {
            latestIntelligence: auto,
            strategicInsights: curated,
            counts: {
                auto: auto.length,
                curated: curated.length,
                total: auto.length + curated.length
            },
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Add curated article
     * Admin-only operation
     *
     * @param {Object} article - Article data
     * @returns {Object} - Created article with ID
     */
    addCuratedArticle(article) {
        try {
            // Validate required fields
            if (!article.title || !article.url) {
                throw new Error('Title and URL are required');
            }

            // Check for duplicate URL
            const existing = this.db.prepare(`
                SELECT id FROM curated_articles WHERE url = ?
            `).get(article.url);

            if (existing) {
                throw new Error(`Article with URL already exists (ID: ${existing.id})`);
            }

            // Insert article
            const result = this.db.prepare(`
                INSERT INTO curated_articles (
                    title, url, summary, source_name, published_date,
                    added_by, display_order, notes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                article.title,
                article.url,
                article.summary || null,
                article.source_name || null,
                article.published_date || null,
                article.added_by || 'admin',
                article.display_order || 0,
                article.notes || null
            );

            console.log(`✅ Added curated article (ID: ${result.lastInsertRowid})`);

            return {
                success: true,
                id: result.lastInsertRowid,
                ...article
            };

        } catch (error) {
            console.error('❌ ERROR in addCuratedArticle:', error.message);
            throw error;
        }
    }

    /**
     * Update curated article
     *
     * @param {number} id - Article ID
     * @param {Object} updates - Fields to update
     * @returns {Object} - Update result
     */
    updateCuratedArticle(id, updates) {
        try {
            // Build dynamic UPDATE query
            const allowedFields = ['title', 'url', 'summary', 'source_name', 'published_date', 'display_order', 'is_active', 'notes'];
            const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            const setClause = updateFields.map(field => `${field} = ?`).join(', ');
            const values = updateFields.map(field => updates[field]);
            values.push(id);

            // Update article
            const result = this.db.prepare(`
                UPDATE curated_articles
                SET ${setClause}, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(...values);

            if (result.changes === 0) {
                throw new Error(`Curated article ${id} not found`);
            }

            console.log(`✅ Updated curated article ${id}`);

            return { success: true, id, changes: result.changes };

        } catch (error) {
            console.error('❌ ERROR in updateCuratedArticle:', error.message);
            throw error;
        }
    }

    /**
     * Delete curated article (soft delete)
     *
     * @param {number} id - Article ID
     * @returns {Object} - Delete result
     */
    deleteCuratedArticle(id) {
        try {
            // Soft delete by setting is_active = 0
            const result = this.db.prepare(`
                UPDATE curated_articles
                SET is_active = 0, updated_at = datetime('now','localtime')
                WHERE id = ?
            `).run(id);

            if (result.changes === 0) {
                throw new Error(`Curated article ${id} not found`);
            }

            console.log(`✅ Deleted curated article ${id}`);

            return { success: true, id, changes: result.changes };

        } catch (error) {
            console.error('❌ ERROR in deleteCuratedArticle:', error.message);
            throw error;
        }
    }

    /**
     * Get display statistics
     * Useful for admin dashboard
     *
     * @returns {Object} - Display stats
     */
    getDisplayStats() {
        try {
            const stats = {
                auto: {
                    displayed: this.db.prepare('SELECT COUNT(*) as count FROM daily_insights WHERE is_displayed = 1').get().count,
                    limit: this.AUTO_SECTION_LIMIT,
                    available: this.AUTO_SECTION_LIMIT - this.db.prepare('SELECT COUNT(*) as count FROM daily_insights WHERE is_displayed = 1').get().count
                },
                curated: {
                    active: this.db.prepare('SELECT COUNT(*) as count FROM curated_articles WHERE is_active = 1').get().count,
                    total: this.db.prepare('SELECT COUNT(*) as count FROM curated_articles').get().count
                }
            };

            return stats;

        } catch (error) {
            console.error('❌ ERROR in getDisplayStats:', error.message);
            return null;
        }
    }
}

module.exports = ArticleDisplayManager;
