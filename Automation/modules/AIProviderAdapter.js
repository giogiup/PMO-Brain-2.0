// ============================================================================
// AI PROVIDER ADAPTER - Unified Interface for Multiple AI Providers
// ============================================================================
// Provides consistent interface for Cerebras, Groq, Fireworks, OpenRouter, Cohere, Gemini, and OpenAI
// Handles API-specific formatting and error handling
// CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md Section 3, 9
// ============================================================================

const Groq = require('groq-sdk');
const { CohereClientV2 } = require('cohere-ai');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIProviderAdapter {
    constructor(providerConfig) {
        this.provider = providerConfig.provider_name;
        this.model = providerConfig.model_name;
        this.apiKey = process.env[providerConfig.api_key_env_var];

        // Health tracking
        this.lastSuccess = null;
        this.lastError = null;
        this.successCount = 0;
        this.errorCount = 0;

        if (!this.apiKey) {
            throw new Error(`API key not found for ${this.provider}: ${providerConfig.api_key_env_var}`);
        }

        this.initializeClient();
    }

    /**
     * Get health status for this adapter instance
     * CONTRACT: Section 3.1 - Module Health Interface
     */
    getHealth() {
        const totalCalls = this.successCount + this.errorCount;

        return {
            module: `AIProviderAdapter:${this.provider}`,
            status: this.lastError ? 'degraded' : 'healthy',
            lastSuccess: this.lastSuccess,
            metrics: {
                provider: this.provider,
                model: this.model,
                successRate: totalCalls > 0 ? this.successCount / totalCalls : 1,
                successCount: this.successCount,
                errorCount: this.errorCount,
                lastError: this.lastError
            },
            dependencies: [
                { name: `${this.provider} API`, status: this.lastError ? 'degraded' : 'healthy' }
            ]
        };
    }

    /**
     * Initialize the appropriate API client
     */
    initializeClient() {
        switch (this.provider) {
            case 'groq':
                this.client = new Groq({ apiKey: this.apiKey });
                break;
            
            case 'fireworks':
                // Fireworks uses OpenAI-compatible API
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                    baseURL: 'https://api.fireworks.ai/inference/v1'
                });
                break;

            case 'cerebras':
                // Cerebras uses OpenAI-compatible API (2000/day free, 450 TPS)
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                    baseURL: 'https://api.cerebras.ai/v1'
                });
                break;

            case 'openrouter':
                // OpenRouter: OpenAI-compatible, proxies through their servers (no geo-blocks)
                // Free tier: 50 req/day, 1 req/5s rate limit
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                    baseURL: 'https://openrouter.ai/api/v1'
                });
                break;

            case 'cohere':
                this.client = new CohereClientV2({ token: this.apiKey });
                break;
            
            case 'openai':
                this.client = new OpenAI({ apiKey: this.apiKey });
                break;

            case 'gemini':
                // Gemini uses Google's GenerativeAI SDK (not OpenAI-compatible)
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                this.client = this.genAI.getGenerativeModel({ model: this.model });
                break;

            default:
                throw new Error(`Unsupported provider: ${this.provider}`);
        }
    }

    /**
     * Send completion request to AI provider
     * @param {Array} messages - Chat messages in OpenAI format
     * @param {Object} options - Additional options (temperature, max_tokens, etc.)
     * @returns {Promise<Object>} Response with content and token usage
     */
    async complete(messages, options = {}) {
        const startTime = Date.now();

        try {
            let response;

            switch (this.provider) {
                case 'groq':
                case 'fireworks':
                case 'cerebras':
                case 'openrouter':
                case 'openai':
                    response = await this.openAIStyleComplete(messages, options);
                    break;

                case 'cohere':
                    response = await this.cohereComplete(messages, options);
                    break;

                case 'gemini':
                    response = await this.geminiComplete(messages, options);
                    break;

                default:
                    throw new Error(`Unsupported provider: ${this.provider}`);
            }

            const responseTime = Date.now() - startTime;

            // Track success for health
            this.successCount++;
            this.lastSuccess = new Date().toISOString();
            this.lastError = null;

            return {
                success: true,
                content: response.content,
                tokens_input: response.tokens_input,
                tokens_output: response.tokens_output,
                response_time_ms: responseTime,
                provider: this.provider,
                model: this.model
            };

        } catch (error) {
            const responseTime = Date.now() - startTime;

            // Track error for health
            this.errorCount++;
            this.lastError = error.message;

            return {
                success: false,
                error: error.message,
                response_time_ms: responseTime,
                provider: this.provider,
                model: this.model
            };
        }
    }

    /**
     * OpenAI-style completion (works for Groq, Fireworks, OpenAI)
     */
    async openAIStyleComplete(messages, options) {
        const response = await this.client.chat.completions.create({
            model: this.model,
            messages: messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 500
        });

        return {
            content: response.choices[0].message.content || response.choices[0].message.reasoning || '',
            tokens_input: response.usage?.prompt_tokens || 0,
            tokens_output: response.usage?.completion_tokens || 0
        };
    }

    /**
     * Cohere-style completion
     */
    async cohereComplete(messages, options) {
        // Cohere v2 API format: simple message + chat_history
        const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
        
        // Get the last user message
        const lastMessage = userMessages[userMessages.length - 1].content;
        
        // Build chat history (all previous messages)
        const chatHistory = [];
        for (let i = 0; i < userMessages.length - 1; i++) {
            const msg = userMessages[i];
            chatHistory.push({
                role: msg.role === 'user' ? 'USER' : 'CHATBOT',
                message: msg.content
            });
        }

        const response = await this.client.chat({
            model: this.model,
            message: lastMessage,
            chatHistory: chatHistory.length > 0 ? chatHistory : undefined,
            temperature: options.temperature || 0.7,
            maxTokens: options.max_tokens || 500
        });

        return {
            content: response.text,
            tokens_input: response.meta?.tokens?.inputTokens || 0,
            tokens_output: response.meta?.tokens?.outputTokens || 0
        };
    }

    /**
     * Gemini-specific completion via Google GenerativeAI SDK
     * Converts OpenAI-style messages to Gemini's generateContent format
     */
    async geminiComplete(messages, options) {
        // Gemini uses a flat prompt string via generateContent()
        // Convert messages array to a single prompt string
        const prompt = messages
            .map(m => {
                if (m.role === 'system') return m.content;
                if (m.role === 'user') return m.content;
                if (m.role === 'assistant') return `Assistant: ${m.content}`;
                return m.content;
            })
            .join('\n\n');

        const result = await this.client.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.max_tokens || 500,
                responseMimeType: "application/json"
            }
        });

        const response = result.response;
        const text = response.text();

        // Gemini usage metadata
        const usage = response.usageMetadata || {};

        return {
            content: text.trim(),
            tokens_input: usage.promptTokenCount || 0,
            tokens_output: usage.candidatesTokenCount || 0
        };
    }

    /**
     * Calculate cost based on token usage
     * @param {number} inputTokens - Input tokens used
     * @param {number} outputTokens - Output tokens used
     * @param {Object} providerConfig - Provider configuration with costs
     * @returns {number} Cost in USD
     */
    static calculateCost(inputTokens, outputTokens, providerConfig) {
        const inputCost = (inputTokens / 1000000) * providerConfig.cost_per_1m_input;
        const outputCost = (outputTokens / 1000000) * providerConfig.cost_per_1m_output;
        return inputCost + outputCost;
    }

    /**
     * Test provider connection
     * @returns {Promise<boolean>} True if connection successful
     */
    async testConnection() {
        try {
            const testMessages = [
                { role: 'user', content: 'Say "test successful"' }
            ];
            
            const result = await this.complete(testMessages, { max_tokens: 10 });
            return result.success;
        } catch (error) {
            console.error(`❌ ${this.provider} connection test failed:`, error.message);
            return false;
        }
    }
}

module.exports = AIProviderAdapter;
