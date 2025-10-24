import { interpret } from "xstate";
import { AvailabilityCommandHandler } from "../commands/availability-handler";
import { BookingCommandHandler } from "../commands/booking-handler";
import { BookingsCommandHandler } from "../commands/bookings-handler";
import { BulkCancelCommandHandler } from "../commands/bulk-cancel-handler";
import { CancelCommandHandler } from "../commands/cancel-handler";
import { FeedbackCommandHandler } from "../commands/feedback-handler";
import { RoomsCommandHandler } from "../commands/rooms-handler";
import type { TerminalSettings } from "../types/terminal";
import type {
	NaturalLanguageProcessor,
	ParsedIntent,
} from "../utils/natural-language";
import { setupXState } from "../utils/xstate-config";
import type { MilesApiClient, User } from "./api-client";
import {
	type CommandProcessorContext,
	commandProcessorMachine,
} from "./command-processor.machine";
import type { EasterEggs } from "./easter-eggs";
import type { IrisEye } from "./iris-eye";
import type { LLMHealthService } from "./llm-health";
import type { LLMIntent, LLMService } from "./llm-service";

/**
 * Command Processor Service
 * Uses XState to manage complex command routing and execution logic
 */
export class CommandProcessor {
	private stateMachine = interpret(commandProcessorMachine);

	// Dependencies
	private apiClient: MilesApiClient;
	private irisEye: IrisEye;
	private currentUser: User | null = null;
	private userTimezone: string;
	private nlpProcessor: NaturalLanguageProcessor;
	private llmService: LLMService;

	// Output callbacks
	private onOutput?: (message: string, className?: string) => void;
	private onMarkdownOutput?: (markdown: string, className?: string) => void;

	constructor(
		apiClient: MilesApiClient,
		irisEye: IrisEye,
		_llmHealth: LLMHealthService,
		userTimezone: string,
		nlpProcessor: NaturalLanguageProcessor,
		llmService: LLMService,
		_easterEggs: EasterEggs,
	) {
		this.apiClient = apiClient;
		this.irisEye = irisEye;
		this.userTimezone = userTimezone;
		this.nlpProcessor = nlpProcessor;
		this.llmService = llmService;

		this.initialize();
	}

	private initialize(): void {
		// Set up XState in development
		setupXState();

		// Start the state machine
		this.stateMachine.start();

		// Subscribe to state changes
		this.stateMachine.subscribe((state) => {
			this.onStateChange(state);
		});
	}

	private onStateChange(state: any): void {
		const context = state.context as CommandProcessorContext;

		// Handle state-specific actions
		switch (state.value) {
			case "idle":
				// Command completed, stop thinking
				this.irisEye.setIdle();
				this.stopThinkingIndicator();
				break;
			case "parsing":
				this.handleParsing(context);
				break;
			case "routing":
				this.handleRouting(context);
				break;
			case "executing_builtin":
				this.handleBuiltinExecution(context);
				break;
			case "executing_direct":
				this.handleDirectExecution(context);
				break;
			case "executing_nlp":
				this.handleNLPExecution(context);
				break;
			case "executing_llm":
				this.handleLLMExecution(context);
				break;
			case "error":
				this.handleError(context);
				break;
			case "fallback":
				this.handleFallback(context);
				break;
		}
	}

	private stopThinkingIndicator(): void {
		// Remove typing indicator
		const indicator = document.getElementById("typing-indicator");
		if (indicator) indicator.remove();

		const status = document.getElementById("hal-status");
		if (status) status.textContent = "IRIS v1.0 - ONLINE";
	}

