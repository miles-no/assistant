import { Terminal } from './services/terminal';
import { IrisEye } from './services/iris-eye';
import { LLMHealthService } from './services/llm-health';
import { ApiClient } from './services/api-client';
import { config } from './utils/config';

// Initialize IRIS when DOM is ready
let irisEye: IrisEye;
let llmHealth: LLMHealthService;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeIRIS);
} else {
  initializeIRIS();
}

function initializeIRIS(): void {
  try {
    // Initialize terminal and eye systems
    new Terminal();
    irisEye = new IrisEye();

    // Initialize LLM health monitoring
    const apiClient = new ApiClient(config.API_URL);
    llmHealth = new LLMHealthService(apiClient);

    // Connect health status to IRIS eye power state
    llmHealth.onStatusChange((status) => {
      const isPowered = status === 'connected';
      irisEye.setPowered(isPowered);
    });

    // Start health polling after a brief delay to let authentication happen
    setTimeout(() => {
      llmHealth.startPolling();
      console.log('✅ LLM Health monitoring started');
    }, 1000);

    // Make IRIS eye available globally for backward compatibility
    (window as any).IrisEye = irisEye;
    (window as any).LLMHealth = llmHealth;

    console.log('✅ IRIS TypeScript systems initialized');
  } catch (error) {
    console.error('❌ Failed to initialize IRIS:', error);
  }
}

// Export for potential use by other modules
export { Terminal, IrisEye, LLMHealthService };