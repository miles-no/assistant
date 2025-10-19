/**
 * LLM Provider Abstraction
 * Supports: Ollama (local), OpenAI (ChatGPT), Anthropic (Claude)
 */

const axios = require('axios');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk').default;

/**
 * Get the configured LLM provider
 */
function getProvider() {
  const provider = process.env.LLM_PROVIDER || 'ollama';

  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'ollama':
    default:
      return new OllamaProvider();
  }
}

/**
 * Base Provider Interface
 */
class LLMProvider {
  async chat(messages, systemPrompt) {
    throw new Error('Not implemented');
  }

  getName() {
    throw new Error('Not implemented');
  }
}

/**
 * Ollama Provider (Local LLM)
 */
class OllamaProvider extends LLMProvider {
  constructor() {
    super();
    this.url = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
  }

  async chat(messages, systemPrompt) {
    const response = await axios.post(`${this.url}/api/chat`, {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      stream: false,
    });

    return response.data.message.content;
  }

  getName() {
    return `Ollama (${this.model})`;
  }
}

/**
 * OpenAI Provider (ChatGPT)
 */
class OpenAIProvider extends LLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI provider');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async chat(messages, systemPrompt) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
    });

    return response.choices[0].message.content;
  }

  getName() {
    return `OpenAI (${this.model})`;
  }
}

/**
 * Anthropic Provider (Claude)
 */
class AnthropicProvider extends LLMProvider {
  constructor() {
    super();
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required when using Anthropic provider');
    }

    this.client = new Anthropic({
      apiKey: this.apiKey,
    });
  }

  async chat(messages, systemPrompt) {
    // Claude API expects messages without system in the array
    // System prompt is a separate parameter
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    });

    return response.content[0].text;
  }

  getName() {
    return `Anthropic (${this.model})`;
  }
}

/**
 * Helper to format provider info for logging
 */
function getProviderInfo() {
  try {
    const provider = getProvider();
    return {
      name: provider.getName(),
      type: process.env.LLM_PROVIDER || 'ollama',
    };
  } catch (error) {
    return {
      name: 'Error',
      type: 'unknown',
      error: error.message,
    };
  }
}

module.exports = {
  getProvider,
  getProviderInfo,
};
