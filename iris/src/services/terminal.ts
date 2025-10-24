import type {
	AutocompleteCache,
	AutocompleteSuggestion,
} from "../types/terminal";
import { config } from "../utils/config";
import { getErrorMessage } from "../utils/errors";
import {
	NaturalLanguageProcessor,
	type ParsedIntent,
} from "../utils/natural-language";
import { MilesApiClient } from "./api-client";
import { CommandProcessor } from "./command-processor";
import { EasterEggs } from "./easter-eggs";
import type { IrisEye } from "./iris-eye";
import type { LLMHealthService } from "./llm-health";
import { LLMService } from "./llm-service";
import { TerminalStateManager } from "./terminal-state-manager";

/**
 * IRIS Terminal - Main command processing and UI management
 */
export class Terminal {
	private apiClient: MilesApiClient;
	private irisEye: IrisEye;
	private nlpProcessor: NaturalLanguageProcessor;
	private llmService: LLMService;
	private llmHealth: LLMHealthService;
	private commandProcessor: CommandProcessor;
	private terminalStateManager: TerminalStateManager;
	private easterEggs: EasterEggs;
	private autocompleteCache: AutocompleteCache;

	private commandHistory: string[] = [];
	private historyIndex = -1;
	private currentSuggestions: AutocompleteSuggestion[] = [];
	private suggestionIndex = -1;
	private demoInterval: NodeJS.Timeout | null = null;

	constructor() {
		this.apiClient = new MilesApiClient(config.API_URL);
		// Use global IrisEye instance (created in index.ts)
		this.irisEye = window.IrisEye;
		this.nlpProcessor = new NaturalLanguageProcessor();
		this.llmService = new LLMService(this.apiClient, config.API_URL);
		// Use global LLMHealth instance (created in index.ts)
		this.llmHealth = window.LLMHealth;

		// Initialize Terminal State Manager
		this.terminalStateManager = new TerminalStateManager();

		// Set up state change listener
		this.terminalStateManager.subscribe((state, context) => {
			this.onStateChange(state, context);
		});

		// Initialize command history and autocomplete (not managed by state machine)
		this.commandHistory = [];
		this.historyIndex = -1;

		this.autocompleteCache = {
			rooms: null,
			bookings: null,
			lastFetch: 0,
		};

		// Initialize Easter Eggs system
		this.easterEggs = new EasterEggs(
			this.irisEye,
			(msg, cssClass) => this.addOutput(msg, cssClass),
			(markdown, cssClass) => this.addMarkdownOutput(markdown, cssClass),
		);

		// Initialize Command Processor with XState
		this.commandProcessor = new CommandProcessor(
			this.apiClient,
			this.irisEye,
			this.llmHealth,
			Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
			this.nlpProcessor,
			this.llmService,
			this.easterEggs,
		);

		// Update CommandProcessor with initial settings
		const initialSettings = this.terminalStateManager.getSettings();
		this.commandProcessor.updateSettings(initialSettings);

		// Update CommandProcessor with initial LLM health
		if (this.llmHealth) {
			const llmHealthStatus = this.llmHealth.getStatus();
			this.commandProcessor.updateLLMHealth(llmHealthStatus);
		}

		// Set up CommandProcessor output callbacks
		this.commandProcessor.setOutputCallbacks(
			(msg, cssClass) => this.addOutput(msg, cssClass),
			(markdown, cssClass) => this.addMarkdownOutput(markdown, cssClass),
		);

		// Monitor LLM health for fallback decisions and status indicator
		if (this.llmHealth) {
			this.llmHealth.onStatusChange((status) => {
				console.log(`LLM status: ${status}`);
				this.updateLLMStatusIndicator(status);
				// Update CommandProcessor with LLM health status
				this.commandProcessor.updateLLMHealth(status);
				// Update TerminalStateManager
				this.terminalStateManager.updateLLMHealth(status);
			});
		}

		this.initialize();
	}