	private handleParsing(context: CommandProcessorContext): void {
		const { command } = context;

		try {
			// Parse the command using NLP
			const intent = this.nlpProcessor.parseIntent(command);

			// Send parsed intent to state machine
			this.stateMachine.send({
				type: "COMMAND_PARSED",
				intent,
			});
		} catch (error) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: error as Error,
			});
		}
	}

	private handleRouting(context: CommandProcessorContext): void {
		const { mainCommand, parsedIntent } = context;

		// Check for built-in commands first
		if (this.isBuiltinCommand(mainCommand)) {
			this.stateMachine.send({ type: "EXECUTE_BUILTIN" });
			return;
		}

		// Check for direct API commands
		if (this.isDirectAPICommand(mainCommand)) {
			this.stateMachine.send({ type: "EXECUTE_DIRECT_API" });
			return;
		}

		// Route to NLP or LLM based on settings and conditions
		const settings = context.settings;

		// High confidence simple NLP
		if (
			settings.useSimpleNLP &&
			this.nlpProcessor.hasHighConfidence(parsedIntent!)
		) {
			this.stateMachine.send({ type: "EXECUTE_NLP" });
			return;
		}

		// Use LLM for complex queries
		if (
			settings.useLLM &&
			(this.nlpProcessor.shouldUseLLM(parsedIntent!) || !settings.useSimpleNLP)
		) {
			this.stateMachine.send({ type: "EXECUTE_LLM" });
			return;
		}

		// Fallback to simple NLP
		if (settings.useSimpleNLP) {
			this.stateMachine.send({ type: "EXECUTE_NLP" });
			return;
		}

		// No valid routing found
		this.stateMachine.send({
			type: "EXECUTION_ERROR",
			error: new Error("Both Simple NLP and LLM are disabled or unavailable"),
		});
	}

	private isBuiltinCommand(command: string): boolean {
		const builtinCommands = [
			"help",
			"clear",
			"cls",
			"echo",
			"status",
			"about",
			"info",
			"settings",
			"config",
			"demo",
			"showtime",
			"stop",
		];
		return builtinCommands.includes(command);
	}

	private isDirectAPICommand(command: string): boolean {
		const directCommands = ["rooms", "bookings", "list", "cancel", "feedback"];
		return directCommands.includes(command);
	}

	private async handleBuiltinExecution(
		context: CommandProcessorContext,
	): Promise<void> {
		const { command, mainCommand } = context;

		try {
			switch (mainCommand) {
				case "help":
					this.executeHelp();
					break;
				case "clear":
				case "cls":
					this.executeClear();
					break;
				case "echo":
					this.executeEcho(command);
					break;
				case "status":
					this.executeStatus();
					break;
				case "about":
				case "info":
					this.executeAbout();
					break;
				case "settings":
				case "config":
					this.executeSettings(command.split(/\s+/));
					break;
				case "demo":
				case "showtime":
					this.executeDemo();
					break;
				case "stop":
					this.executeStop();
					break;
				default:
					throw new Error(`Unknown built-in command: ${mainCommand}`);
			}

			this.stateMachine.send({ type: "EXECUTION_SUCCESS" });
		} catch (error) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: error as Error,
			});
		}
	}

	private async handleDirectExecution(
		context: CommandProcessorContext,
	): Promise<void> {
		const { mainCommand, commandParts } = context;

		try {
			switch (mainCommand) {
				case "rooms":
					await this.executeRooms();
					break;
				case "bookings":
				case "list":
					await this.executeBookings();
					break;
				case "cancel":
					await this.executeCancel(commandParts);
					break;
				case "feedback":
					await this.executeFeedback(commandParts);
					break;
				default:
					throw new Error(`Unknown direct API command: ${mainCommand}`);
			}

			this.stateMachine.send({ type: "EXECUTION_SUCCESS" });
		} catch (error) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: error as Error,
			});
		}
	}

	private handleNLPExecution(context: CommandProcessorContext): void {
		const { parsedIntent, command } = context;

		if (!parsedIntent) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: new Error("No parsed intent available"),
			});
			return;
		}

		try {
			// Execute based on NLP intent
			this.executeNLPIntent(parsedIntent, command);
			this.stateMachine.send({ type: "EXECUTION_SUCCESS" });
		} catch (error) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: error as Error,
			});
		}
	}

	private handleLLMExecution(context: CommandProcessorContext): void {
		const { command } = context;

		// Execute LLM intent asynchronously - it will send completion events to state machine
		this.executeLLMIntentAsync(command);
	}

	private handleError(context: CommandProcessorContext): void {
		const { errorMessage } = context;

		if (this.onOutput) {
			this.onOutput(
				`[ERROR] ${errorMessage || "Command execution failed"}`,
				"error",
			);
		}
	}

	private handleFallback(context: CommandProcessorContext): void {
		// Determine fallback strategy
		if (context.settings.useLLM && context.llmHealthStatus === "connected") {
			this.stateMachine.send({ type: "EXECUTE_LLM" });
		} else if (context.settings.useSimpleNLP) {
			this.stateMachine.send({ type: "EXECUTE_NLP" });
		} else {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: new Error("No fallback options available"),
			});
		}
	}

	// Public interface
	public processCommand(command: string): void {
		// Start thinking animation
		this.irisEye.setThinking();
		this.startThinkingIndicator();

		this.stateMachine.send({
			type: "PROCESS_COMMAND",
			command,
		});
	}

	private startThinkingIndicator(): void {
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

	public updateSettings(settings: TerminalSettings): void {
		this.stateMachine.send({
			type: "UPDATE_SETTINGS",
			settings,
		} as any); // Type assertion needed for extended events
	}

	public updateLLMHealth(
		status: "connected" | "disconnected" | "unknown",
	): void {
		this.stateMachine.send({
			type: "UPDATE_LLM_HEALTH",
			status,
		} as any);
	}

	public setOutputCallbacks(
		onOutput?: (message: string, className?: string) => void,
		onMarkdownOutput?: (markdown: string, className?: string) => void,
	): void {
		this.onOutput = onOutput;
		this.onMarkdownOutput = onMarkdownOutput;
	}

	public setCurrentUser(user: User | null): void {
		this.currentUser = user;
	}

	// Command execution implementations
	private executeHelp(): void {
		const markdown = `
# COMMAND REFERENCE

## DATA QUERIES

▸ **rooms** - Display all rooms
▸ **bookings** - Display active bookings
▸ **feedback** - Display all room feedback
▸ **feedback** \`<roomId>\` - Display feedback for specific room
▸ **cancel** \`<id>\` - Cancel booking by ID

## SYSTEM

▸ **help** - Display this reference
▸ **clear, cls** - Clear terminal buffer
▸ **status** - System diagnostic
▸ **about** - System information
▸ **settings** - Show current settings
▸ **settings nlp [on|off]** - Toggle simple NLP
▸ **settings llm [on|off]** - Toggle LLM parsing

## DEMO

▸ **demo** - Start animation showcase
▸ **stop** - Stop demo mode
`;

		if (this.onMarkdownOutput) {
			this.onMarkdownOutput(markdown, "system-output");
		}
	}

	private executeClear(): void {
		// Clear command will be handled by the terminal UI
		if (this.onOutput) {
			this.onOutput("[TERMINAL CLEARED]", "system-output");
		}
		// The actual clearing will be handled by the Terminal class
	}

	private executeEcho(command: string): void {
		const message = command.substring(5); // Remove 'echo '
		if (this.onOutput) {
			this.onOutput(message, "system-output");
		}
	}

	private executeStatus(): void {
		const markdown = `
## SYSTEM STATUS

**System:** IRIS v1.0
**User:** ${this.currentUser?.firstName || "Unknown"} ${this.currentUser?.lastName || ""}
**Role:** ${this.currentUser?.role || "Unknown"}
**Connected:** ${new Date().toLocaleString()}
**Backend:** API Connected
`;

		if (this.onMarkdownOutput) {
			this.onMarkdownOutput(markdown, "system-output");
		}
	}

	private executeAbout(): void {
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

		if (this.onMarkdownOutput) {
			this.onMarkdownOutput(markdown, "system-output");
		}
	}

	private executeSettings(parts: string[]): void {
		// settings [nlp|llm] [on|off]
		if (parts.length === 1) {
			// Just "settings" - show current settings
			this.showSettings();
			return;
		}

		if (parts.length !== 3) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Usage: settings [nlp|llm] [on|off]", "error");
			}
			return;
		}

		const setting = parts[1].toLowerCase();
		const value = parts[2].toLowerCase();

		if (!["nlp", "llm"].includes(setting)) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Invalid setting. Use 'nlp' or 'llm'", "error");
			}
			return;
		}

		if (!["on", "off"].includes(value)) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Invalid value. Use 'on' or 'off'", "error");
			}
			return;
		}

		const enable = value === "on";

		// Update setting (this will be handled by the Terminal class)
		// For now, just show the change
		const settingName = setting === "nlp" ? "Simple NLP" : "LLM Parsing";
		const status = enable ? "enabled" : "disabled";
		if (this.onOutput) {
			this.onOutput(`[OK] ${settingName} ${status}`, "system-output");
		}
	}

	private showSettings(): void {
		// This will be updated by the Terminal class
		const nlpStatus = "ON"; // Default
		const llmStatus = "ON"; // Default

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

		if (this.onMarkdownOutput) {
			this.onMarkdownOutput(markdown, "system-output");
		}
	}

	private executeDemo(): void {
		// Demo mode will be handled by the Terminal class
		if (this.onOutput) {
			this.onOutput("[DEMO] Starting animation showcase...", "system-output");
		}
	}

	private executeStop(): void {
		// Stop demo mode will be handled by the Terminal class
		if (this.onOutput) {
			this.onOutput("[DEMO] Stopped", "system-output");
		}
	}

	private async executeRooms(): Promise<void> {
		if (!this.currentUser) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Not authenticated", "error");
			}
			return;
		}

		try {
			const handler = new RoomsCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute();
		} catch (error) {
			console.error("Rooms command failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to fetch rooms", "error");
			}
		}
	}

	private async executeBookings(): Promise<void> {
		if (!this.currentUser) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Not authenticated", "error");
			}
			return;
		}

		try {
			const handler = new BookingsCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute();
		} catch (error) {
			console.error("Bookings command failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to fetch bookings", "error");
			}
		}
	}

	private async executeCancel(parts: string[]): Promise<void> {
		if (!this.currentUser) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Not authenticated", "error");
			}
			return;
		}

		const bookingId = parts[1];
		if (!bookingId) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Booking ID required for cancellation", "error");
			}
			return;
		}

		try {
			const handler = new CancelCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute({ bookingId });
		} catch (error) {
			console.error("Cancel command failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to cancel booking", "error");
			}
		}
	}

	private async executeFeedback(parts: string[]): Promise<void> {
		if (!this.currentUser) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Not authenticated", "error");
			}
			return;
		}

		try {
			const handler = new FeedbackCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			// Support optional roomId parameter: "feedback <roomId>"
			const roomId = parts[1];
			await handler.execute(roomId ? { roomId } : undefined);
		} catch (error) {
			console.error("Feedback command failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to fetch feedback", "error");
			}
		}
	}

	private async executeNLPIntent(
		intent: ParsedIntent,
		command: string,
	): Promise<void> {
		try {
			switch (intent.type) {
				case "greeting":
					this.handleGreeting();
					break;
				case "rooms_query":
					await this.executeRooms();
					break;
				case "bookings_query":
					await this.executeBookings();
					break;
				case "availability_check":
					await this.handleAvailabilityQuery(intent.entities.roomName);
					break;
				case "booking_create":
					await this.handleBookingIntent(
						intent.entities.roomName,
						intent.entities.time,
						command, // Pass the full command for better parsing
					);
					break;
				case "cancel_all":
					await this.handleCancelAllIntent();
					break;
				case "llm_fallback":
				case "unknown":
					// For low confidence or unknown, show error
					if (this.onOutput) {
						this.onOutput(
							'[ERROR] Command not recognized. Type "help" for available commands.',
							"error",
						);
					}
					break;
			}
		} catch (error) {
			console.error("NLP intent execution failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to execute command", "error");
			}
		}
	}

	private async executeLLMIntent(command: string): Promise<void> {
		try {
			const userId = this.currentUser?.id;
			if (!userId) {
				throw new Error("User not authenticated");
			}

			const llmIntent = await this.llmService.parseIntent(
				command,
				userId,
				this.userTimezone,
			);

			// Map LLM intent to command handler execution
			await this.executeLLMIntentHandler(llmIntent);
		} catch (error) {
			console.warn("LLM processing failed, falling back to simple NLP:", error);
			// Fallback to simple NLP
			const fallbackIntent = this.nlpProcessor.parseIntent(command);
			await this.executeNLPIntent(fallbackIntent, command);
		}
	}

	// Async version that sends state machine events
	private async executeLLMIntentAsync(command: string): Promise<void> {
		try {
			await this.executeLLMIntent(command);
			this.stateMachine.send({ type: "EXECUTION_SUCCESS" });
		} catch (error) {
			this.stateMachine.send({
				type: "EXECUTION_ERROR",
				error: error as Error,
			});
		}
	}

	private async executeLLMIntentHandler(intent: LLMIntent): Promise<void> {
		switch (intent.action) {
			case "getRooms":
				// Check if any filter is specified - if so, route to filtered search
				if (
					intent.params?.location ||
					intent.params?.capacity ||
					intent.params?.amenities
				) {
					await this.handleComplexRoomSearch(intent.params);
				} else {
					await this.executeRooms();
				}
				break;
			case "getBookings":
				await this.executeBookings();
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
			case "findRooms":
				// Complex room search with filtering - route to MCP AI
				await this.handleComplexRoomSearch(intent.params);
				break;
			case "needsMoreInfo":
				this.handleNeedsMoreInfo(intent.response);
				break;
			case "unknown":
				this.handleUnknownQuery(intent.response);
				break;
			default:
				if (this.onOutput) {
					this.onOutput("[ERROR] Unrecognized action from LLM", "error");
				}
		}
	}

	// NLP Intent Handlers
	private handleGreeting(): void {
		const responses = [
			"Greetings. I am IRIS, your intelligent room interface system. How may I assist you with workspace allocation?",
			"Hello. All systems operational. What room booking operations do you require?",
			"IRIS online. Ready for room management queries.",
			"Query received. All systems nominal. State your requirements.",
		];
		const response = responses[Math.floor(Math.random() * responses.length)];
		if (this.onOutput) {
			this.onOutput(response, "system-output");
		}
	}

	private async handleAvailabilityQuery(roomName?: string): Promise<void> {
		if (!roomName) {
			if (this.onOutput) {
				this.onOutput(
					"[ERROR] Please specify a room name for availability check.",
					"error",
				);
			}
			return;
		}

		if (!this.currentUser) return;

		// Use existing availability handler with fuzzy matching
		try {
			const handler = new AvailabilityCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute({ roomName });
		} catch (error) {
			console.error("Availability query failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to check availability", "error");
			}
		}
	}

	private async handleBookingIntent(
		roomName?: string,
		time?: string,
		fullCommand?: string,
	): Promise<void> {
		// Parse the full command for accurate booking parameters
		if (fullCommand) {
			const match = fullCommand.match(
				/\b(?:book|reserve|schedule)\s+(.+?)\s+(tomorrow|today|\w+day)\s+at\s+(\d+):(\d+)\s+for\s+(\d+)\s+(hour|minute|min)s?\b/i,
			);
			if (match) {
				const [, parsedRoomName, date, hour, minute, duration, unit] = match;
				// Use the parsed values
				roomName = parsedRoomName.trim();
				time = `${date} at ${hour}:${minute} for ${duration} ${unit}`;
			} else {
				// If full command parsing fails, use NLP entities
				// (existing logic)
			}
		}

		if (!roomName) {
			if (this.onOutput) {
				this.onOutput(
					"[ERROR] Please specify a room name for booking.",
					"error",
				);
			}
			return;
		}

		// Try to create the booking using the same logic as LLM handler
		// For now, delegate to handleBookingCreate with parsed params
		const params: Record<string, unknown> = {
			roomName: roomName,
		};

		// Simple time parsing
		if (time) {
			// Parse "tomorrow at 9:00 for 8 hours"
			const timeMatch = time.match(
				/(tomorrow|today|\w+day)\s+at\s+(\d+):(\d+)\s+for\s+(\d+)\s+(hour|minute|min)s?/i,
			);
			if (timeMatch) {
				const [, date, hour, minute, duration, unit] = timeMatch;
				const durationMinutes = unit.startsWith("h")
					? parseInt(duration, 10) * 60
					: parseInt(duration, 10);

				// Calculate start time (simplified - assume tomorrow is +1 day)
				const now = new Date();
				const startDate = new Date(now);
				if (date === "tomorrow") {
					startDate.setDate(now.getDate() + 1);
				}
				startDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);

				params.startTime = startDate.toISOString();
				params.duration = durationMinutes;
				params.title = `Meeting - ${this.currentUser?.firstName || "User"}`;
			}
		}

		await this.handleBookingCreate(params);
	}

	private async handleCancelAllIntent(): Promise<void> {
		if (!this.currentUser) return;

		// Use existing bulk cancel handler
		try {
			const handler = new BulkCancelCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute({ filter: "all" });
		} catch (error) {
			console.error("Cancel all intent failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to cancel bookings", "error");
			}
		}
	}

	// LLM Intent Handlers
	private async handleComplexRoomSearch(
		params?: Record<string, unknown>,
	): Promise<void> {
		if (!this.currentUser) return;

		try {
			// Fetch all rooms
			const data = await this.apiClient.getRooms();
			const rooms = data.rooms;

			if (!Array.isArray(rooms) || rooms.length === 0) {
				if (this.onOutput) {
					this.onOutput("[WARNING] No rooms found in system", "system-output");
				}
				return;
			}

			// Extract filter criteria
			const minCapacity = params?.capacity ? Number(params.capacity) : 0;
			const requiredAmenities = params?.amenities
				? String(params.amenities)
						.toLowerCase()
						.split(",")
						.map((a) => a.trim())
				: [];
			const locationFilter = params?.location
				? String(params.location).toLowerCase().trim()
				: "";

			// Filter rooms based on criteria
			const filteredRooms = rooms.filter((room) => {
				// Check location
				if (locationFilter && room.locationId) {
					const roomLocation = room.locationId.toLowerCase();
					if (!roomLocation.includes(locationFilter)) {
						return false;
					}
				}

				// Check capacity
				if (minCapacity > 0 && (room.capacity || 0) < minCapacity) {
					return false;
				}

				// Check amenities if specified
				if (requiredAmenities.length > 0) {
					if (!room.amenities) {
						return false;
					}

					const roomAmenities =
						typeof room.amenities === "string"
							? (room.amenities as string).toLowerCase()
							: Array.isArray(room.amenities)
								? room.amenities.join(" ").toLowerCase()
								: "";

					const hasRequiredAmenity = requiredAmenities.some((amenity) =>
						roomAmenities.includes(amenity),
					);
					if (!hasRequiredAmenity) {
						return false;
					}
				}

				return true;
			});

			// Build markdown table
			let markdown = "[OK] Filtered room search results\n\n";

			if (locationFilter) {
				markdown += `**Location:** ${locationFilter}\n`;
			}
			if (minCapacity > 0) {
				markdown += `**Minimum Capacity:** ${minCapacity} people\n`;
			}
			if (requiredAmenities.length > 0) {
				markdown += `**Required Amenities:** ${requiredAmenities.join(", ")}\n`;
			}
			markdown += "\n";

			if (filteredRooms.length === 0) {
				markdown +=
					"No rooms match your criteria. Try adjusting your requirements.\n";
			} else {
				markdown += "| ID | NAME | LOCATION | CAPACITY | AMENITIES |\n";
				markdown += "|---|---|---|---:|---|\n";

				filteredRooms.forEach((room) => {
					const id = room.id || "";
					const name = room.name || "Unnamed";
					const location = room.locationId || "N/A";
					const capacity = room.capacity || 0;
					const amenities = room.amenities
						? typeof room.amenities === "string"
							? room.amenities
							: Array.isArray(room.amenities)
								? room.amenities.join(", ")
								: "None"
						: "None";

					markdown += `| ${id} | ${name} | ${location} | ${capacity} | ${amenities} |\n`;
				});

				markdown += `\n**Total:** ${filteredRooms.length} matching room(s)`;
			}

			if (this.onMarkdownOutput) {
				this.onMarkdownOutput(markdown, "system-output");
			}
		} catch (error) {
			console.error("Complex room search failed:", error);
			if (this.onOutput) {
				this.onOutput(
					"[ERROR] Unable to process room search. Please try again.",
					"error",
				);
			}
		}
	}

	private async handleAvailabilityCheck(
		params?: Record<string, unknown>,
	): Promise<void> {
		if (!this.currentUser) return;

		try {
			const handler = new AvailabilityCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute(params);
		} catch (error) {
			console.error("Availability check failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to check availability", "error");
			}
		}
	}

	private async handleBookingCreate(
		params?: Record<string, unknown>,
	): Promise<void> {
		if (!this.currentUser) return;

		const roomId = params?.roomId as string | undefined;
		const roomName = params?.roomName as string | undefined;
		const startTime = params?.startTime as string | undefined;
		const endTime = params?.endTime as string | undefined;
		const duration = params?.duration as number | undefined;
		const title = params?.title as string | undefined;
		const location = params?.location as string | undefined;

		// Scenario 1: Has location but no specific room - show available rooms
		if (location && !roomId && !roomName) {
			if (this.onOutput) {
				this.onOutput(
					`[INFO] Multiple rooms available in ${location}. Checking availability...`,
					"system-output",
				);
			}

			// If we have time parameters, show availability filtered results
			if (startTime) {
				const markdown = `[INFO] Multiple rooms available in ${location}. Checking availability...\n\nTo book a specific room, use: **book <room-name> ${new Date(startTime).toLocaleDateString()} at ${new Date(startTime).toLocaleTimeString()}**`;
				if (this.onMarkdownOutput) {
					this.onMarkdownOutput(markdown, "system-output");
				}

				// Show filtered rooms with availability info
				await this.handleComplexRoomSearch({
					location,
					startTime,
					endTime,
				});
			} else {
				// Just show rooms in location
				await this.handleComplexRoomSearch({ location });
			}
			return;
		}

		// Scenario 2: Missing critical parameters
		if ((!roomId && !roomName) || !startTime) {
			if (this.onOutput) {
				const missing: string[] = [];
				if (!roomId && !roomName) missing.push("room name");
				if (!startTime) missing.push("date/time");

				this.onOutput(
					`[INFO] Missing required information: ${missing.join(", ")}. Use: book <room-name> <date> at <time>`,
					"system-output",
				);
			}
			return;
		}

		// Scenario 3: Has room name but not room ID - resolve it
		let actualRoomId = roomId;
		if (roomName && !roomId) {
			actualRoomId = (await this.findRoomIdByName(roomName)) || undefined;
			if (!actualRoomId) {
				if (this.onOutput) {
					this.onOutput(
						`[ERROR] Room not found: "${roomName}". Use 'rooms' to see available rooms.`,
						"error",
					);
				}
				return;
			}
		}

		// Scenario 4: Calculate end time if we have duration
		let actualEndTime = endTime;
		if (!actualEndTime && duration && startTime) {
			const start = new Date(startTime);
			const end = new Date(start.getTime() + duration * 60 * 1000);
			actualEndTime = end.toISOString();
		}

		// Scenario 5: Default duration if not specified (1 hour)
		if (!actualEndTime && startTime) {
			const start = new Date(startTime);
			const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default
			actualEndTime = end.toISOString();
		}

		// Scenario 6: All params ready - create booking
		if (actualRoomId && startTime && actualEndTime) {
			try {
				const bookingParams = {
					roomId: actualRoomId,
					startTime,
					endTime: actualEndTime,
					title: title || `Meeting - ${this.currentUser?.firstName || "User"}`,
				};

				const handler = new BookingCommandHandler(
					this.apiClient,
					this.currentUser!,
					this.userTimezone,
				);

				await handler.execute(bookingParams);
			} catch (error) {
				console.error("Booking creation failed:", error);
				if (this.onOutput) {
					this.onOutput("[ERROR] Failed to create booking", "error");
				}
			}
			return;
		}

		// Fallback
		if (this.onOutput) {
			this.onOutput(
				"[ERROR] Unable to process booking request. Please specify: book <room-name> <date> at <time>",
				"error",
			);
		}
	}

	private async findRoomIdByName(roomName: string): Promise<string | null> {
		try {
			const data = await this.apiClient.getRooms();
			const rooms = data.rooms;

			if (!Array.isArray(rooms)) return null;

			const searchTerm = roomName.toLowerCase();

			// Don't match location keywords
			const locationKeywords = ["stavanger", "haugesund", "oslo", "bergen"];
			if (locationKeywords.includes(searchTerm)) {
				return null;
			}

			// Exact match first
			const exactMatch = rooms.find(
				(room) => room.name?.toLowerCase() === searchTerm,
			);
			if (exactMatch?.id) return exactMatch.id;

			// Fuzzy match - ONLY match against room names, not IDs
			const fuzzyMatch = rooms.find(
				(room) =>
					room.name?.toLowerCase().includes(searchTerm) ||
					searchTerm.includes(room.name?.toLowerCase() || ""),
			);

			return fuzzyMatch?.id || null;
		} catch (error) {
			console.error("Error finding room by name:", error);
			return null;
		}
	}

	private async handleCancelBooking(
		params?: Record<string, unknown>,
	): Promise<void> {
		if (!this.currentUser) return;

		const bookingId = params?.bookingId as string | undefined;
		if (!bookingId) {
			if (this.onOutput) {
				this.onOutput("[ERROR] Booking ID required for cancellation.", "error");
			}
			return;
		}

		try {
			const handler = new CancelCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute({ bookingId });
		} catch (error) {
			console.error("Cancel booking failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to cancel booking", "error");
			}
		}
	}

	private async handleBulkCancel(
		params?: Record<string, unknown>,
	): Promise<void> {
		if (!this.currentUser) return;

		try {
			const handler = new BulkCancelCommandHandler(
				this.apiClient,
				this.currentUser,
				this.userTimezone,
			);

			await handler.execute(params);
		} catch (error) {
			console.error("Bulk cancel failed:", error);
			if (this.onOutput) {
				this.onOutput("[ERROR] Failed to cancel bookings", "error");
			}
		}
	}

	private handleNeedsMoreInfo(response?: string): void {
		if (this.onOutput) {
			this.onOutput(
				response || "[INFO] Please provide more details for your request.",
				"system-output",
			);
		}
	}

	private handleUnknownQuery(response?: string): void {
		if (this.onOutput) {
			this.onOutput(
				response ||
					'[INFO] Query not understood. Type "help" for available commands.',
				"system-output",
			);
		}
	}

	public destroy(): void {
		this.stateMachine.stop();
	}
}
