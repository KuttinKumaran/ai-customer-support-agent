const fs = require('fs');
const path = require('path');

/**
 * OpenAIService — Azure OpenAI integration for intent and response generation.
 * Falls back to deterministic mock responses when MOCK_AZURE=true.
 */
class OpenAIService {
  constructor(azureConfig, loggingService) {
    this.config = azureConfig;
    this.loggingService = loggingService;
    this.client = null;

    if (!this.config.useMock) {
      this._initClient();
    }
  }

  _initClient() {
    const { AzureOpenAI } = require('openai');
    this.client = new AzureOpenAI({
      endpoint: this.config.openai.endpoint,
      apiKey: this.config.openai.apiKey,
      apiVersion: this.config.openai.apiVersion,
    });
  }

  /**
   * Classify customer message intent.
   */
  async classifyIntent(customerMessage, requestId) {
    this.loggingService.logStep(requestId, 'Classifying intent', {
      messageLength: customerMessage.length,
      mock: this.config.useMock,
    });

    if (this.config.useMock) {
      return this._mockClassifyIntent(customerMessage);
    }

    const { buildIntentPrompt } = require('../prompts/intentPrompt');
    const prompt = buildIntentPrompt(customerMessage);

    const response = await this.client.chat.completions.create({
      model: this.config.openai.deployment,
      messages: [
        { role: 'system', content: 'You are an intent classifier. Respond with JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  }

  /**
   * Generate customer-facing response.
   */
  async generateResponse(prompt, requestId) {
    this.loggingService.logStep(requestId, 'Generating response', {
      mock: this.config.useMock,
    });

    if (this.config.useMock) {
      return this._mockGenerateResponse(prompt);
    }

    const { SYSTEM_PROMPT } = require('../prompts/systemPrompt');

    const response = await this.client.chat.completions.create({
      model: this.config.openai.deployment,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0].message.content.trim();
  }

  /**
   * Generate embeddings for RAG (used by RAGService in real mode).
   */
  async generateEmbedding(text, requestId) {
    if (this.config.useMock) {
      return this._mockEmbedding(text);
    }

    this.loggingService.logDebug(requestId, 'Generating embedding');

    const response = await this.client.embeddings.create({
      model: this.config.openai.embeddingDeployment,
      input: text,
    });

    return response.data[0].embedding;
  }

  _mockClassifyIntent(customerMessage) {
    const lower = customerMessage.toLowerCase();

    if (
      lower.includes("hasn't arrived") ||
      lower.includes('not arrived') ||
      lower.includes('delayed') ||
      lower.includes('where is my order')
    ) {
      return { intent: 'order_delivery_inquiry', confidence: 0.95 };
    }

    if (lower.includes('refund')) {
      return { intent: 'refund_request', confidence: 0.9 };
    }

    return { intent: 'general_complaint', confidence: 0.7 };
  }

  _mockGenerateResponse(prompt) {
    const couponMatch = prompt.match(/Coupon Eligible: Yes, ₹(\d+)/);
    const refundMatch = prompt.includes('Refund Eligible: Yes');
    const customerMatch = prompt.match(/Customer Name: (.+)/);
    const daysMatch = prompt.match(/Days Delayed: (\d+)/);

    const customerName = customerMatch ? customerMatch[1].trim() : 'Customer';
    const daysDelayed = daysMatch ? parseInt(daysMatch[1], 10) : 0;

    if (refundMatch) {
      return `Dear ${customerName}, we sincerely apologize for the significant delay of ${daysDelayed} days with your Samsung order. Per our policy, you are eligible for a full refund. Our team will process this within 5-7 business days. Thank you for your patience.`;
    }

    if (couponMatch) {
      const amount = couponMatch[1];
      return `Dear ${customerName}, we apologize for the delay with your Samsung order. Based on our policy, you are eligible for a ₹${amount} coupon on your next purchase. Your order is in transit and should arrive soon. Thank you for choosing Samsung.`;
    }

    return `Dear ${customerName}, thank you for reaching out. We understand your concern about your Samsung order. It is currently in transit and we are monitoring it closely. We will keep you updated on the delivery status.`;
  }

  _mockEmbedding(text) {
    const words = text.toLowerCase().split(/\W+/).filter(Boolean);
    const vector = new Array(64).fill(0);

    words.forEach((word) => {
      const hash = word.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      vector[hash % 64] += 1;
    });

    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / magnitude);
  }
}

module.exports = OpenAIService;
