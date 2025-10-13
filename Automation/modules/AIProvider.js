// ============================================================================
// AI PROVIDER - Task-Specific Multi-Provider Abstraction Layer
// ============================================================================
// PURPOSE: Centralized AI provider management supporting different providers
//          for different tasks (scoring vs enrichment) to optimize for:
//          - Token usage (Groq: low-token scoring, Gemini: high-token enrichment)
//          - Rate limits (different providers have different limits)
//          - Cost optimization (use free tiers strategically)
//
// ARCHITECTURE DECISION: Task-specific provider selection
//   WHY: Different AI tasks have vastly different token requirements:
//        - Scoring: ~500 tokens/article (title + URL only)
//        - Enrichment: ~45,000 tokens/article (full content analysis)
//   
//   PROBLEM: Single provider hits limits quickly
//        - Groq free: 100K tokens/day = 2 enriched articles only
//        - Gemini free: Higher limits but 15 req/min
//   
//   SOLUTION: Use Groq for scoring (fast, low-token), Gemini for enrichment
//
// CONFIGURATION:
//   Environment variables checked in order:
//   1. AI_PROVIDER_SCORING=groq    (task-specific, highest priority)
//   2. AI_PROVIDER_ENRICHMENT=gemini
//   3. AI_PROVIDER=groq            (fallback default)
//
// BACKWARD COMPATIBILITY:
//   If no task-specific vars set, falls back to AI_PROVIDER
//   Existing .env files work without changes
//
// FUTURE EXTENSIBILITY:
//   To add new tasks: AI_PROVIDER_FETCH, AI_PROVIDER_CARDS, etc.
//   Just add to task mapping, no code changes needed
//
// DEPENDENCIES:
//   - groq-sdk: Groq API client
//   - @google/generative-ai: Gemini API client  
//   - openai: OpenAI API client
//   All must be installed even if only using one (required at load time)
//
// MODIFICATIONS CHECKLIST:
//   When changing this file, verify:
//   □ All three provider clients still initialize correctly
//   □ Rate limiting values match current provider docs
//   □ Error messages are descriptive for debugging
//   □ New providers added to all relevant switch statements
//   □ Task mapping updated if adding new task types
// ============================================================================

const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

class AIProvider {
    /**
     * Initialize AI provider with optional task-specific configuration
     * 
     * @param {string} task - Optional task identifier ('SCORING', 'ENRICHMENT', etc.)
     *                        Used to check for task-specific env vars first
     * 
     * PROVIDER SELECTION LOGIC:
     *   1. Check AI_PROVIDER_{TASK} (e.g., AI_PROVIDER_SCORING)
     *   2. Fall back to AI_PROVIDER if task-specific not set
     *   3. Default to 'groq' if neither set
     * 
     * EXAMPLE .env configurations:
     *   Simple (single provider):
     *     AI_PROVIDER=groq
     *   
     *   Optimized (task-specific):
     *     AI_PROVIDER_SCORING=groq        # Fast, low-token
     *     AI_PROVIDER_ENRICHMENT=gemini    # High-token capacity
     *     AI_PROVIDER=groq                 # Fallback for other tasks
     */
    constructor(task = null) {
        // TASK-SPECIFIC PROVIDER SELECTION
        // Check for task-specific env var first (AI_PROVIDER_SCORING, etc.)
        // Falls back to general AI_PROVIDER if not set
        // This allows mixing providers optimally for different workloads
        let providerKey = 'AI_PROVIDER';
        if (task) {
            const taskSpecificKey = `AI_PROVIDER_${task.toUpperCase()}`;
            if (process.env[taskSpecificKey]) {
                providerKey = taskSpecificKey;
                console.log(`🎯 Using task-specific provider for ${task}: ${process.env[taskSpecificKey]}`);
            }
        }
        
        this.provider = process.env[providerKey] || 'groq';
        this.task = task;
        this.client = null;
        this.model = null;
        this.rateLimit = 1000; // Default delay between calls (milliseconds)
        
        this.initialize();
    }
    
