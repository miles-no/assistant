import type { MilesApiClient } from "./api-client";

export interface LLMIntent {
	action:
		| "getRooms"
		| "getBookings"
		| "checkAvailability"
		| "cancelBooking"
		| "bulkCancel"
		| "createBooking"
		| "findRooms" // Complex room search with filtering
		| "needsMoreInfo"
		| "undo"
		| "unknown";
	params?: {
		roomId?: string;
		roomName?: string;
		startTime?: string;
		endTime?: string;
		duration?: number;
		title?: string;
		bookingId?: string;
		filter?: "all" | "today" | "tomorrow" | "week";
		capacity?: number; // Minimum capacity requirement
		amenities?: string; // Required amenities (e.g., "TV", "projector")
		location?: string; // Location filter (e.g., "stavanger", "haugesund")
		missingFields?: string[];
	};
	response?: string;
}

export interface IntentRequest {
	command: string;
	userId: string;
	timezone?: string;
}

export interface IntentResponse {
	action: string;
	params?: Record<string, unknown>;
	response?: string;
}

/**
 * LLM Service for natural language processing
 * Integrates with the IRIS server's intent parsing endpoint
 */
export class LLMService {
	private baseUrl: string;
	private apiClient: MilesApiClient;

	constructor(apiClient: MilesApiClient, baseUrl: string) {
		this.baseUrl = baseUrl;
		this.apiClient = apiClient;
	}

	/**
	 * Parse user command into structured intent using LLM
	 */
	async parseIntent(
		command: string,
		userId: string,
		timezone?: string,
	): Promise<LLMIntent> {
		try {
			const response = await fetch(`${this.getBaseUrl()}/api/parse-intent`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.getAuthToken()}`,
				},
				body: JSON.stringify({
					command,
					userId,
					timezone,
				} as IntentRequest),
			});

			if (!response.ok) {
				throw new Error(
					`LLM service unavailable: ${response.status} ${response.statusText}`,
				);
			}

			const data: IntentResponse = await response.json();

			// Map response to our LLMIntent interface
			return {
				action: data.action as LLMIntent["action"],
				params: data.params,
				response: data.response,
			};
		} catch (error) {
			console.warn("LLM service failed:", error);
			throw error; // Let caller handle fallback
		}
	}

	/**
	 * Check if LLM service is available
	 */
	async isAvailable(): Promise<boolean> {
		try {
			const response = await fetch(`${this.getBaseUrl()}/health`, {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});
			return response.ok;
		} catch (_error) {
			return false;
		}
	}

	/**
	 * Get auth token from API client
	 */
	private getAuthToken(): string {
		return this.apiClient.getAuthToken() || "";
	}

	/**
	 * Get base URL for LLM endpoint
	 */
	private getBaseUrl(): string {
		// Use the IRIS server URL (port 3002) for LLM intent endpoint
		const baseUrl = this.baseUrl;
		if (baseUrl.includes(":3000")) {
			return baseUrl.replace(":3000", ":3002");
		}
		// If API URL doesn't specify port 3000, assume IRIS server is on 3002
		return "http://localhost:3002";
	}
}
