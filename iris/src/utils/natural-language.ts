export interface ParsedIntent {
	type:
		| "greeting"
		| "rooms_query"
		| "bookings_query"
		| "availability_check"
		| "booking_create"
		| "cancel_all"
		| "llm_fallback"
		| "unknown";
	entities: {
		roomName?: string;
		time?: string;
		duration?: string;
		date?: string;
	};
	confidence: number;
	useLLM: boolean;
}

/**
 * Simple pattern-based natural language processor
 * Fast, reliable, and works offline
 */
export class NaturalLanguageProcessor {
	private readonly HIGH_CONFIDENCE_THRESHOLD = 0.8;
	private readonly LOW_CONFIDENCE_THRESHOLD = 0.3;

	private greetingPatterns = [
		/\b(hello|hi|hey|greetings?|what'?s up|how are you|good (morning|afternoon|evening))\b/i,
		/^(hello|hi|hey)[\s?]*$/i,
		/^(what'?s up|how are you)[\s?]*$/i,
	];

	private roomQueryPatterns = [
		/\b(show me all|list|what) rooms\b/i,
		/\b(what rooms are|rooms) available\b/i,
		/\bshow rooms\b/i,
		/\blist rooms\b/i,
		/\bshow all rooms\b/i,
		/^rooms[\s?]*$/i,
	];

	private bookingQueryPatterns = [
		/\b(show|list|what are) (my )?bookings\b/i,
		/\bmy bookings\b/i,
		/\bshow bookings\b/i,
		/\blist bookings\b/i,
		/\bshow my bookings\b/i,
		/\blist my bookings\b/i,
		/^bookings[\s?]*$/i,
	];

	private availabilityPatterns = [
		/\b(when is|is) (.+?) (available|free)\b/i,
		/\b(.+?) availability\b/i,
		/\bcheck (.+?) availability\b/i,
		/\bis (.+?) free\b/i,
	];

	private bookingPatterns = [
		/\b(book|reserve|schedule) (.+?) (tomorrow|today|at \d+|\d+:\d+)\b/i,
		/\b(can I|I want to|i want to) (book|reserve) (.+?)(?:\s+(tomorrow|today|at \d+|\d+:\d+))?\b/i,
		/\b(book|reserve) (.+?) for \d+ (hour|minute|min)s?\b/i,
	];

	private cancelAllPatterns = [
		/\bcancel all (bookings?|reservations?)\b/i,
		/\bcancel all today\b/i,
		/\bcancel all tomorrow\b/i,
		/\bcancel all this week\b/i,
	];

	private contextualPhrases = [
		/\b(book it|reserve it|get it|take it)\b/i,
		/\b(that room|this room|same room|the room)\b/i,
		/\b(same time|that time|this time)\b/i,
		/\b(book that|reserve that|book this|reserve this)\b/i,
		/^(it|that|this)$/i,
	];

	/**
	 * Parse user input into intent with confidence scoring
	 */
	parseIntent(input: string): ParsedIntent {
		const trimmedInput = input.trim();

		// Check for contextual references first - always use LLM for these
		if (this.contextualPhrases.some((pattern) => pattern.test(trimmedInput))) {
			return {
				type: "llm_fallback",
				entities: {},
				confidence: 0.1, // Force LLM usage for context resolution
				useLLM: true,
			};
		}

		// Check greetings first (highest confidence)
		if (this.greetingPatterns.some((pattern) => pattern.test(trimmedInput))) {
			return {
				type: "greeting",
				entities: {},
				confidence: 0.9,
				useLLM: false,
			};
		}

		// Check room queries (high confidence)
		if (this.roomQueryPatterns.some((pattern) => pattern.test(trimmedInput))) {
			return {
				type: "rooms_query",
				entities: {},
				confidence: 0.8,
				useLLM: false,
			};
		}

		// Check booking queries (high confidence)
		if (
			this.bookingQueryPatterns.some((pattern) => pattern.test(trimmedInput))
		) {
			return {
				type: "bookings_query",
				entities: {},
				confidence: 0.8,
				useLLM: false,
			};
		}

		// Check cancel all (high confidence)
		if (this.cancelAllPatterns.some((pattern) => pattern.test(trimmedInput))) {
			return {
				type: "cancel_all",
				entities: {},
				confidence: 0.9,
				useLLM: false,
			};
		}

		// Check availability (medium confidence - may need LLM for complex parsing)
		const availabilityMatch = this.availabilityPatterns
			.map((pattern) => pattern.exec(trimmedInput))
			.find((match) => match !== null);

		if (availabilityMatch) {
			let roomName = "";
			if (availabilityMatch[2]) {
				roomName = availabilityMatch[2];
			} else if (availabilityMatch[1]) {
				roomName = availabilityMatch[1];
			}
			return {
				type: "availability_check",
				entities: { roomName: roomName?.trim() },
				confidence: 0.6, // Lower confidence - may need LLM for time parsing
				useLLM: true,
			};
		}

		// Check booking intents (lower confidence - complex parsing needed)
		const bookingMatch = this.bookingPatterns
			.map((pattern) => pattern.exec(trimmedInput))
			.find((match) => match !== null);

		if (bookingMatch) {
			let roomName = "";
			let time = "";

			if (bookingMatch[2]) {
				roomName = bookingMatch[2];
			} else if (bookingMatch[3]) {
				roomName = bookingMatch[3];
			}

			if (bookingMatch[4]) {
				time = bookingMatch[4];
			} else if (bookingMatch[5]) {
				time = bookingMatch[5];
			}

			return {
				type: "booking_create",
				entities: { roomName: roomName?.trim(), time: time?.trim() },
				confidence: 0.4, // Low confidence - definitely needs LLM for proper parsing
				useLLM: true,
			};
		}

		// For anything else, use LLM if available
		return {
			type: "llm_fallback",
			entities: {},
			confidence: 0.1,
			useLLM: true,
		};
	}

	/**
	 * Determine if LLM should be used for this intent
	 */
	shouldUseLLM(intent: ParsedIntent): boolean {
		return intent.useLLM || intent.confidence < this.HIGH_CONFIDENCE_THRESHOLD;
	}

	/**
	 * Check if intent has sufficient confidence for direct execution
	 */
	hasHighConfidence(intent: ParsedIntent): boolean {
		return intent.confidence >= this.HIGH_CONFIDENCE_THRESHOLD;
	}

	/**
	 * Check if intent has minimum confidence for any processing
	 */
	hasMinimumConfidence(intent: ParsedIntent): boolean {
		return intent.confidence >= this.LOW_CONFIDENCE_THRESHOLD;
	}
}
