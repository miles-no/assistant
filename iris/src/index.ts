import { ApiClient } from "./services/api-client";
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
		(window as any).IrisEye = irisEye;
		(window as any).LLMHealth = llmHealth;

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

// Export for potential use by other modules
export { Terminal, IrisEye, LLMHealthService };
