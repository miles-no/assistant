import { AvailabilityCommandHandler } from "../commands/availability-handler";
import { BookingsCommandHandler } from "../commands/bookings-handler";
import { BulkCancelCommandHandler } from "../commands/bulk-cancel-handler";
import { CancelCommandHandler } from "../commands/cancel-handler";
import { RoomsCommandHandler } from "../commands/rooms-handler";
import type {
	AutocompleteCache,
	AutocompleteSuggestion,
	TerminalState,
} from "../types/terminal";
import { config } from "../utils/config";
import { getErrorMessage } from "../utils/errors";
import {
	NaturalLanguageProcessor,
	type ParsedIntent,
} from "../utils/natural-language";
import { MilesApiClient } from "./api-client";
import { IrisEye } from "./iris-eye";
import { LLMHealthService } from "./llm-health";
import { type LLMIntent, LLMService } from "./llm-service";

/**
 * IRIS Terminal - Main command processing and UI management
 */
export class Terminal {
	private apiClient: MilesApiClient;
	private irisEye: IrisEye;
	private nlpProcessor: NaturalLanguageProcessor;
	private llmService: LLMService;
	private llmHealth: LLMHealthService;

	private state: TerminalState;
	private autocompleteCache: AutocompleteCache;

	private commandHistory: string[] = [];
	private historyIndex = -1;
	private currentSuggestions: AutocompleteSuggestion[] = [];
	private suggestionIndex = -1;

	constructor() {
		this.apiClient = new MilesApiClient(config.API_URL);
		this.irisEye = new IrisEye();
		this.nlpProcessor = new NaturalLanguageProcessor();
		this.llmService = new LLMService(this.apiClient, config.API_URL);
		this.llmHealth = new LLMHealthService(this.apiClient);

		this.state = {
			authToken: localStorage.getItem("irisAuthToken") || null,
			currentUser: this.parseStoredUser(),
			commandHistory: [],
			historyIndex: -1,
			userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
			lastBulkOperation: null,
		};

		this.autocompleteCache = {
			rooms: null,
			bookings: null,
			lastFetch: 0,
		};

		// Monitor LLM health for fallback decisions
		this.llmHealth.onStatusChange((status) => {
			console.log(`LLM status: ${status}`);
		});

		this.initialize();
	}

	private parseStoredUser(): any {
		try {
			const userJson = localStorage.getItem("irisUser");
			return userJson ? JSON.parse(userJson) : null;
		} catch {
			return null;
		}
	}

	private initialize(): void {
		// Check if already logged in
		if (this.state.currentUser && this.state.authToken) {
			this.apiClient.setAuthToken(this.state.authToken);
			this.showTerminal();
		} else {
			this.showLogin();
		}

		// Setup event listeners
		this.setupEventListeners();
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

		// Update user info
		if (this.state.currentUser) {
			const userInfo = document.getElementById("user-info");
			if (userInfo) {
				userInfo.textContent = `${this.state.currentUser.firstName} ${this.state.currentUser.lastName} | ${this.state.currentUser.role}`;
			}
		}

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

		try {
			const result = await this.apiClient.login({ email, password });

			// Save auth state
			this.state.authToken = result.token || null;
			this.state.currentUser = result.user || null;

			if (result.token) {
				this.apiClient.setAuthToken(result.token);
				localStorage.setItem("irisAuthToken", result.token);
			}

			if (result.user) {
				localStorage.setItem("irisUser", JSON.stringify(result.user));
			}

			// Hide error
			if (errorDiv) {
				errorDiv.classList.remove("show");
				errorDiv.textContent = "";
			}

			// Show terminal
			this.irisEye.setIdle();
			this.showTerminal();
		} catch (error) {
			this.irisEye.setIdle();
			console.error("Login error:", error);

			const message = getErrorMessage(error);
			if (errorDiv) {
				errorDiv.textContent = `ERROR: ${message}`;
				errorDiv.classList.add("show");
			}
		}
	}

