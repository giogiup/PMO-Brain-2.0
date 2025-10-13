class GlobalConfig {
    constructor() {
        this.theme = new PMOTheme();
        this.logger = new ComponentLogger();
        this.promptManager = null;
        this.apiClient = null;
    }
    
    getModuleConfig(moduleName) {
        const configs = {
            'newsletter-engine': {
                maxConcurrentProcessing: 5,
                enableAIAnalysis: true,
                enableInferenceDetection: true,
                fallbackMode: false
            }
        };
        return configs[moduleName] || {};
    }
}

class ComponentLogger {
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
}

class PMOTheme {
    constructor() {
        this.colors = {
            primary: '#667eea',
            accent: '#764ba2', 
            background: '#f8f9fa',
            text: '#333333'
        };
        
        this.fonts = {
            header: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };
    }
    
    getCSS() {
        return `<style>
        body {
            font-family: ${this.fonts.body};
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, ${this.colors.primary} 0%, ${this.colors.accent} 100%);
            min-height: 100vh;
        }
        
        .newsletter-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .header {
            background: linear-gradient(135deg, ${this.colors.primary} 0%, ${this.colors.accent} 100%);
            color: white;
            text-align: center;
            padding: 40px 20px;
        }
        
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 700;
        }
        
        .header .subtitle {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        /* ===== NEW: TABLE OF CONTENTS STYLING ===== */
        .table-of-contents {
            background: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .table-of-contents h2 {
            margin: 0 0 15px 0;
            color: ${this.colors.primary};
            font-size: 1.3em;
        }
        
        .table-of-contents ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        
        .table-of-contents li {
            margin: 8px 0;
            padding: 8px 12px;
            background: white;
            border-radius: 4px;
            border-left: 3px solid ${this.colors.primary};
        }
        
        .table-of-contents a {
            color: ${this.colors.primary};
            text-decoration: none;
            font-weight: 600;
        }
        
        .table-of-contents a:hover {
            text-decoration: underline;
        }
        
        .toc-meta {
            color: #666;
            font-size: 0.85em;
            font-weight: normal;
        }
        
        /* ===== NEW: NEWSLETTER SECTIONS ===== */
        .newsletter-section {
            margin: 40px 0;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .section-header {
            background: linear-gradient(90deg, ${this.colors.primary} 0%, ${this.colors.accent} 100%);
            color: white;
            padding: 20px 25px;
        }
        
        .section-header h2 {
            margin: 0 0 10px 0;
            font-size: 1.4em;
            font-weight: 600;
        }
        
        .section-summary {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin: 10px 0 0 0;
        }
        
        .summary-stat {
            background: rgba(255,255,255,0.2);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .summary-stat.review-needed {
            background: rgba(255,193,7,0.9);
            color: #856404;
        }
        
        .section-content {
            padding: 20px;
            background: #fafbfc;
        }
        
        /* ===== EXISTING: INSIGHT CARDS ===== */
        .insight-card {
            background: white;
            border-left: 4px solid ${this.colors.primary};
            margin: 20px 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .card-header {
            background: ${this.colors.primary};
            color: white;
            padding: 12px 20px;
        }
        
        .card-header h3 {
            margin: 0;
            font-size: 1.1em;
        }
        
        .card-body {
            padding: 20px;
        }
        
        .tagline {
            background: #e3f2fd;
            border-left: 3px solid #2196f3;
            padding: 12px 15px;
            margin-bottom: 15px;
            font-weight: 500;
            color: #1565c0;
            border-radius: 4px;
        }
        
        .target-audience {
            background: #f3e5f5;
            border-left: 3px solid #9c27b0;
            padding: 8px 15px;
            margin-bottom: 15px;
            font-size: 0.9em;
            color: #6a1b9a;
            border-radius: 4px;
        }
        
        .article-title {
            margin: 15px 0 12px 0;
        }
        
        .article-title a {
            color: ${this.colors.primary};
            text-decoration: none;
            font-weight: 600;
            font-size: 1.05em;
        }
        
        .article-title a:hover {
            text-decoration: underline;
        }
        
        .summary {
            margin: 12px 0;
            color: #333;
            line-height: 1.5;
        }
        
        .applications, .strategic-value {
            margin: 12px 0;
            color: #444;
            line-height: 1.5;
        }
        
        .decision-framework {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
        }
        
        .decision-framework h5 {
            margin: 0 0 8px 0;
            color: #333;
            font-size: 0.95em;
        }
        
        .factors .factor {
            display: inline-block;
            margin-right: 12px;
            margin-bottom: 4px;
            font-size: 0.85em;
        }
        
        .metadata {
            margin: 15px 0 8px 0;
            padding: 12px;
            background: #e8f5e8;
            border-radius: 6px;
            font-size: 0.9em;
            color: #2e7d32;
        }
        
        .review-note {
            margin: 12px 0;
            padding: 10px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            color: #856404;
            font-size: 0.85em;
        }
        
        .footer {
            background: #f8f9fa;
            text-align: center;
            padding: 25px 20px;
            color: #666;
            border-top: 1px solid #dee2e6;
            font-size: 0.9em;
        }
        
        /* ===== RESPONSIVE DESIGN ===== */
        @media (max-width: 600px) {
            body { padding: 10px; }
            .content { padding: 20px 15px; }
            .card-body { padding: 15px; }
            .header { padding: 25px 15px; }
            .header h1 { font-size: 2em; }
            .newsletter-container { max-width: 100%; }
            .section-header { padding: 15px 20px; }
            .section-content { padding: 15px; }
            .summary-stat { font-size: 0.8em; }
        }
        
        /* ===== SMOOTH SCROLLING FOR TOC ===== */
        html {
            scroll-behavior: smooth;
        }
        </style>`;
    }
    
    apply(content, type) {
        return content;
    }
}

module.exports = { GlobalConfig, PMOTheme, ComponentLogger };