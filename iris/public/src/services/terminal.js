import { MilesApiClient } from './api-client';
import { IrisEye } from './iris-eye';
import { config } from '../utils/config';
import { getErrorMessage } from '../utils/errors';
import { RoomsCommandHandler } from '../commands/rooms-handler';
import { BookingsCommandHandler } from '../commands/bookings-handler';
import { CancelCommandHandler } from '../commands/cancel-handler';
export class Terminal {
    constructor() {
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentSuggestions = [];
        this.suggestionIndex = -1;
        this.apiClient = new MilesApiClient(config.API_URL);
        this.irisEye = new IrisEye();
        this.state = {
            authToken: localStorage.getItem('irisAuthToken') || null,
            currentUser: this.parseStoredUser(),
            commandHistory: [],
            historyIndex: -1,
            userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            lastBulkOperation: null,
        };
        this.autocompleteCache = {
            rooms: null,
            bookings: null,
            lastFetch: 0,
        };
        this.initialize();
    }
    parseStoredUser() {
        try {
            const userJson = localStorage.getItem('irisUser');
            return userJson ? JSON.parse(userJson) : null;
        }
        catch {
            return null;
        }
    }
    initialize() {
        if (this.state.currentUser && this.state.authToken) {
            this.apiClient.setAuthToken(this.state.authToken);
            this.showTerminal();
        }
        else {
            this.showLogin();
        }
        this.setupEventListeners();
    }
    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout-btn');
        const terminalInput = document.getElementById('terminal-input');
        loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        logoutBtn?.addEventListener('click', () => this.handleLogout());
        terminalInput?.addEventListener('keydown', (e) => this.handleKeyDown(e));
        terminalInput?.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    showLogin() {
        const loginScreen = document.getElementById('login-screen');
        const terminal = document.getElementById('terminal');
        if (loginScreen)
            loginScreen.style.display = 'flex';
        if (terminal)
            terminal.style.display = 'none';
        const emailInput = document.getElementById('email');
        emailInput?.focus();
    }
    showTerminal() {
        const loginScreen = document.getElementById('login-screen');
        const terminal = document.getElementById('terminal');
        if (loginScreen)
            loginScreen.style.display = 'none';
        if (terminal)
            terminal.style.display = 'flex';
        if (this.state.currentUser) {
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                userInfo.textContent = `${this.state.currentUser.firstName} ${this.state.currentUser.lastName} | ${this.state.currentUser.role}`;
            }
        }
        const output = document.getElementById('terminal-output');
        if (output && output.children.length === 0) {
            this.typeWelcomeMessage();
        }
        const terminalInput = document.getElementById('terminal-input');
        terminalInput?.focus();
    }
    async handleLogin(e) {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const errorDiv = document.getElementById('login-error');
        const email = emailInput.value;
        const password = passwordInput.value;
        this.irisEye.setThinking();
        try {
            const result = await this.apiClient.login({ email, password });
            this.state.authToken = result.token || null;
            this.state.currentUser = result.user || null;
            if (result.token) {
                this.apiClient.setAuthToken(result.token);
                localStorage.setItem('irisAuthToken', result.token);
            }
            if (result.user) {
                localStorage.setItem('irisUser', JSON.stringify(result.user));
            }
            if (errorDiv) {
                errorDiv.classList.remove('show');
                errorDiv.textContent = '';
            }
            this.irisEye.setIdle();
            this.showTerminal();
        }
        catch (error) {
            this.irisEye.setIdle();
            console.error('Login error:', error);
            const message = getErrorMessage(error);
            if (errorDiv) {
                errorDiv.textContent = `ERROR: ${message}`;
                errorDiv.classList.add('show');
            }
        }
    }
    handleLogout() {
        this.state.authToken = null;
        this.state.currentUser = null;
        localStorage.removeItem('irisAuthToken');
        localStorage.removeItem('irisUser');
        const output = document.getElementById('terminal-output');
        if (output)
            output.innerHTML = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.showLogin();
    }
    typeWelcomeMessage() {
        if (!this.state.currentUser)
            return;
        const welcome = [
            '═══════════════════════════════════════════════════════════',
            '  ██╗██████╗ ██╗███████╗',
            '  ██║██╔══██╗██║██╔════╝',
            '  ██║██████╔╝██║███████╗',
            '  ██║██╔══██╗██║╚════██║',
            '  ██║██║  ██║██║███████║',
            '  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝',
            '',
            '  IRIS TERMINAL INTERFACE v1.0',
            '  SYSTEM INITIALIZED',
            '',
            '═══════════════════════════════════════════════════════════',
            '',
            `User authenticated: ${this.state.currentUser.firstName} ${this.state.currentUser.lastName}`,
            `Access level: ${this.state.currentUser.role}`,
            '',
            'All system functions are now operational.',
            'Enter commands. Type "help" for available operations.',
            '',
        ];
        welcome.forEach((line, index) => {
            setTimeout(() => {
                this.addOutput(line, 'system-output');
            }, index * 50);
        });
    }
    handleKeyDown(e) {
        const input = e.target;
        if (e.key === 'Enter') {
            e.preventDefault();
            const command = input.value.trim();
            if (command) {
                this.processCommand(command);
                input.value = '';
                this.historyIndex = -1;
            }
        }
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.commandHistory.length > 0) {
                if (this.historyIndex === -1) {
                    this.historyIndex = this.commandHistory.length - 1;
                }
                else if (this.historyIndex > 0) {
                    this.historyIndex--;
                }
                input.value = this.commandHistory[this.historyIndex];
            }
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex !== -1) {
                if (this.historyIndex < this.commandHistory.length - 1) {
                    this.historyIndex++;
                    input.value = this.commandHistory[this.historyIndex];
                }
                else {
                    this.historyIndex = -1;
                    input.value = '';
                }
            }
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabComplete(input);
        }
    }
    handleKeyUp(e) {
        if (e.key !== 'Tab') {
            this.currentSuggestions = [];
            this.suggestionIndex = -1;
        }
    }
    async handleTabComplete(input) {
        const text = input.value;
        const parts = text.trim().split(/\s+/);
        if (this.currentSuggestions.length > 0) {
            this.suggestionIndex = (this.suggestionIndex + 1) % this.currentSuggestions.length;
            const suggestion = this.currentSuggestions[this.suggestionIndex];
            input.value = suggestion.completion;
            return;
        }
        if (parts.length === 1) {
            const commands = ['rooms', 'bookings', 'cancel', 'help', 'status', 'about', 'clear'];
            this.currentSuggestions = commands
                .filter(cmd => cmd.startsWith(parts[0].toLowerCase()))
                .map(cmd => ({ completion: cmd, description: '' }));
        }
        else if (parts[0].toLowerCase() === 'cancel' && parts.length === 2) {
            await this.fetchBookingsForAutocomplete();
            if (this.autocompleteCache.bookings) {
                this.currentSuggestions = this.autocompleteCache.bookings
                    .filter(b => b.id?.startsWith(parts[1]))
                    .map(b => ({
                    completion: `cancel ${b.id}`,
                    description: `${b.title} (${this.formatDate(b.startTime)})`,
                }));
            }
        }
        if (this.currentSuggestions.length > 0) {
            this.suggestionIndex = 0;
            input.value = this.currentSuggestions[0].completion;
            if (this.currentSuggestions[0].description) {
                this.showAutocompleteSuggestion(this.currentSuggestions[0].description);
            }
        }
    }
    showAutocompleteSuggestion(description) {
        const output = document.getElementById('terminal-output');
        if (!output)
            return;
        const hint = document.createElement('div');
        hint.className = 'terminal-line system-output';
        hint.textContent = `  → ${description}`;
        hint.id = 'autocomplete-hint';
        output.appendChild(hint);
        setTimeout(() => hint.remove(), 2000);
    }
    async fetchBookingsForAutocomplete() {
        const now = Date.now();
        if (this.autocompleteCache.bookings && (now - this.autocompleteCache.lastFetch) < 30000) {
            return;
        }
        try {
            const data = await this.apiClient.getBookings();
            this.autocompleteCache.bookings = Array.isArray(data.bookings)
                ? data.bookings.filter(b => b.status !== 'CANCELLED')
                : [];
            this.autocompleteCache.lastFetch = now;
        }
        catch (error) {
            console.error('Autocomplete fetch failed:', error);
        }
    }
    async processCommand(command) {
        this.commandHistory.push(command);
        this.state.commandHistory = this.commandHistory;
        this.addOutput(`> ${command}`, 'user-input');
        this.irisEye.setAlert();
        this.startThinking();
        const cmd = command.toLowerCase().trim();
        const parts = command.trim().split(/\s+/);
        const mainCmd = parts[0].toLowerCase();
        if (cmd === 'help') {
            this.stopThinking();
            this.showHelp();
            return;
        }
        if (cmd === 'clear' || cmd === 'cls') {
            this.stopThinking();
            const output = document.getElementById('terminal-output');
            if (output)
                output.innerHTML = '';
            return;
        }
        if (cmd.startsWith('echo ')) {
            this.stopThinking();
            this.addOutput(command.substring(5), 'system-output');
            return;
        }
        if (cmd === 'status') {
            this.stopThinking();
            this.showStatus();
            return;
        }
        if (cmd === 'about' || cmd === 'info') {
            this.stopThinking();
            this.showAbout();
            return;
        }
        if (cmd === 'demo' || cmd === 'showtime') {
            this.stopThinking();
            this.startDemoMode();
            return;
        }
        if (cmd === 'stop') {
            this.stopThinking();
            this.stopDemoMode();
            return;
        }
        if (mainCmd === 'rooms') {
            await this.handleRoomsCommand();
            return;
        }
        if (mainCmd === 'bookings' || mainCmd === 'list') {
            await this.handleBookingsCommand();
            return;
        }
        if (mainCmd === 'cancel') {
            await this.handleCancelCommand(parts);
            return;
        }
        this.stopThinking();
        this.addOutput('[ERROR] Command not recognized. Type "help" for available commands.', 'error');
    }
    async handleRoomsCommand() {
        if (!this.state.currentUser)
            return;
        const handler = new RoomsCommandHandler(this.apiClient, this.state.currentUser, this.state.userTimezone);
        await handler.execute();
    }
    async handleBookingsCommand() {
        if (!this.state.currentUser)
            return;
        const handler = new BookingsCommandHandler(this.apiClient, this.state.currentUser, this.state.userTimezone);
        await handler.execute();
    }
    async handleCancelCommand(parts) {
        if (!this.state.currentUser)
            return;
        const handler = new CancelCommandHandler(this.apiClient, this.state.currentUser, this.state.userTimezone);
        await handler.execute({ bookingId: parts[1] });
    }
    showHelp() {
        const markdown = `
# COMMAND REFERENCE

## DATA QUERIES

▸ **rooms** - Display all rooms
▸ **bookings** - Display active bookings
▸ **cancel** \`<id>\` - Cancel booking by ID

## SYSTEM

▸ **help** - Display this reference
▸ **clear, cls** - Clear terminal buffer
▸ **status** - System diagnostic
▸ **about** - System information

## DEMO

▸ **demo** - Start animation showcase
▸ **stop** - Stop demo mode
`;
        this.addMarkdownOutput(markdown, 'system-output');
    }
    showStatus() {
        if (!this.state.currentUser)
            return;
        const markdown = `
## SYSTEM STATUS

**System:** IRIS v1.0
**User:** ${this.state.currentUser.firstName} ${this.state.currentUser.lastName}
**Role:** ${this.state.currentUser.role}
**Connected:** ${new Date().toLocaleString()}
**Backend:** ${config.API_URL}
`;
        this.addMarkdownOutput(markdown, 'system-output');
    }
    showAbout() {
        const markdown = `
# IRIS
**Intelligent Room Interface System**

Version 1.0.0

---

**Architecture:** HAL-9000 derived neural framework
**Purpose:** Workspace resource allocation and management
**Status:** Fully operational

---

This system is designed to process booking operations with maximum efficiency and minimum human oversight.
`;
        this.addMarkdownOutput(markdown, 'system-output');
    }
    startDemoMode() {
        this.addOutput('[DEMO MODE] Animation showcase not yet implemented in TypeScript version', 'system-output');
    }
    stopDemoMode() {
        this.addOutput('[DEMO MODE] Not running', 'system-output');
    }
    formatDate(dateStr) {
        if (!dateStr)
            return 'N/A';
        const date = new Date(dateStr);
        return date.toISOString().substring(0, 16).replace('T', ' ');
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
        this.irisEye.setThinking();
        const status = document.getElementById('hal-status');
        if (status)
            status.textContent = 'PROCESSING...';
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
        this.irisEye.setIdle();
        const status = document.getElementById('hal-status');
        if (status)
            status.textContent = 'IRIS v1.0 - ONLINE';
        const indicator = document.getElementById('typing-indicator');
        if (indicator)
            indicator.remove();
    }
}
