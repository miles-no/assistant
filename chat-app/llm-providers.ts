/**
 * LLM Provider Abstraction
 * Supports: Ollama (local), OpenAI (ChatGPT), Anthropic (Claude)
 */

import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import OpenAI from "openai";

interface Message {
	role: string;
	content: string;
}

interface ProviderInfo {
	name: string;
	type: string;
	error?: string;
}

/**
 * Base Provider Interface
 */
abstract class LLMProvider {
	abstract chat(messages: Message[], systemPrompt: string): Promise<string>;
	abstract getName(): string;
}

/**
 * Ollama Provider (Local LLM)
 */
class OllamaProvider extends LLMProvider {
	private url: string;
	private model: string;

	constructor() {
		super();
		this.url = process.env.OLLAMA_URL || "http://localhost:11434";
		this.model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
	}

	async chat(messages: Message[], systemPrompt: string): Promise<string> {
		const response = await axios.post(`${this.url}/api/chat`, {
			model: this.model,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				...messages,
			],
			stream: false,
		});

		return response.data.message.content;
	}

	getName(): string {
		return `Ollama (${this.model})`;
	}
}

/**
 * OpenAI Provider (ChatGPT)
 */
class OpenAIProvider extends LLMProvider {
	private client: OpenAI;
	private model: string;

	constructor() {
		super();
		const apiKey = process.env.OPENAI_API_KEY;
		this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";

		if (!apiKey) {
			throw new Error(
				"OPENAI_API_KEY environment variable is required when using OpenAI provider",
			);
		}

		this.client = new OpenAI({
			apiKey: apiKey,
		});
	}

	async chat(messages: Message[], systemPrompt: string): Promise<string> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
				...messages.map((msg) => ({
					role: msg.role as "system" | "user" | "assistant",
					content: msg.content,
				})),
			],
		});

		return response.choices[0].message.content || "";
	}

	getName(): string {
		return `OpenAI (${this.model})`;
	}
}

/**
 * Anthropic Provider (Claude)
 */
class AnthropicProvider extends LLMProvider {
	private client: Anthropic;
	private model: string;

	constructor() {
		super();
		const apiKey = process.env.ANTHROPIC_API_KEY;
		this.model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

		if (!apiKey) {
			throw new Error(
				"ANTHROPIC_API_KEY environment variable is required when using Anthropic provider",
			);
		}

		this.client = new Anthropic({
			apiKey: apiKey,
		});
	}

	async chat(messages: Message[], systemPrompt: string): Promise<string> {
		// Claude API expects messages without system in the array
		// System prompt is a separate parameter
		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 4096,
			system: systemPrompt,
			messages: messages.map((msg) => ({
				role: msg.role === "assistant" ? "assistant" : "user",
				content: msg.content,
			})),
		});

		const firstContent = response.content[0];
		return firstContent.type === "text" ? firstContent.text : "";
	}

	getName(): string {
		return `Anthropic (${this.model})`;
	}
}

/**
 * Get the configured LLM provider
 */
export function getProvider(): LLMProvider {
	const provider = process.env.LLM_PROVIDER || "ollama";

	switch (provider) {
		case "openai":
			return new OpenAIProvider();
		case "anthropic":
			return new AnthropicProvider();
		default:
			return new OllamaProvider();
	}
}

/**
 * Helper to format provider info for logging
 */
export function getProviderInfo(): ProviderInfo {
	try {
		const provider = getProvider();
		return {
			name: provider.getName(),
			type: process.env.LLM_PROVIDER || "ollama",
		};
	} catch (error) {
		return {
			name: "Error",
			type: "unknown",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}