	private handleLogout(): void {
		// Clear auth state
		this.state.authToken = null;
		this.state.currentUser = null;
		localStorage.removeItem("irisAuthToken");
		localStorage.removeItem("irisUser");

		// Clear terminal
		const output = document.getElementById("terminal-output");
		if (output) output.innerHTML = "";

		this.commandHistory = [];
		this.historyIndex = -1;

		// Show login
		this.showLogin();
	}

	private typeWelcomeMessage(): void {
		if (!this.state.currentUser) return;

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
			`User authenticated: ${this.state.currentUser.firstName} ${this.state.currentUser.lastName}`,
			`Access level: ${this.state.currentUser.role}`,
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
			];
			this.currentSuggestions = commands
				.filter((cmd) => cmd.startsWith(parts[0].toLowerCase()))
				.map((cmd) => ({ completion: cmd, description: "" }));
		} else if (parts[0].toLowerCase() === "cancel" && parts.length === 2) {
			// Booking ID completion for cancel command
			await this.fetchBookingsForAutocomplete();
			if (this.autocompleteCache.bookings) {
				this.currentSuggestions = this.autocompleteCache.bookings
					.filter((b) => b.id?.startsWith(parts[1]))
					.map((b) => ({
						completion: `cancel ${b.id}`,
						description: `${b.title} (${this.formatDate(b.startTime!)})`,
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
		this.state.commandHistory = this.commandHistory;

		// Display user input
		this.addOutput(`> ${command}`, "user-input");

		// Alert state when command received
		this.irisEye.setAlert();

		// Start HAL thinking
		this.startThinking();

		// Handle built-in commands
		const cmd = command.toLowerCase().trim();
		const parts = command.trim().split(/\s+/);
		const mainCmd = parts[0].toLowerCase();

		// Built-in system commands
		if (cmd === "help") {
			this.stopThinking();
			this.showHelp();
			return;
		}

		if (cmd === "clear" || cmd === "cls") {
			this.stopThinking();
			const output = document.getElementById("terminal-output");
			if (output) output.innerHTML = "";
			return;
		}

		if (cmd.startsWith("echo ")) {
			this.stopThinking();
			this.addOutput(command.substring(5), "system-output");
			return;
		}

		if (cmd === "status") {
			this.stopThinking();
			this.showStatus();
			return;
		}

		if (cmd === "about" || cmd === "info") {
			this.stopThinking();
			this.showAbout();
			return;
		}

		// Hidden demo mode command
		if (cmd === "demo" || cmd === "showtime") {
			this.stopThinking();
			this.startDemoMode();
			return;
		}

		// Stop demo mode
		if (cmd === "stop") {
			this.stopThinking();
			this.stopDemoMode();
			return;
		}

		// Direct API commands
		if (mainCmd === "rooms") {
			await this.handleRoomsCommand();
			return;
		}

		if (mainCmd === "bookings" || mainCmd === "list") {
			await this.handleBookingsCommand();
			return;
		}

		if (mainCmd === "cancel") {
			await this.handleCancelCommand(parts);
			return;
		}

		// Try hybrid natural language processing
		const intent = this.nlpProcessor.parseIntent(command);

		if (this.nlpProcessor.hasHighConfidence(intent)) {
			// High confidence simple NLP result
			await this.handleSimpleNLPIntent(intent);
		} else if (
			this.llmHealth.getStatus() === "connected" &&
			this.nlpProcessor.shouldUseLLM(intent)
		) {
			// Use LLM for complex queries or low confidence
			await this.handleLLMIntent(command);
		} else {
			// Fallback to simple NLP even for low confidence if LLM unavailable
			await this.handleSimpleNLPIntent(intent);
		}
	}

	private async handleRoomsCommand(): Promise<void> {
		if (!this.state.currentUser) return;

		const handler = new RoomsCommandHandler(
			this.apiClient,
			this.state.currentUser,
			this.state.userTimezone,
		);

		await handler.execute();
	}

	private async handleBookingsCommand(): Promise<void> {
		if (!this.state.currentUser) return;

		const handler = new BookingsCommandHandler(
			this.apiClient,
			this.state.currentUser,
			this.state.userTimezone,
		);

		await handler.execute();
	}

	private async handleCancelCommand(parts: string[]): Promise<void> {
		if (!this.state.currentUser) return;

		const handler = new CancelCommandHandler(
			this.apiClient,
			this.state.currentUser,
			this.state.userTimezone,
		);

		await handler.execute({ bookingId: parts[1] });
	}

	private showHelp(): void {
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

		this.addMarkdownOutput(markdown, "system-output");
	}

	private showStatus(): void {
		if (!this.state.currentUser) return;

		const markdown = `
## SYSTEM STATUS

**System:** IRIS v1.0
**User:** ${this.state.currentUser.firstName} ${this.state.currentUser.lastName}
**Role:** ${this.state.currentUser.role}
**Connected:** ${new Date().toLocaleString()}
**Backend:** ${config.API_URL}
`;

		this.addMarkdownOutput(markdown, "system-output");
	}

	private showAbout(): void {
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

		this.addMarkdownOutput(markdown, "system-output");
	}

	private startDemoMode(): void {
		// For now, just show a message - full demo implementation would be complex
		this.addOutput(
			"[DEMO MODE] Animation showcase not yet implemented in TypeScript version",
			"system-output",
		);
	}

	private stopDemoMode(): void {
		this.addOutput("[DEMO MODE] Not running", "system-output");
	}

	private async handleSimpleNLPIntent(intent: ParsedIntent): Promise<void> {
		switch (intent.type) {
			case "greeting":
				this.handleGreeting();
				break;
			case "rooms_query":
				await this.handleRoomsCommand();
				break;
			case "bookings_query":
				await this.handleBookingsCommand();
				break;
			case "availability_check":
				await this.handleAvailabilityQuery(intent.entities.roomName);
				break;
			case "booking_create":
				await this.handleBookingIntent(
					intent.entities.roomName,
					intent.entities.time,
				);
				break;
			case "cancel_all":
				await this.handleCancelAllIntent();
				break;
			case "llm_fallback":
			case "unknown":
				// For low confidence or unknown, try to provide helpful response
				this.stopThinking();
				this.addOutput(
					'[ERROR] Command not recognized. Type "help" for available commands.',
					"error",
				);
				break;
		}
	}

	private async handleLLMIntent(command: string): Promise<void> {
		try {
			this.startThinking();

			const userId = this.state.currentUser?.id;
			if (!userId) {
				throw new Error("User not authenticated");
			}

			const llmIntent = await this.llmService.parseIntent(command, userId);

			// Map LLM intent to command handler execution
			await this.executeLLMIntent(llmIntent);
		} catch (error) {
			console.warn("LLM processing failed, falling back to simple NLP:", error);
			// Fallback to simple NLP
			const fallbackIntent = this.nlpProcessor.parseIntent(command);
			await this.handleSimpleNLPIntent(fallbackIntent);
		}
	}

	private async executeLLMIntent(intent: LLMIntent): Promise<void> {
		switch (intent.action) {
			case "getRooms":
				await this.handleRoomsCommand();
				break;
			case "getBookings":
				await this.handleBookingsCommand();
				break;
			case "checkAvailability":
				await this.handleAvailabilityCheck(intent.params);
				break;
			case "createBooking":
				await this.handleBookingCreate(intent.params);
				break;
			case "cancelBooking":
				await this.handleCancelBooking(intent.params);
				break;
			case "bulkCancel":
				await this.handleBulkCancel(intent.params);
				break;
			case "needsMoreInfo":
				this.handleNeedsMoreInfo(intent.response);
				break;
			case "unknown":
				this.handleUnknownQuery(intent.response);
				break;
			default:
				this.stopThinking();
				this.addOutput("[ERROR] Unrecognized action from LLM", "error");
		}
	}

	private handleGreeting(): void {
		this.stopThinking();
		const responses = [
			"Greetings. I am IRIS, your intelligent room interface system. How may I assist you with workspace allocation?",
			"Hello. All systems operational. What room booking operations do you require?",
			"IRIS online. Ready for room management queries.",
			"Query received. All systems nominal. State your requirements.",
		];
		const response = responses[Math.floor(Math.random() * responses.length)];
		this.addOutput(response, "system-output");
	}

	private async handleAvailabilityQuery(roomName?: string): Promise<void> {
		if (!roomName) {
			this.stopThinking();
			this.addOutput(
				"[ERROR] Please specify a room name for availability check.",
				"error",
			);
			return;
		}

		// Use existing availability handler with fuzzy matching
		const handler = new AvailabilityCommandHandler(
			this.apiClient,
			this.state.currentUser!,
			this.state.userTimezone,
		);

		await handler.execute({ roomName });
	}

	private async handleBookingIntent(
		roomName?: string,
		_time?: string,
	): Promise<void> {
		if (!roomName) {
			this.stopThinking();
			this.addOutput(
				"[ERROR] Please specify a room name for booking.",
				"error",
			);
			return;
		}

		// This would need more sophisticated parsing for time/duration
		// For now, ask for clarification
		this.stopThinking();
		this.addOutput(
			`[INFO] I understand you want to book "${roomName}". Please use the format: book <room> <date> at <time> for <duration>`,
			"system-output",
		);
		this.addOutput(
			"Example: book Conference Room A tomorrow at 2pm for 1 hour",
			"system-output",
		);
	}

	private async handleCancelAllIntent(): Promise<void> {
		// Use existing bulk cancel handler
		const handler = new BulkCancelCommandHandler(
			this.apiClient,
			this.state.currentUser!,
			this.state.userTimezone,
		);

		await handler.execute({ filter: "all" });
	}

	private async handleAvailabilityCheck(_params?: any): Promise<void> {
		const handler = new AvailabilityCommandHandler(
			this.apiClient,
			this.state.currentUser!,
			this.state.userTimezone,
		);

		await handler.execute(_params);
	}

	private async handleBookingCreate(_params?: any): Promise<void> {
		// For now, show that booking creation is not fully implemented in simple NLP
		this.stopThinking();
		this.addOutput(
			"[INFO] Booking creation requires specific format. Use: book <room> <date> at <time> for <duration>",
			"system-output",
		);
	}

	private async handleCancelBooking(params?: any): Promise<void> {
		if (!params?.bookingId) {
			this.stopThinking();
			this.addOutput("[ERROR] Booking ID required for cancellation.", "error");
			return;
		}

		const handler = new CancelCommandHandler(
			this.apiClient,
			this.state.currentUser!,
			this.state.userTimezone,
		);

		await handler.execute({ bookingId: params.bookingId });
	}

	private async handleBulkCancel(params?: any): Promise<void> {
		const handler = new BulkCancelCommandHandler(
			this.apiClient,
			this.state.currentUser!,
			this.state.userTimezone,
		);

		await handler.execute(params);
	}

	private handleNeedsMoreInfo(response?: string): void {
		this.stopThinking();
		this.addOutput(
			response || "[INFO] Please provide more details for your request.",
			"system-output",
		);
	}

	private handleUnknownQuery(response?: string): void {
		this.stopThinking();
		this.addOutput(
			response ||
				'[INFO] Query not understood. Type "help" for available commands.',
			"system-output",
		);
	}

	private formatDate(dateStr: string): string {
		if (!dateStr) return "N/A";
		const date = new Date(dateStr);
		return date.toISOString().substring(0, 16).replace("T", " ");
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

		// Add typing indicator
		const output = document.getElementById("terminal-output");
		if (!output) return;

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
}
