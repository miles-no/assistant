import type { MilesApiClient, User } from '../services/api-client';
import { handleApiError } from '../utils/errors';

/**
 * Base class for all command handlers
 */
export abstract class BaseCommandHandler {
  constructor(
    protected apiClient: MilesApiClient,
    protected currentUser: User,
    protected userTimezone: string
  ) {}

  /**
   * Execute the command
   */
  abstract execute(params?: Record<string, unknown>): Promise<void>;

  /**
   * Handle API errors with IRIS eye animation
   */
  protected handleError(error: unknown, operation: string): never {
    // Trigger error state in IRIS eye
    if (window.IrisEye) {
      window.IrisEye.setError();
    }

    throw handleApiError(error, operation);
  }

  /**
   * Format date for display in user's timezone
   */
  protected formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toISOString().substring(0, 16).replace('T', ' ');
  }

  /**
   * Format date with full timezone info
   */
  protected formatDateLocalized(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      timeZone: this.userTimezone,
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  /**
   * Add output to terminal
   */
  protected addOutput(text: string, className: string = 'system-output'): void {
    const output = document.getElementById('terminal-output');
    if (!output) return;

    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.textContent = text;
    output.appendChild(line);

    // Scroll to show the new message
    line.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Add markdown output to terminal
   */
  protected addMarkdownOutput(markdown: string, className: string = 'system-output'): void {
    const output = document.getElementById('terminal-output');
    if (!output) return;

    const container = document.createElement('div');
    container.className = `terminal-line markdown-content ${className}`;

    // Configure marked for terminal-like output
    if (window.marked) {
      window.marked.setOptions({
        breaks: true,
        gfm: true,
      });
      container.innerHTML = window.marked.parse(markdown);
    } else {
      container.textContent = markdown;
    }

    output.appendChild(container);

    // Scroll to show the new message
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Start thinking animation
   */
  protected startThinking(): void {
    // Trigger IRIS eye thinking state
    if (window.IrisEye) {
      window.IrisEye.setThinking();
    }

    document.getElementById('hal-status')!.textContent = 'PROCESSING...';

    // Add typing indicator
    const output = document.getElementById('terminal-output');
    if (!output) return;

    const indicator = document.createElement('div');
    indicator.className = 'terminal-line typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    output.appendChild(indicator);

    // Scroll to show the typing indicator
    indicator.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Stop thinking animation
   */
  protected stopThinking(): void {
    // Return IRIS eye to idle state
    if (window.IrisEye) {
      window.IrisEye.setIdle();
    }

    document.getElementById('hal-status')!.textContent = 'IRIS v1.0 - ONLINE';

    // Remove typing indicator
    const indicator = document.getElementById('typing-indicator');
    indicator?.remove();
  }
}

// Extend window interface for marked and IrisEye
declare global {
  interface Window {
    marked?: {
      setOptions(options: { breaks: boolean; gfm: boolean }): void;
      parse(markdown: string): string;
    };
    IrisEye?: {
      setIdle(): void;
      setThinking(): void;
      setAlert(): void;
      setError(): void;
      setDepth(depth: number): void;
    };
  }
}