    /**
     * Initialize the selected AI provider client
     * 
     * CRITICAL: This runs at construction time
     * If API key missing, throws immediately - prevents silent failures later
     */
    initialize() {
        switch(this.provider.toLowerCase()) {
            case 'groq':
                this.initializeGroq();
                break;
            case 'gemini':
                this.initializeGemini();
                break;
            case 'openai':
                this.initializeOpenAI();
                break;
            default:
                throw new Error(`Unknown AI provider: ${this.provider}. Valid options: groq, gemini, openai`);
        }
        
        console.log(`🤖 AI Provider: ${this.provider} (${this.model})`);
    }
    
    /**
     * Initialize Groq client
     * 
     * GROQ CHARACTERISTICS:
     *   - Speed: Fastest inference (280 tokens/sec for llama-3.3-70b)
     *   - Free tier: 100K tokens/day, 300K tokens/min
     *   - Best for: Low-token tasks (scoring with just title+URL)
     *   - Cost: Very cheap ($0.59 per 1M input tokens)
     * 
     * RATE LIMITING:
     *   - 1 second between calls = very conservative
     *   - Could go up to 16 req/sec (1K req/min limit)
     *   - But safer to be conservative to avoid burst limits
     * 
     * TOKEN BUDGET EXAMPLE:
     *   - 200 articles scored = ~100K tokens = entire free daily limit
     *   - 2 articles enriched = ~90K tokens = almost entire limit
     *   Conclusion: Use Groq ONLY for scoring, not enrichment
     */
    initializeGroq() {
        if (!process.env.GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY not found in .env file. Get free key at: https://console.groq.com');
        }
        
        this.client = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
        
        // Model selection: Can be overridden via GROQ_MODEL env var
        // Default: llama-3.3-70b-versatile (best balance of speed/quality)
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.rateLimit = 1000; // 1 second between calls
    }
    
