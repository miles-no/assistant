import { config } from "../utils/config";
import type { MilesApiClient } from "./api-client";

export type LLMHealthStatus = "connected" | "disconnected";

export class LLMHealthService {
	private apiClient: MilesApiClient;
	private status: LLMHealthStatus = "disconnected";
	private pollingInterval: NodeJS.Timeout | null = null;
	private listeners: Array<(status: LLMHealthStatus) => void> = [];
	private readonly POLL_INTERVAL_MS = 5000; // 5 seconds

	constructor(apiClient: MilesApiClient) {
		this.apiClient = apiClient;
	}

	/**
	 * Start periodic health checks
	 */
	startPolling(): void {
		if (this.pollingInterval) {
			return; // Already polling
		}

		// Check immediately on start
		this.checkHealth();

		// Then check every 5 seconds
		this.pollingInterval = setInterval(() => {
			this.checkHealth();
		}, this.POLL_INTERVAL_MS);
	}

	/**
	 * Stop periodic health checks
	 */
	stopPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
		}
	}

	/**
	 * Check LLM health and update status
	 */
	private async checkHealth(): Promise<void> {
		try {
			// Check both API health and LLM intent endpoint
			const [apiResponse, llmResponse] = await Promise.allSettled([
				this.apiClient.health(),
				this.checkLLMEndpoint(),
			]);

			const apiHealthy =
				apiResponse.status === "fulfilled" && apiResponse.value.status === "ok";
			const llmHealthy = llmResponse.status === "fulfilled";

			const newStatus: LLMHealthStatus =
				apiHealthy && llmHealthy ? "connected" : "disconnected";

			this.updateStatus(newStatus);
		} catch (_error) {
			// Connection failed, mark as disconnected
			this.updateStatus("disconnected");
		}
	}

	/**
	 * Check if LLM intent endpoint is responding
	 */
	private async checkLLMEndpoint(): Promise<boolean> {
		try {
			const authToken = this.getAuthToken();
			if (!authToken) {
				// No auth token available yet (user not logged in)
				return false;
			}

			const response = await fetch(`${this.getBaseUrl()}/api/intent`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
				body: JSON.stringify({
					command: "health_check",
					userId: "system",
				}),
			});
			return response.ok;
		} catch (_error) {
			return false;
		}
	}

	/**
	 * Get auth token from localStorage
	 */
	private getAuthToken(): string | null {
		return localStorage.getItem("irisAuthToken");
	}

	/**
	 * Get base URL for LLM endpoint
	 */
	private getBaseUrl(): string {
		// Use the IRIS server URL (port 3002) for LLM intent endpoint
		const baseUrl = config.API_URL;
		if (baseUrl.includes(":3000")) {
			return baseUrl.replace(":3000", ":3002");
		}
		// If API URL doesn't specify port 3000, assume IRIS server is on 3002
		return "http://localhost:3002";
	}

	/**
	 * Update status and notify listeners if changed
	 */
	private updateStatus(newStatus: LLMHealthStatus): void {
		if (this.status !== newStatus) {
			this.status = newStatus;
			this.notifyListeners();
		}
	}

	/**
	 * Register a listener for status changes
	 */
	onStatusChange(listener: (status: LLMHealthStatus) => void): void {
		this.listeners.push(listener);
		// Immediately notify with current status
		listener(this.status);
	}

	/**
	 * Notify all listeners of status change
	 */
	private notifyListeners(): void {
		for (const listener of this.listeners) {
			listener(this.status);
		}
	}

	/**
	 * Get current status
	 */
	getStatus(): LLMHealthStatus {
		return this.status;
	}
}
