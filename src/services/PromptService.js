const { buildIntentPrompt } = require('../prompts/intentPrompt');
const { buildResponsePrompt } = require('../prompts/responsePrompt');
const { SYSTEM_PROMPT } = require('../prompts/systemPrompt');

/**
 * PromptService — assembles reusable prompt templates with runtime context.
 */
class PromptService {
  getSystemPrompt() {
    return SYSTEM_PROMPT;
  }

  buildIntentPrompt(customerMessage) {
    return buildIntentPrompt(customerMessage);
  }

  buildResponsePrompt(context) {
    return buildResponsePrompt(context);
  }

  /**
   * Format RAG policy chunks into a single context block.
   */
  formatPolicyContext(chunks) {
    if (!chunks || chunks.length === 0) {
      return 'No specific policy documents found.';
    }

    return chunks
      .map((chunk, i) => `[Policy ${i + 1}: ${chunk.title}]\n${chunk.content}`)
      .join('\n\n');
  }
}

module.exports = PromptService;