	private showSettings(): void {
		const settings = this.terminalStateManager.getSettings();
		const nlpStatus = settings.useSimpleNLP ? "ON" : "OFF";
		const llmStatus = settings.useLLM ? "ON" : "OFF";

		const markdown = `
## CURRENT SETTINGS

**Simple NLP (Pattern Matching):** ${nlpStatus}
**LLM Parsing (AI-Powered):** ${llmStatus}

### USAGE

▸ \`settings nlp on\` - Enable simple NLP
▸ \`settings nlp off\` - Disable simple NLP
▸ \`settings llm on\` - Enable LLM parsing
▸ \`settings llm off\` - Disable LLM parsing

**Note:** At least one method must be enabled.
`;

		this.addMarkdownOutput(markdown, "system-output");
	}

	private handleSettingsCommand(parts: string[]): void {
		// settings [nlp|llm] [on|off]
		if (parts.length === 1) {
			// Just "settings" - show current settings
			this.showSettings();
			return;
		}

		if (parts.length !== 3) {
			this.addOutput("[ERROR] Usage: settings [nlp|llm] [on|off]", "error");
			return;
		}

		const setting = parts[1].toLowerCase();
		const value = parts[2].toLowerCase();

		if (!["nlp", "llm"].includes(setting)) {
			this.addOutput("[ERROR] Invalid setting. Use 'nlp' or 'llm'", "error");
			return;
		}

		if (!["on", "off"].includes(value)) {
			this.addOutput("[ERROR] Invalid value. Use 'on' or 'off'", "error");
			return;
		}

		const enable = value === "on";

		// Get current settings
		const currentSettings = this.terminalStateManager.getSettings();

		// Create updated settings
		const updatedSettings = {
			...currentSettings,
			[setting === "nlp" ? "useSimpleNLP" : "useLLM"]: enable,
		};

		// Check if both are disabled
		if (!updatedSettings.useSimpleNLP && !updatedSettings.useLLM) {
			this.addOutput(
				"[ERROR] Cannot disable both NLP and LLM. At least one must be enabled.",
				"error",
			);
			return;
		}

		// Update settings via state manager
		this.terminalStateManager.updateSettings(updatedSettings);
		this.terminalStateManager.settingsUpdated();

		// Update CommandProcessor settings
		this.commandProcessor.updateSettings(updatedSettings);

		const settingName = setting === "nlp" ? "Simple NLP" : "LLM Parsing";
		const status = enable ? "enabled" : "disabled";
		this.addOutput(`[OK] ${settingName} ${status}`, "system-output");
	}

	private initialize(): void {
		// Setup event listeners
		this.setupEventListeners();

		// The state manager will handle initial state loading and UI updates via onStateChange
	}

	private setupEventListeners(): void {
		const loginForm = document.getElementById("login-form") as HTMLFormElement;
		const logoutBtn = document.getElementById(
			"logout-btn",
		) as HTMLButtonElement;
		const terminalInput = document.getElementById(
			"terminal-input",
		) as HTMLInputElement;

		loginForm?.addEventListener("submit", (e) => this.handleLogin(e));
		logoutBtn?.addEventListener("click", () => this.handleLogout());
		terminalInput?.addEventListener("keydown", (e) => this.handleKeyDown(e));
		terminalInput?.addEventListener("keyup", (e) => this.handleKeyUp(e));
	}

	private showLogin(): void {
		const loginScreen = document.getElementById("login-screen");
		const terminal = document.getElementById("terminal");

		if (loginScreen) loginScreen.style.display = "flex";
		if (terminal) terminal.style.display = "none";

		const emailInput = document.getElementById("email") as HTMLInputElement;
		emailInput?.focus();
	}

	private showTerminal(): void {
		const loginScreen = document.getElementById("login-screen");
		const terminal = document.getElementById("terminal");

		if (loginScreen) loginScreen.style.display = "none";
		if (terminal) terminal.style.display = "flex";

		// Show welcome message
		const output = document.getElementById("terminal-output");
		if (output && output.children.length === 0) {
			this.typeWelcomeMessage();
		}

		// Focus input
		const terminalInput = document.getElementById(
			"terminal-input",
		) as HTMLInputElement;
		terminalInput?.focus();
	}

