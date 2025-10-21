/**
 * LLM Provider Abstraction
 * Supports: Ollama (local), OpenAI (ChatGPT), Anthropic (Claude)
 */

import Anthropic from "@anthropic-ai/sdk";
import axios from "axios";
import OpenAI from "openai";

// Types
export interface LLMMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface LLMResponse {
	content: string;
}

export interface LLMProvider {
	model: string;
	chat(messages: LLMMessage[]): Promise<LLMResponse>;
	getName(): string;
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
 * Base Provider Class
 */
abstract class BaseLLMProvider implements LLMProvider {
	abstract model: string;
	abstract chat(messages: LLMMessage[]): Promise<LLMResponse>;
	abstract getName(): string;
}

/**
 * Ollama Provider (Local LLM)
 */
class OllamaProvider extends BaseLLMProvider {
	public model: string;
	private url: string;

	constructor() {
		super();
		this.url = process.env.OLLAMA_URL || "http://localhost:11434";
		this.model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
	}

	async chat(messages: LLMMessage[]): Promise<LLMResponse> {
		const response = await axios.post<{
			message: { content: string };
		}>(`${this.url}/api/chat`, {
			model: this.model,
			messages: messages,
			stream: false,
		});

		return { content: response.data.message.content };
	}

	getName(): string {
		return `Ollama (${this.model})`;
	}
}

/**
 * OpenAI Provider (ChatGPT)
 */
class OpenAIProvider extends BaseLLMProvider {
	public model: string;
	private client: OpenAI;

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

	async chat(messages: LLMMessage[]): Promise<LLMResponse> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			messages: messages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			})),
		});

		const content = response.choices[0].message.content;
		if (!content) {
			throw new Error("No content in OpenAI response");
		}

		return { content };
	}

	getName(): string {
		return `OpenAI (${this.model})`;
	}
}

/**
 * Anthropic Provider (Claude)
 */
class AnthropicProvider extends BaseLLMProvider {
	public model: string;
	private client: Anthropic;

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

	async chat(messages: LLMMessage[]): Promise<LLMResponse> {
		// Claude API expects messages without system in the array
		// System prompt is a separate parameter
		const systemMessage = messages.find((m) => m.role === "system");
		const nonSystemMessages = messages.filter((m) => m.role !== "system");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 4096,
			system: systemMessage?.content || "",
			messages: nonSystemMessages.map((msg) => ({
				role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
				content: msg.content,
			})),
		});

		const content = response.content[0];
		if (content.type !== "text") {
			throw new Error("Unexpected content type from Claude");
		}

		return { content: content.text };
	}

	getName(): string {
		return `Anthropic (${this.model})`;
	}
}

/**
 * Helper to format provider info for logging
 */
export function getProviderInfo(): {
	name: string;
	type: string;
	error?: string;
} {
	try {
		const provider = getProvider();
		return {
			name: provider.getName(),
			type: process.env.LLM_PROVIDER || "ollama",
		};
	} catch (error) {
		const err = error as Error;
		return {
			name: "Error",
			type: "unknown",
			error: err.message,
		};
	}
}
