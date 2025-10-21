import { handleApiError } from '../utils/errors';
export class BaseCommandHandler {
    constructor(apiClient, currentUser, userTimezone) {
        this.apiClient = apiClient;
        this.currentUser = currentUser;
        this.userTimezone = userTimezone;
    }
    handleError(error, operation) {
        if (window.IrisEye) {
            window.IrisEye.setError();
        }
        throw handleApiError(error, operation);
    }
    formatDate(dateStr) {
        if (!dateStr)
            return 'N/A';
        const date = new Date(dateStr);
        return date.toISOString().substring(0, 16).replace('T', ' ');
    }
    formatDateLocalized(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            timeZone: this.userTimezone,
            dateStyle: 'short',
            timeStyle: 'short',
        });
    }
    addOutput(text, className = 'system-output') {
        const output = document.getElementById('terminal-output');
        if (!output)
            return;
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.textContent = text;
        output.appendChild(line);
        line.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    addMarkdownOutput(markdown, className = 'system-output') {
        const output = document.getElementById('terminal-output');
        if (!output)
            return;
        const container = document.createElement('div');
        container.className = `terminal-line markdown-content ${className}`;
        if (window.marked) {
            window.marked.setOptions({
                breaks: true,
                gfm: true,
            });
            container.innerHTML = window.marked.parse(markdown);
        }
        else {
            container.textContent = markdown;
        }
        output.appendChild(container);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    startThinking() {
        if (window.IrisEye) {
            window.IrisEye.setThinking();
        }
        document.getElementById('hal-status').textContent = 'PROCESSING...';
        const output = document.getElementById('terminal-output');
        if (!output)
            return;
        const indicator = document.createElement('div');
        indicator.className = 'terminal-line typing-indicator';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
        output.appendChild(indicator);
        indicator.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    stopThinking() {
        if (window.IrisEye) {
            window.IrisEye.setIdle();
        }
        document.getElementById('hal-status').textContent = 'IRIS v1.0 - ONLINE';
        const indicator = document.getElementById('typing-indicator');
        indicator?.remove();
    }
}