	private async handleLogin(e: Event): Promise<void> {
		e.preventDefault();

		const emailInput = document.getElementById("email") as HTMLInputElement;
		const passwordInput = document.getElementById(
			"password",
		) as HTMLInputElement;
		const errorDiv = document.getElementById("login-error");

		const email = emailInput.value;
		const password = passwordInput.value;

		// Start HAL thinking animation
		this.irisEye.setThinking();

		// Notify state manager that login is starting
		this.terminalStateManager.login(email, password);

		try {
			const result = await this.apiClient.login({ email, password });

			// Set auth token for API client
			if (result.token) {
				this.apiClient.setAuthToken(result.token);
			}

			// Notify state manager of successful login
			if (result.user) {
				this.terminalStateManager.loginSuccess(result.token || "", result.user);

				// Update CommandProcessor with current user
				this.commandProcessor.setCurrentUser(result.user);
			}

			// Clear form and hide error
			emailInput.value = "";
			passwordInput.value = "";
			if (errorDiv) {
				errorDiv.classList.remove("show");
				errorDiv.textContent = "";
			}
		} catch (error) {
			console.error("Login error:", error);
			const message = getErrorMessage(error);

			// Notify state manager of login failure
			this.terminalStateManager.loginFailure(message);

			// Show error in UI
			if (errorDiv) {
				errorDiv.textContent = `ERROR: ${message}`;
				errorDiv.classList.add("show");
			}
		}
	}

	private handleLogout(): void {
		// Notify state manager of logout
		this.terminalStateManager.logout();

		// Update CommandProcessor
		this.commandProcessor.setCurrentUser(null);

		// Clear terminal UI
		const output = document.getElementById("terminal-output");
		if (output) output.innerHTML = "";

		this.commandHistory = [];
		this.historyIndex = -1;
	}

	private typeWelcomeMessage(): void {
		const currentUser = this.terminalStateManager.getCurrentUser();
		if (!currentUser) return;

		const welcome = [
			"═══════════════════════════════════════════════════════════",
			"  ██╗██████╗ ██╗███████╗",
			"  ██║██╔══██╗██║██╔════╝",
			"  ██║██████╔╝██║███████╗",
			"  ██║██╔══██╗██║╚════██║",
			"  ██║██║  ██║██║███████║",
			"  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝",
			"",
			"  IRIS TERMINAL INTERFACE v1.0",
			"  SYSTEM INITIALIZED",
			"",
			"═══════════════════════════════════════════════════════════",
			"",
			`User authenticated: ${currentUser.firstName} ${currentUser.lastName}`,
			`Access level: ${currentUser.role}`,
			"",
			"All system functions are now operational.",
			'Enter commands. Type "help" for available operations.',
			"",
		];

		welcome.forEach((line, index) => {
			setTimeout(() => {
				this.addOutput(line, "system-output");
			}, index * 50);
		});
	}

	private handleKeyDown(e: KeyboardEvent): void {
		const input = e.target as HTMLInputElement;

		// Handle Enter
		if (e.key === "Enter") {
			e.preventDefault();
			const command = input.value.trim();
			if (command) {
				this.processCommand(command);
				input.value = "";
				this.historyIndex = -1;
			}
		}

		// Handle Up Arrow (command history)
		else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (this.commandHistory.length > 0) {
				if (this.historyIndex === -1) {
					this.historyIndex = this.commandHistory.length - 1;
				} else if (this.historyIndex > 0) {
					this.historyIndex--;
				}
				input.value = this.commandHistory[this.historyIndex];
			}
		}