    /**
     * Initialize Gemini client
     * 
     * GEMINI CHARACTERISTICS:
     *   - Speed: Moderate (Gemini 2.0 Flash = fast variant)
     *   - Free tier: 15 requests/minute, 1500 requests/day
     *   - Best for: High-token tasks (enrichment with full content)
     *   - Token limits: Much higher than Groq free tier
     * 
     * RATE LIMITING:
     *   - 4 seconds between calls = 15 requests/min (respects limit)
     *   - CRITICAL: Must respect this to avoid 429 errors
     *   - Going faster risks being blocked temporarily
     * 
     * TOKEN BUDGET EXAMPLE:
     *   - 200 articles scored = ~100K tokens = works fine
     *   - 20 articles enriched = ~900K tokens = works fine
     *   Conclusion: Use Gemini for enrichment (high token needs)
     */
    initializeGemini() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not found in .env file. Get free key at: https://ai.google.dev');
        }
        
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Model selection: Can be overridden via GEMINI_MODEL env var
        // Default: gemini-2.0-flash-exp (fast, experimental, good quality)
        this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
        this.client = genAI.getGenerativeModel({ model: this.model });
        
        // CRITICAL: 4 second delay required for 15 req/min limit
        // Math: 60 seconds / 15 requests = 4 seconds per request
        this.rateLimit = 4000;
    }
    
    /**
     * Initialize OpenAI client
     * 
     * OPENAI CHARACTERISTICS:
     *   - Speed: Moderate (gpt-4o-mini is faster variant)
     *   - Cost: Pay-per-use (no free tier after trial)
     *   - Best for: Production if budget allows
     *   - Quality: Generally highest quality responses
     * 
     * RATE LIMITING:
     *   - Conservative 1 second (actual limits are higher)
     *   - Tier-based limits (need to check account tier)
     */
    initializeOpenAI() {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY not found in .env file. Get key at: https://platform.openai.com/api-keys');
        }
        
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Model selection: Can be overridden via OPENAI_MODEL env var
        // Default: gpt-4o-mini (cost-effective, fast)
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.rateLimit = 1000; // 1 second between calls
    }
    
    /**
     * Generate completion from AI provider
     * 
     * ABSTRACTION LAYER: This method provides consistent interface across all providers
     * Each provider has different API structure, but this normalizes them
     * 
     * @param {string} prompt - The prompt text to send
     * @param {object} options - Generation options
     * @param {number} options.temperature - Randomness (0-1, default 0.3)
     * @param {number} options.maxTokens - Max response length (default 500)
     * 
     * @returns {string|null} Generated text, or null on error
     * 
     * ERROR HANDLING:
     *   - Catches all provider-specific errors
     *   - Logs error to console for debugging
     *   - Returns null (caller handles gracefully)
     *   - Does NOT throw (prevents pipeline crashes)
     * 
     * MODIFICATIONS:
     *   When adding new provider:
     *   1. Add case to switch statement
     *   2. Create provider-specific completion method (see below)
     *   3. Ensure error handling is consistent
     *   4. Test with actual API key
     */
    async generateCompletion(prompt, options = {}) {
        const temperature = options.temperature || 0.3;
        const maxTokens = options.maxTokens || 500;
        
        try {
            switch(this.provider.toLowerCase()) {
                case 'groq':
                    return await this.groqCompletion(prompt, temperature, maxTokens);
                case 'gemini':
                    return await this.geminiCompletion(prompt, temperature, maxTokens);
                case 'openai':
                    return await this.openaiCompletion(prompt, temperature, maxTokens);
                default:
                    throw new Error(`Unknown provider in generateCompletion: ${this.provider}`);
            }
        } catch (error) {
            // ERROR LOGGING: Include provider and task context for debugging
            console.error(`  ${this.provider} API error${this.task ? ` (${this.task})` : ''}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Groq-specific completion implementation
     * 
     * API STRUCTURE: Uses OpenAI-compatible chat completions format
     * Returns: Single message content as string
     */
    async groqCompletion(prompt, temperature, maxTokens) {
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: temperature,
            max_tokens: maxTokens
        });
        
        return completion.choices[0].message.content.trim();
    }
    
    /**
     * Gemini-specific completion implementation
     * 
     * API STRUCTURE: Uses Google's generateContent format
     * Returns: Text from response object
     * 
     * NOTE: Temperature not directly supported in same way as OpenAI
     *       Gemini uses different parameter structure
     */
    async geminiCompletion(prompt, temperature, maxTokens) {
        const result = await this.client.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    }
    
    /**
     * OpenAI-specific completion implementation
     * 
     * API STRUCTURE: Standard chat completions format
     * Returns: Single message content as string
     */
    async openaiCompletion(prompt, temperature, maxTokens) {
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: temperature,
            max_tokens: maxTokens
        });
        
        return completion.choices[0].message.content.trim();
    }
    
    /**
     * Get provider-specific rate limit delay
     * 
     * USAGE: Call sleep(aiProvider.getRateLimit()) between API calls
     * 
     * @returns {number} Milliseconds to wait between API calls
     * 
     * WHY THIS MATTERS:
     *   - Too fast = rate limit errors (429) and potential blocking
     *   - Too slow = unnecessarily long pipeline runs
     *   - Provider-specific = optimal balance for each service
     */
    getRateLimit() {
        return this.rateLimit;
    }
    
    /**
     * Get current provider name
     * 
     * USAGE: For logging, debugging, and conditional logic
     * @returns {string} Provider name ('groq', 'gemini', 'openai')
     */
    getProviderName() {
        return this.provider;
    }
    
    /**
     * Get current model name
     * 
     * USAGE: For logging which specific model variant is being used
     * @returns {string} Model identifier (e.g., 'llama-3.3-70b-versatile')
     */
    getModelName() {
        return this.model;
    }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
//
// Example 1: Task-specific providers in .env
//   AI_PROVIDER_SCORING=groq       # Fast, low-token
//   AI_PROVIDER_ENRICHMENT=gemini  # High-token capacity
//   AI_PROVIDER=groq               # Default fallback
//
// Example 2: Single provider (backward compatible)
//   AI_PROVIDER=groq
//
// Example 3: In ScoringEngine.js
//   this.aiProvider = new AIProvider('SCORING');
//   // Uses groq if AI_PROVIDER_SCORING=groq
//
// Example 4: In ContentEnricher.js
//   this.aiProvider = new AIProvider('ENRICHMENT');
//   // Uses gemini if AI_PROVIDER_ENRICHMENT=gemini
//
// ============================================================================

module.exports = AIProvider;