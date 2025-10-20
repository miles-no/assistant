/**
 * LLM Provider Abstraction
 * Supports: Ollama (local), OpenAI (ChatGPT), Anthropic (Claude)
 */

import axios from 'axios';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

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
  async chat(messages) {
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

  async chat(messages) {
    const response = await axios.post(`${this.url}/api/chat`, {
      model: this.model,
      messages: messages,
      stream: false,
    });

    return { content: response.data.message.content };
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

  async chat(messages) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    return { content: response.choices[0].message.content };
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

  async chat(messages) {
    // Claude API expects messages without system in the array
    // System prompt is a separate parameter
    const systemMessage = messages.find(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemMessage?.content || '',
      messages: nonSystemMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
    });

    return { content: response.content[0].text };
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

export {
  getProvider,
  getProviderInfo,
};
