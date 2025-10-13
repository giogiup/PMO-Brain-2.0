const Groq = require('groq-sdk');

class GroqAPIClient {
    constructor(apiKey, options = {}) {
        this.apiKey = apiKey;
        this.model = options.model || 'llama3-8b-8192';
        this.maxRetries = options.maxRetries || 3;
        this.groq = new Groq({ apiKey: apiKey });
    }

    async generateContent(prompt, options = {}) {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const completion = await this.groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: options.model || this.model,
                    temperature: options.temperature || 0.7,
                    max_tokens: options.maxTokens || 2000,
                    top_p: options.topP || 0.9,
                });

                return completion.choices[0]?.message?.content || '';
                
            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Groq API attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);
                
                if (attempt < this.maxRetries) {
                    // Wait before retry with exponential backoff
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }
        
        throw new Error(`Groq API failed after ${this.maxRetries} attempts: ${lastError.message}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async testConnection() {
        try {
            const response = await this.generateContent("Test connection. Respond with 'OK'.", { maxTokens: 10 });
            return { success: true, response: response.trim() };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = GroqAPIClient;