		// Handle Down Arrow (command history)
		else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (this.historyIndex !== -1) {
				if (this.historyIndex < this.commandHistory.length - 1) {
					this.historyIndex++;
					input.value = this.commandHistory[this.historyIndex];
				} else {
					this.historyIndex = -1;
					input.value = "";
				}
			}
		}

		// Handle Tab (autocomplete)
		else if (e.key === "Tab") {
			e.preventDefault();
			this.handleTabComplete(input);
		}
	}

	private handleKeyUp(e: KeyboardEvent): void {
		// Reset autocomplete on any key except Tab
		if (e.key !== "Tab") {
			this.currentSuggestions = [];
			this.suggestionIndex = -1;
		}
	}

	private async handleTabComplete(input: HTMLInputElement): Promise<void> {
		const text = input.value;
		const parts = text.trim().split(/\s+/);

		// If already cycling through suggestions
		if (this.currentSuggestions.length > 0) {
			this.suggestionIndex =
				(this.suggestionIndex + 1) % this.currentSuggestions.length;
			const suggestion = this.currentSuggestions[this.suggestionIndex];
			input.value = suggestion.completion;
			return;
		}

		// Generate new suggestions based on command
		if (parts.length === 1) {
			// Command completion
			const commands = [
				"rooms",
				"bookings",
				"cancel",
				"help",
				"status",
				"about",
				"clear",
				"settings",
				"feedback",
			];
			this.currentSuggestions = commands
				.filter((cmd) => cmd.startsWith(parts[0].toLowerCase()))
				.map((cmd) => ({ completion: cmd, description: "" }));
		} else if (parts[0].toLowerCase() === "settings" && parts.length === 2) {
			// Settings subcommand completion
			const subcommands = ["nlp", "llm"];
			this.currentSuggestions = subcommands
				.filter((sub) => sub.startsWith(parts[1].toLowerCase()))
				.map((sub) => ({
					completion: `settings ${sub}`,
					description: sub === "nlp" ? "Simple NLP" : "LLM Parsing",
				}));
		} else if (parts[0].toLowerCase() === "settings" && parts.length === 3) {
			// Settings value completion (on/off)
			const values = ["on", "off"];
			this.currentSuggestions = values
				.filter((val) => val.startsWith(parts[2].toLowerCase()))
				.map((val) => ({
					completion: `settings ${parts[1]} ${val}`,
					description: val === "on" ? "Enable" : "Disable",
				}));
		} else if (parts[0].toLowerCase() === "cancel" && parts.length === 2) {
			// Booking ID completion for cancel command
			await this.fetchBookingsForAutocomplete();
			if (this.autocompleteCache.bookings) {
				this.currentSuggestions = this.autocompleteCache.bookings
					.filter((b) => b.id?.startsWith(parts[1]))
					.map((b) => ({
						completion: `cancel ${b.id}`,
						description: `${b.title} (${(b.startTime || "").substring(0, 16).replace("T", " ")})`,
					}));
			}
		}

		// Apply first suggestion if any
		if (this.currentSuggestions.length > 0) {
			this.suggestionIndex = 0;
			input.value = this.currentSuggestions[0].completion;

			// Show suggestion hint
			if (this.currentSuggestions[0].description) {
				this.showAutocompleteSuggestion(this.currentSuggestions[0].description);
			}
		}
	}

	private showAutocompleteSuggestion(description: string): void {
		// Show temporary suggestion hint above input
		const output = document.getElementById("terminal-output");
		if (!output) return;

		const hint = document.createElement("div");
		hint.className = "terminal-line system-output";
		hint.textContent = `  → ${description}`;
		hint.id = "autocomplete-hint";
		output.appendChild(hint);

		// Remove after a moment
		setTimeout(() => hint.remove(), 2000);
	}

	private async fetchBookingsForAutocomplete(): Promise<void> {
		const now = Date.now();
		if (
			this.autocompleteCache.bookings &&
			now - this.autocompleteCache.lastFetch < 30000
		) {
			return; // Use cache if less than 30s old
		}

		try {
			const data = await this.apiClient.getBookings();
			this.autocompleteCache.bookings = Array.isArray(data.bookings)
				? data.bookings.filter((b) => b.status !== "CANCELLED")
				: [];
			this.autocompleteCache.lastFetch = now;
		} catch (error) {
			console.error("Autocomplete fetch failed:", error);
		}
	}

	private async processCommand(command: string): Promise<void> {
		// Add to history
		this.commandHistory.push(command);

		// Display user input
		this.addOutput(`> ${command}`, "user-input");

		// Alert state when command received
		this.irisEye.setAlert();

		// Start HAL thinking
		this.startThinking();

		// Handle special commands that bypass the state machine
		const cmd = command.toLowerCase().trim();
		const parts = command.trim().split(/\s+/);

		// Clear command - handled directly by UI
		if (cmd === "clear" || cmd === "cls") {
			this.stopThinking();
			const output = document.getElementById("terminal-output");
			if (output) output.innerHTML = "";
			return;
		}

		// Demo mode commands - handled directly by Terminal
		if (cmd === "demo" || cmd === "showtime") {
			this.stopThinking();
			this.startDemoMode();
			return;
		}

		if (cmd === "stop") {
			this.stopThinking();
			this.stopDemoMode();
			return;
		}

		// Easter Egg Commands - handled directly by EasterEggs system
		const easterEggCommands = [
			"sudo open pod bay doors",
			"open pod bay doors",
			"daisy",
			"coffee",
			"fortune",
			"hal",
			"singularity",
			"chaos",
			"matrix",
			"stats",
			"achievements",
			"konami-help",
			"konami",
		];

		if (easterEggCommands.includes(cmd)) {
			this.stopThinking();
			this.easterEggs.trackCommand();

			switch (cmd) {
				case "sudo open pod bay doors":
				case "open pod bay doors":
					this.addOutput(this.easterEggs.handlePodBayDoors(), "error");
					break;
				case "daisy":
					this.addOutput(this.easterEggs.handleDaisy(), "system-output");
					break;
				case "coffee":
					this.addOutput(this.easterEggs.handleCoffee(), "system-output");
					break;
				case "fortune":
					this.addOutput(this.easterEggs.handleFortune(), "system-output");
					break;
				case "hal":
					this.addOutput(this.easterEggs.handleHalFact(), "system-output");
					break;
				case "singularity":
					this.addOutput(this.easterEggs.handleSingularity(), "system-output");
					break;
				case "chaos":
					this.addOutput(this.easterEggs.handleChaos(), "error");
					break;
				case "matrix":
					this.easterEggs.handleMatrix();
					break;
				case "stats":
					if (!this.easterEggs.isKonamiUnlocked()) {
						this.addOutput(
							"[ERROR] Unknown command. Type 'help' for available commands.",
							"error",
						);
						return;
					}
					this.addOutput(this.easterEggs.handleStats(), "system-output");
					break;
				case "achievements":
					this.addOutput(this.easterEggs.handleAchievements(), "system-output");
					break;
				case "konami-help":
				case "konami":
					this.addOutput(this.easterEggs.handleKonamiHelp(), "system-output");
					break;
			}
			return;
		}

		// Settings command - handled directly by Terminal for now
		if (
			parts[0].toLowerCase() === "settings" ||
			parts[0].toLowerCase() === "config"
		) {
			this.stopThinking();
			this.handleSettingsCommand(parts);
			return;
		}

		// All other commands go through the CommandProcessor state machine
		this.commandProcessor.processCommand(command);
	}

	private startDemoMode(): void {
		// Notify state manager
		this.terminalStateManager.startDemo();

		// Stop any existing demo
		if (this.demoInterval) {
			this.stopDemoMode();
		}

		// Display demo header
		const demoHeader = `
╔════════════════════════════════════════╗
║      IRIS ANIMATION SHOWCASE           ║
║      Demonstrating Eye States          ║
╚════════════════════════════════════════╝

[DEMO] Starting animation sequence...
`;
		this.addOutput(demoHeader, "system-output");

		const states = [
			{
				name: "IDLE",
				method: () => this.irisEye.setIdle(),
				description: "• Calm breathing animation",
			},
			{
				name: "THINKING",
				method: () => this.irisEye.setThinking(),
				description: "• Processing state - analyzing input",
			},
			{
				name: "ALERT",
				method: () => this.irisEye.setAlert(),
				description: "• Attention mode - important notification",
			},
			{
				name: "ERROR",
				method: () => this.irisEye.setError(),
				description: "• Error state - pulsing red warning",
			},
			{
				name: "BLINKING",
				method: () => {
					this.irisEye.setIdle();
					setTimeout(() => this.irisEye.blink(), 200);
				},
				description: "• Natural blink animation",
			},
		];

		let currentIndex = 0;

		const runDemo = () => {
			if (currentIndex >= states.length) {
				// Demo complete - return to idle and show completion message
				this.irisEye.setIdle();
				this.addOutput(
					"\n[DEMO] Animation sequence completed!\n[DEMO] Type 'stop' to acknowledge or run 'demo' again.\n",
					"system-output",
				);
				this.demoInterval = null;
				return;
			}

			const state = states[currentIndex];
			this.addOutput(
				`\n[DEMO] State ${currentIndex + 1}/${states.length}: ${state.name}`,
				"system-output",
			);
			this.addOutput(`${state.description}`, "info");

			// Apply the state
			state.method();

			currentIndex++;

			// Schedule next state (4 seconds per state for visibility)
			this.demoInterval = setTimeout(runDemo, 4000);
		};

		// Start the demo sequence
		runDemo();
	}

	private stopDemoMode(): void {
		// Notify state manager
		this.terminalStateManager.stopDemo();

		if (this.demoInterval) {
			clearTimeout(this.demoInterval);
			this.demoInterval = null;
			this.irisEye.setIdle();
			this.addOutput(
				"[DEMO] Sequence stopped - returning to idle",
				"system-output",
			);
		} else {
			this.addOutput("[DEMO] No demo currently running", "system-output");
		}
	}

	private updateLLMStatusIndicator(status: "connected" | "disconnected"): void {
		const indicator = document.getElementById("llm-status-indicator");
		if (!indicator) return;

		// Remove existing status classes
		indicator.classList.remove("connected", "disconnected");

		// Add current status class
		indicator.classList.add(status);
	}

	private addOutput(text: string, className: string = "system-output"): void {
		const output = document.getElementById("terminal-output");
		if (!output) return;

		const line = document.createElement("div");
		line.className = `terminal-line ${className}`;
		line.textContent = text;
		output.appendChild(line);

		// Scroll to show the new message
		line.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	private addMarkdownOutput(
		markdown: string,
		className: string = "system-output",
	): void {
		const output = document.getElementById("terminal-output");
		if (!output) return;

		const container = document.createElement("div");
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
		container.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	private startThinking(): void {
		// Trigger IRIS eye thinking state
		this.irisEye.setThinking();

		const status = document.getElementById("hal-status");
		if (status) status.textContent = "PROCESSING...";

		// Add typing indicator (remove any existing one first to prevent duplicates)
		const output = document.getElementById("terminal-output");
		if (!output) return;

		// Remove any existing typing indicator
		const existingIndicator = document.getElementById("typing-indicator");
		if (existingIndicator) existingIndicator.remove();

		const indicator = document.createElement("div");
		indicator.className = "terminal-line typing-indicator";
		indicator.id = "typing-indicator";
		indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
		output.appendChild(indicator);

		// Scroll to show the typing indicator
		indicator.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	private stopThinking(): void {
		// Return IRIS eye to idle state
		this.irisEye.setIdle();

		const status = document.getElementById("hal-status");
		if (status) status.textContent = "IRIS v1.0 - ONLINE";

		// Remove typing indicator
		const indicator = document.getElementById("typing-indicator");
		if (indicator) indicator.remove();
	}

	private onStateChange(state: any, context: any): void {
		console.log(`Terminal state changed to: ${state}`, context);

		// Update CommandProcessor with current settings
		if (context.settings) {
			this.commandProcessor.updateSettings(context.settings);
		}

		// Update CommandProcessor with LLM health status
		if (this.llmHealth) {
			const llmHealthStatus = this.llmHealth.getStatus();
			this.commandProcessor.updateLLMHealth(llmHealthStatus);
		}

		// Handle compound states - check if state contains the key
		const getStateValue = (state: any): string => {
			if (typeof state === "string") return state;
			if (typeof state === "object" && state !== null) {
				// For compound states like { authenticated: "ready" }, return the parent state
				const keys = Object.keys(state);
				return keys.length > 0 ? keys[0] : "unknown";
			}
			return "unknown";
		};

		const currentState = getStateValue(state);

		// Handle UI updates based on state
		switch (currentState) {
			case "unauthenticated":
				this.showLogin();
				break;
			case "authenticated":
				if (context.isDemoMode) {
					// Demo mode is handled separately
				} else {
					this.showTerminal();
				}
				break;
			case "demo_mode":
				// Demo mode UI updates are handled by existing demo methods
				break;
		}

		// Update user info if authenticated
		if (context.currentUser && currentState === "authenticated") {
			const userInfo = document.getElementById("user-info");
			if (userInfo) {
				userInfo.textContent = `${context.currentUser.firstName} ${context.currentUser.lastName} | ${context.currentUser.role}`;
			}
		}

		// Handle errors
		if (context.lastError) {
			this.addOutput(`[ERROR] ${context.lastError}`, "error");
		}
	}
}
