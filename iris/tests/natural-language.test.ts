// Natural Language Processing Tests
import { beforeEach, describe, expect, test } from "vitest";
import { NaturalLanguageProcessor } from "../src/utils/natural-language";

describe("Natural Language Processor", () => {
	let nlp: NaturalLanguageProcessor;

	beforeEach(() => {
		nlp = new NaturalLanguageProcessor();
	});

	describe("Greeting Detection", () => {
		test("should detect simple greetings", () => {
			const greetings = ["hello", "hi", "hey", "hello?", "hi!", "hey there"];

			greetings.forEach((greeting) => {
				const intent = nlp.parseIntent(greeting);
				expect(intent.type).toBe("greeting");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
				expect(intent.useLLM).toBe(false);
			});
		});

		test("should detect formal greetings", () => {
			const formalGreetings = [
				"greetings",
				"good morning",
				"good afternoon",
				"good evening",
			];

			formalGreetings.forEach((greeting) => {
				const intent = nlp.parseIntent(greeting);
				expect(intent.type).toBe("greeting");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
				expect(intent.useLLM).toBe(false);
			});
		});

		test("should detect conversational greetings", () => {
			const conversationalGreetings = [
				"what's up",
				"how are you",
				"what's up?",
				"how are you?",
			];

			conversationalGreetings.forEach((greeting) => {
				const intent = nlp.parseIntent(greeting);
				expect(intent.type).toBe("greeting");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
				expect(intent.useLLM).toBe(false);
			});
		});
	});

	describe("Room Query Detection", () => {
		test("should detect room listing requests", () => {
			const roomQueries = [
				"show me all rooms",
				"list rooms",
				"what rooms are available",
				"rooms available",
				"show rooms",
				"list all rooms",
				"what rooms",
				"rooms",
			];

			roomQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(intent.type).toBe("rooms_query");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.7);
				expect(intent.useLLM).toBe(false);
			});
		});
	});

	describe("Booking Query Detection", () => {
		test("should detect booking listing requests", () => {
			const bookingQueries = [
				"show my bookings",
				"list my bookings",
				"what are my bookings",
				"my bookings",
				"show bookings",
				"list bookings",
				"what bookings",
				"bookings",
			];

			bookingQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(intent.type).toBe("bookings_query");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.7);
				expect(intent.useLLM).toBe(false);
			});
		});
	});

	describe("Availability Check Detection", () => {
		test("should detect availability queries", () => {
			const availabilityQueries = [
				"when is conference available",
				"is conference free",
				"conference availability",
				"check conference availability",
				"is meeting room free",
				"when is focus pod available",
			];

			availabilityQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(intent.type).toBe("availability_check");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.5);
				expect(intent.useLLM).toBe(true);
				expect(intent.entities.roomName).toBeTruthy();
			});
		});

		test("should extract room names from availability queries", () => {
			const testCases = [
				{ input: "when is conference available", roomName: "conference" },
				{ input: "is meeting room free", roomName: "meeting room" },
				{ input: "check focus pod availability", roomName: "focus pod" },
				{
					input: "presentation suite availability",
					roomName: "presentation suite",
				},
			];

			testCases.forEach(({ input, roomName }) => {
				const intent = nlp.parseIntent(input);
				expect(intent.entities.roomName).toBe(roomName);
			});
		});
	});

	describe("Booking Intent Detection", () => {
		test("should detect booking creation requests", () => {
			const bookingIntents = [
				"book conference tomorrow",
				"reserve meeting room today",
				"schedule focus pod at 2pm",
				"can I book conference room",
				"I want to book meeting room",
				"book presentation room for 1 hour",
			];

			bookingIntents.forEach((intent) => {
				const parsed = nlp.parseIntent(intent);
				expect(parsed.type).toBe("booking_create");
				expect(parsed.confidence).toBeLessThan(0.5);
				expect(parsed.useLLM).toBe(true);
			});
		});

		test("should extract room names from booking intents", () => {
			const testCases = [
				{ input: "book conference tomorrow", roomName: "conference" },
				{ input: "reserve meeting room today", roomName: "meeting room" },
				{ input: "schedule focus pod at 2pm", roomName: "focus pod" },
			];

			testCases.forEach(({ input, roomName }) => {
				const intent = nlp.parseIntent(input);
				expect(intent.entities.roomName).toBe(roomName);
			});
		});
	});

	describe("Cancel All Detection", () => {
		test("should detect cancel all requests", () => {
			const cancelAllQueries = [
				"cancel all bookings",
				"cancel all reservations",
				"cancel all today",
				"cancel all tomorrow",
				"cancel all this week",
			];

			cancelAllQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(intent.type).toBe("cancel_all");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
				expect(intent.useLLM).toBe(false);
			});
		});
	});

	describe("LLM Fallback Detection", () => {
		test("should fallback to LLM for complex queries", () => {
			const complexQueries = [
				"I need a room for a client meeting next week",
				"can you help me find a quiet space to work",
				"what would you recommend for a team brainstorming session",
				"is there anything available for tomorrow afternoon",
				"book me something nice",
			];

			complexQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(intent.type).toBe("llm_fallback");
				expect(intent.confidence).toBeLessThan(0.3);
				expect(intent.useLLM).toBe(true);
			});
		});
	});

	describe("Confidence Thresholds", () => {
		test("should correctly identify high confidence intents", () => {
			const highConfidenceQueries = [
				"hello",
				"show rooms",
				"my bookings",
				"cancel all bookings",
			];

			highConfidenceQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(nlp.hasHighConfidence(intent)).toBe(true);
				expect(nlp.shouldUseLLM(intent)).toBe(false);
			});
		});

		test("should correctly identify low confidence intents", () => {
			const lowConfidenceQueries = [
				"book conference tomorrow",
				"when is meeting available",
				"I need a room",
			];

			lowConfidenceQueries.forEach((query) => {
				const intent = nlp.parseIntent(query);
				expect(nlp.hasHighConfidence(intent)).toBe(false);
				expect(nlp.shouldUseLLM(intent)).toBe(true);
			});
		});
	});

	describe("Edge Cases", () => {
		test("should handle empty input", () => {
			const intent = nlp.parseIntent("");
			expect(intent.type).toBe("llm_fallback");
			expect(intent.confidence).toBeLessThan(0.3);
			expect(intent.useLLM).toBe(true);
		});

		test("should handle whitespace-only input", () => {
			const intent = nlp.parseIntent("   ");
			expect(intent.type).toBe("llm_fallback");
			expect(intent.confidence).toBeLessThan(0.3);
			expect(intent.useLLM).toBe(true);
		});

		test("should be case insensitive", () => {
			const variations = ["HELLO", "Hello", "hello", "HeLLo"];

			variations.forEach((variation) => {
				const intent = nlp.parseIntent(variation);
				expect(intent.type).toBe("greeting");
				expect(intent.confidence).toBeGreaterThanOrEqual(0.8);
			});
		});

		test("should handle punctuation", () => {
			const variations = [
				"hello?",
				"hello!",
				"hello.",
				"show rooms?",
				"cancel all bookings.",
			];

			variations.forEach((variation) => {
				const intent = nlp.parseIntent(variation);
				expect(intent.type).not.toBe("unknown");
			});
		});
	});
});
