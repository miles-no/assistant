import { ApiClient, type MilesApiClient } from "./services/api-client";
import { IrisEye } from "./services/iris-eye";
import { LLMHealthService } from "./services/llm-health";
import { Terminal } from "./services/terminal";
import { config } from "./utils/config";

// Initialize IRIS when DOM is ready
let irisEye: IrisEye;
let llmHealth: LLMHealthService;

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initializeIRIS);
} else {
	initializeIRIS();
}

function initializeIRIS(): void {
	try {
		// Initialize IrisEye and LLMHealth FIRST, before Terminal
		irisEye = new IrisEye();

		// Initialize LLM health monitoring
		const apiClient = new ApiClient(config.API_URL);
		llmHealth = new LLMHealthService(apiClient);

		// Make IRIS eye and LLM health available globally BEFORE Terminal initialization
		window.IrisEye = irisEye;
		window.LLMHealth = llmHealth;

		// Initialize system status checker
		initializeSystemStatus(apiClient);

		// NOW initialize terminal (it needs IrisEye and LLMHealth to be available)
		new Terminal();

		// LLM health monitoring (status indicator handled in Terminal class)

		// Start health polling after a brief delay to let authentication happen
		setTimeout(() => {
			llmHealth.startPolling();
			console.log("✅ LLM Health monitoring started");
		}, 1000);

		console.log("✅ IRIS TypeScript systems initialized");
	} catch (error) {
		console.error("❌ Failed to initialize IRIS:", error);
	}
}

/**
 * Initialize system status checker for login screen
 */
function initializeSystemStatus(apiClient: MilesApiClient): void {
	const statusIndicator = document.getElementById("status-indicator");
	const statusText = document.getElementById("status-text");

	if (!statusIndicator || !statusText) return;

	// Initial status
	statusIndicator.textContent = "⟳";
	statusText.textContent = "Checking system status...";
	statusIndicator.className = "status-indicator checking";

	// Check API connectivity
	checkSystemStatus(apiClient, statusIndicator, statusText);

	// Re-check every 30 seconds
	setInterval(() => {
		checkSystemStatus(apiClient, statusIndicator, statusText);
	}, 30000);
}

/**
 * Check system connectivity and update status indicator
 */
async function checkSystemStatus(
	apiClient: MilesApiClient,
	statusIndicator: HTMLElement,
	statusText: HTMLElement,
): Promise<void> {
	try {
		// Try to reach the health endpoint
		await apiClient.health();

		// Success
		statusIndicator.textContent = "✓";
		statusText.textContent = "System online";
		statusIndicator.className = "status-indicator connected";
	} catch (error) {
		// Connection failed
		statusIndicator.textContent = "✗";
		statusText.textContent = "Cannot connect to system";
		statusIndicator.className = "status-indicator disconnected";
		console.warn("System connectivity check failed:", error);
	}
}

// Export for potential use by other modules
export { Terminal, IrisEye, LLMHealthService };
