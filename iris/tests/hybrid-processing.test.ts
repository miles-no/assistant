// Hybrid Processing Tests
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { LLMHealthService } from "../src/services/llm-health";
import type { LLMService } from "../src/services/llm-service";
import { Terminal } from "../src/services/terminal";
import type { NaturalLanguageProcessor } from "../src/utils/natural-language";

// Mock DOM elements
const mockOutput = {
	appendChild: vi.fn(),
	children: [],
	scrollIntoView: vi.fn(),
};

const mockInput = {
	value: "",
	focus: vi.fn(),
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
};

const mockStatus = {
	textContent: "IRIS v1.0 - ONLINE",
};

const mockIrisEye = {
	setThinking: vi.fn(),
	setIdle: vi.fn(),
	setAlert: vi.fn(),
	setError: vi.fn(),
};

// Mock document.getElementById
global.document = {
	getElementById: vi.fn((id) => {
		switch (id) {
			case "terminal-output":
				return mockOutput;
			case "terminal-input":
				return mockInput;
			case "hal-status":
				return mockStatus;
			case "login-screen": {
				display: "none";
			}
			case "terminal": {
				display: "flex";
			}
			case "user-info": {
				textContent: "Test User";
			}
			default:
				return null;
		}
	}),
} as any;

// Mock localStorage
const localStorageMock = {
	getItem: vi.fn().mockReturnValue("test-token"),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window
global.window = {
	marked: {
		setOptions: vi.fn(),
		parse: vi.fn((markdown) => markdown),
	},
	IrisEye: mockIrisEye,
} as any;

// Mock fetch
global.fetch = vi.fn();

describe("Hybrid Processing Logic", () => {
	let terminal: Terminal;
	let mockNLP: NaturalLanguageProcessor;
	let mockLLMService: LLMService;
	let mockLLMHealth: LLMHealthService;

	beforeEach(() => {
		// Create mocks
		mockNLP = {
			parseIntent: vi.fn(),
			hasHighConfidence: vi.fn(),
			shouldUseLLM: vi.fn(),
		} as any;

		mockLLMService = {
			parseIntent: vi.fn(),
			isAvailable: vi.fn(),
		} as any;

		mockLLMHealth = {
			getStatus: vi.fn(),
			onStatusChange: vi.fn(),
		} as any;

		// Create terminal with mocked dependencies
		terminal = new Terminal();

		// Replace the services with mocks
		(terminal as any).nlpProcessor = mockNLP;
		(terminal as any).llmService = mockLLMService;
		(terminal as any).llmHealth = mockLLMHealth;
		(terminal as any).state = {
			authToken: "test-token",
			currentUser: {
				id: "user123",
				firstName: "Test",
				lastName: "User",
				role: "USER",
			},
			commandHistory: [],
			historyIndex: -1,
			userTimezone: "UTC",
			lastBulkOperation: null,
		};

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("High Confidence Simple NLP Processing", () => {
		test("should use simple NLP for high confidence greetings", async () => {
			const mockIntent = {
				type: "greeting",
				entities: {},
				confidence: 0.9,
				useLLM: false,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(true);

			// Mock the greeting handler
			const addOutputSpy = vi.spyOn(terminal as any, "addOutput");
			const stopThinkingSpy = vi.spyOn(terminal as any, "stopThinking");

			await (terminal as any).processCommand("hello");

			expect(mockNLP.parseIntent).toHaveBeenCalledWith("hello");
			expect(mockNLP.hasHighConfidence).toHaveBeenCalledWith(mockIntent);
			expect(mockLLMService.parseIntent).not.toHaveBeenCalled();
			expect(stopThinkingSpy).toHaveBeenCalled();
			expect(addOutputSpy).toHaveBeenCalledWith(
				expect.stringContaining("I am IRIS"),
				"system-output",
			);
		});

		test("should use simple NLP for high confidence room queries", async () => {
			const mockIntent = {
				type: "rooms_query",
				entities: {},
				confidence: 0.8,
				useLLM: false,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(true);

			// Mock the rooms command handler
			const handleRoomsCommandSpy = vi.spyOn(
				terminal as any,
				"handleRoomsCommand",
			);
			handleRoomsCommandSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand("show rooms");

			expect(mockNLP.parseIntent).toHaveBeenCalledWith("show rooms");
			expect(mockNLP.hasHighConfidence).toHaveBeenCalledWith(mockIntent);
			expect(mockLLMService.parseIntent).not.toHaveBeenCalled();
			expect(handleRoomsCommandSpy).toHaveBeenCalled();
		});

		test("should use simple NLP for high confidence booking queries", async () => {
			const mockIntent = {
				type: "bookings_query",
				entities: {},
				confidence: 0.8,
				useLLM: false,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(true);

			// Mock the bookings command handler
			const handleBookingsCommandSpy = vi.spyOn(
				terminal as any,
				"handleBookingsCommand",
			);
			handleBookingsCommandSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand("my bookings");

			expect(mockNLP.parseIntent).toHaveBeenCalledWith("my bookings");
			expect(mockNLP.hasHighConfidence).toHaveBeenCalledWith(mockIntent);
			expect(mockLLMService.parseIntent).not.toHaveBeenCalled();
			expect(handleBookingsCommandSpy).toHaveBeenCalled();
		});
	});

	describe("LLM Processing for Complex Queries", () => {
		test("should use LLM when confidence is low and LLM is available", async () => {
			const mockIntent = {
				type: "booking_create",
				entities: { roomName: "Conference Room A" },
				confidence: 0.4,
				useLLM: true,
			};

			const mockLLMResponse = {
				action: "createBooking",
				params: {
					roomName: "Conference Room A",
					startTime: "2025-10-22T14:00:00Z",
					duration: 60,
				},
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(false);
			mockNLP.shouldUseLLM.mockReturnValue(true);
			mockLLMHealth.getStatus.mockReturnValue("connected");
			mockLLMService.parseIntent.mockResolvedValue(mockLLMResponse);

			// Mock the executeLLMIntent method
			const executeLLMIntentSpy = vi.spyOn(terminal as any, "executeLLMIntent");
			executeLLMIntentSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand(
				"book Conference Room A tomorrow at 2pm",
			);

			expect(mockNLP.parseIntent).toHaveBeenCalledWith(
				"book Conference Room A tomorrow at 2pm",
			);
			expect(mockNLP.hasHighConfidence).toHaveBeenCalledWith(mockIntent);
			expect(mockLLMHealth.getStatus).toHaveBeenCalled();
			expect(mockLLMService.parseIntent).toHaveBeenCalledWith(
				"book Conference Room A tomorrow at 2pm",
				"user123",
			);
			expect(executeLLMIntentSpy).toHaveBeenCalledWith(mockLLMResponse);
		});

		test("should use LLM when shouldUseLLM returns true and LLM is available", async () => {
			const mockIntent = {
				type: "availability_check",
				entities: { roomName: "Conference Room A" },
				confidence: 0.6,
				useLLM: true,
			};

			const mockLLMResponse = {
				action: "checkAvailability",
				params: {
					roomName: "Conference Room A",
					startTime: "2025-10-22T09:00:00Z",
					endTime: "2025-10-22T17:00:00Z",
				},
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(false);
			mockNLP.shouldUseLLM.mockReturnValue(true);
			mockLLMHealth.getStatus.mockReturnValue("connected");
			mockLLMService.parseIntent.mockResolvedValue(mockLLMResponse);

			const executeLLMIntentSpy = vi.spyOn(terminal as any, "executeLLMIntent");
			executeLLMIntentSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand(
				"when is Conference Room A available?",
			);

			expect(mockLLMService.parseIntent).toHaveBeenCalled();
			expect(executeLLMIntentSpy).toHaveBeenCalledWith(mockLLMResponse);
		});
	});

	describe("Fallback to Simple NLP", () => {
		test("should fallback to simple NLP when LLM is unavailable", async () => {
			const mockIntent = {
				type: "booking_create",
				entities: { roomName: "Conference Room A" },
				confidence: 0.4,
				useLLM: true,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(false);
			mockNLP.shouldUseLLM.mockReturnValue(true);
			mockLLMHealth.getStatus.mockReturnValue("disconnected");

			// Mock the simple NLP handler
			const handleSimpleNLPIntentSpy = vi.spyOn(
				terminal as any,
				"handleSimpleNLPIntent",
			);
			handleSimpleNLPIntentSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand("book Conference Room A tomorrow");

			expect(mockNLP.parseIntent).toHaveBeenCalledWith(
				"book Conference Room A tomorrow",
			);
			expect(mockNLP.hasHighConfidence).toHaveBeenCalledWith(mockIntent);
			expect(mockLLMHealth.getStatus).toHaveBeenCalled();
			expect(mockLLMService.parseIntent).not.toHaveBeenCalled();
			expect(handleSimpleNLPIntentSpy).toHaveBeenCalledWith(mockIntent);
		});

		test("should fallback to simple NLP when LLM service fails", async () => {
			const mockIntent = {
				type: "booking_create",
				entities: { roomName: "Conference Room A" },
				confidence: 0.4,
				useLLM: true,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(false);
			mockNLP.shouldUseLLM.mockReturnValue(true);
			mockLLMHealth.getStatus.mockReturnValue("connected");
			mockLLMService.parseIntent.mockRejectedValue(
				new Error("LLM service unavailable"),
			);

			// Mock the simple NLP handler
			const handleSimpleNLPIntentSpy = vi.spyOn(
				terminal as any,
				"handleSimpleNLPIntent",
			);
			handleSimpleNLPIntentSpy.mockResolvedValue(undefined);

			await (terminal as any).processCommand("book Conference Room A tomorrow");

			expect(mockLLMService.parseIntent).toHaveBeenCalled();
			expect(handleSimpleNLPIntentSpy).toHaveBeenCalledWith(mockIntent);
		});
	});

	describe("Error Handling", () => {
		test("should handle unknown queries with error message", async () => {
			const mockIntent = {
				type: "unknown",
				entities: {},
				confidence: 0.1,
				useLLM: true,
			};

			mockNLP.parseIntent.mockReturnValue(mockIntent);
			mockNLP.hasHighConfidence.mockReturnValue(false);
			mockNLP.shouldUseLLM.mockReturnValue(true);
			mockLLMHealth.getStatus.mockReturnValue("disconnected");

			const addOutputSpy = vi.spyOn(terminal as any, "addOutput");
			const stopThinkingSpy = vi.spyOn(terminal as any, "stopThinking");

			await (terminal as any).processCommand("completely unknown command");

			expect(addOutputSpy).toHaveBeenCalledWith(
				'[ERROR] Command not recognized. Type "help" for available commands.',
				"error",
			);
			expect(stopThinkingSpy).toHaveBeenCalled();
		});
	});

	describe("LLM Intent Execution", () => {
		test("should execute getRooms intent from LLM", async () => {
			const mockLLMIntent = {
				action: "getRooms",
				params: {},
			};

			const handleRoomsCommandSpy = vi.spyOn(
				terminal as any,
				"handleRoomsCommand",
			);
			handleRoomsCommandSpy.mockResolvedValue(undefined);

			await (terminal as any).executeLLMIntent(mockLLMIntent);

			expect(handleRoomsCommandSpy).toHaveBeenCalled();
		});

		test("should execute getBookings intent from LLM", async () => {
			const mockLLMIntent = {
				action: "getBookings",
				params: {},
			};

			const handleBookingsCommandSpy = vi.spyOn(
				terminal as any,
				"handleBookingsCommand",
			);
			handleBookingsCommandSpy.mockResolvedValue(undefined);

			await (terminal as any).executeLLMIntent(mockLLMIntent);

			expect(handleBookingsCommandSpy).toHaveBeenCalled();
		});

		test("should handle needsMoreInfo intent from LLM", async () => {
			const mockLLMIntent = {
				action: "needsMoreInfo",
				params: {},
				response: "Please specify start time and duration.",
			};

			const addOutputSpy = vi.spyOn(terminal as any, "addOutput");
			const stopThinkingSpy = vi.spyOn(terminal as any, "stopThinking");

			await (terminal as any).executeLLMIntent(mockLLMIntent);

			expect(stopThinkingSpy).toHaveBeenCalled();
			expect(addOutputSpy).toHaveBeenCalledWith(
				"Please specify start time and duration.",
				"system-output",
			);
		});

		test("should handle unknown intent from LLM", async () => {
			const mockLLMIntent = {
				action: "unknown",
				params: {},
				response: "Query irrelevant. State operational requirements.",
			};

			const addOutputSpy = vi.spyOn(terminal as any, "addOutput");
			const stopThinkingSpy = vi.spyOn(terminal as any, "stopThinking");

			await (terminal as any).executeLLMIntent(mockLLMIntent);

			expect(stopThinkingSpy).toHaveBeenCalled();
			expect(addOutputSpy).toHaveBeenCalledWith(
				"Query irrelevant. State operational requirements.",
				"system-output",
			);
		});
	});
});
