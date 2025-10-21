import { ApiClient } from './api-client';

export type LLMHealthStatus = 'connected' | 'disconnected';

export class LLMHealthService {
  private apiClient: ApiClient;
  private status: LLMHealthStatus = 'disconnected';
  private pollingInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(status: LLMHealthStatus) => void> = [];
  private readonly POLL_INTERVAL_MS = 5000; // 5 seconds

  constructor(apiClient: ApiClient) {
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
      const response = await this.apiClient.health();
      const newStatus: LLMHealthStatus =
        response.status === 'operational' ? 'connected' : 'disconnected';

      this.updateStatus(newStatus);
    } catch (error) {
      // Connection failed, mark as disconnected
      this.updateStatus('disconnected');
    }
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
    this.listeners.forEach(listener => listener(this.status));
  }

  /**
   * Get current status
   */
  getStatus(): LLMHealthStatus {
    return this.status;
  }
}
