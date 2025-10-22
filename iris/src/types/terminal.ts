import type { Booking, Room, User } from "../services/api-client";

/**
 * Terminal state and command processing types
 */

export interface TerminalSettings {
	useSimpleNLP: boolean; // Enable/disable simple NLP routing
	useLLM: boolean; // Enable/disable LLM parsing
	// Voice settings
	voiceInputEnabled: boolean; // Enable/disable voice input
	voiceOutputEnabled: boolean; // Enable/disable HAL voice output
	voiceOutputVolume: number; // 0.0 - 1.0
	voiceOutputRate: number; // Speech rate (0.1 - 10.0)
	voiceOutputPitch: number; // Speech pitch (0.0 - 2.0)
}

export interface TerminalState {
	authToken: string | null;
	currentUser: User | null;
	commandHistory: string[];
	historyIndex: number;
	userTimezone: string;
	lastBulkOperation: BulkOperation | null;
	settings: TerminalSettings;
}

export interface BulkOperation {
	type: "cancel";
	timestamp: number;
	bookings: Omit<
		Booking,
		"id" | "userId" | "status" | "createdAt" | "updatedAt"
	>[];
}

export interface AutocompleteCache {
	rooms: Room[] | null;
	bookings: Booking[] | null;
	lastFetch: number;
}

export interface AutocompleteSuggestion {
	completion: string;
	description?: string;
}

export interface CommandIntent {
	action: CommandAction;
	params?: Record<string, unknown>;
	response?: string;
}

export type CommandAction =
	| "getRooms"
	| "getBookings"
	| "checkAvailability"
	| "cancelBooking"
	| "bulkCancel"
	| "createBooking"
	| "needsMoreInfo"
	| "undo"
	| "unknown";

export interface ParsedIntent extends CommandIntent {
	params: {
		roomId?: string;
		roomName?: string;
		startTime?: string;
		endTime?: string;
		duration?: number;
		title?: string;
		bookingId?: string;
		filter?: "all" | "today" | "tomorrow" | "week";
	};
}

export interface TerminalOutputOptions {
	className?: string;
	speed?: number;
}
