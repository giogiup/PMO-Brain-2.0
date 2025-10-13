// ============================================================================
// AI PROVIDER ADAPTER - Unified Interface for Multiple AI Providers
// ============================================================================
// Provides consistent interface for Groq, Fireworks, Cohere, and OpenAI
// Handles API-specific formatting and error handling
// ============================================================================

const Groq = require('groq-sdk');
const { CohereClientV2 } = require('cohere-ai');
const OpenAI = require('openai');

class AIProviderAdapter {
    constructor(providerConfig) {
        this.provider = providerConfig.provider_name;
        this.model = providerConfig.model_name;
        this.apiKey = process.env[providerConfig.api_key_env_var];
        
        if (!this.apiKey) {
            throw new Error(`API key not found for ${this.provider}: ${providerConfig.api_key_env_var}`);
        }

        this.initializeClient();
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
            
            case 'cohere':
                this.client = new CohereClientV2({ token: this.apiKey });
                break;
            
            case 'openai':
                this.client = new OpenAI({ apiKey: this.apiKey });
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
                case 'openai':
                    response = await this.openAIStyleComplete(messages, options);
                    break;
                
                case 'cohere':
                    response = await this.cohereComplete(messages, options);
                    break;
                
                default:
                    throw new Error(`Unsupported provider: ${this.provider}`);
            }

            const responseTime = Date.now() - startTime;

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
            content: response.choices[0].message.content,
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
