// LLM Service Tests
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { ApiClient } from "../src/services/api-client";
import { LLMService } from "../src/services/llm-service";

// Mock fetch
global.fetch = vi.fn();

describe("LLM Service", () => {
	let llmService: LLMService;
	let mockApiClient: ApiClient;

	beforeEach(() => {
		mockApiClient = new ApiClient("http://localhost:3000");
		llmService = new LLMService(mockApiClient, "http://localhost:3000");

		// Mock localStorage
		const localStorageMock = {
			getItem: vi.fn().mockReturnValue("test-token"),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		};
		global.localStorage = localStorageMock;

		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("parseIntent", () => {
		test("should successfully parse intent from LLM service", async () => {
			const mockResponse = {
				action: "getRooms",
				params: {},
				response: null,
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await llmService.parseIntent("show rooms", "user123");

			expect(fetch).toHaveBeenCalledWith("http://localhost:3002/api/intent", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify({
					command: "show rooms",
					userId: "user123",
				}),
			});

			expect(result).toEqual({
				action: "getRooms",
				params: {},
				response: null,
			});
		});

		test("should handle booking creation intent", async () => {
			const mockResponse = {
				action: "createBooking",
				params: {
					roomName: "Conference Room A",
					startTime: "2025-10-22T14:00:00Z",
					duration: 60,
					title: "Team Meeting",
				},
				response: null,
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await llmService.parseIntent(
				"book Conference Room A tomorrow at 2pm for 1 hour",
				"user123",
			);

			expect(result.action).toBe("createBooking");
			expect(result.params?.roomName).toBe("Conference Room A");
			expect(result.params?.duration).toBe(60);
		});

		test("should handle needsMoreInfo response", async () => {
			const mockResponse = {
				action: "needsMoreInfo",
				params: {
					roomName: "Conference Room A",
					missingFields: ["startTime", "duration"],
				},
				response: "Specify start time and duration for booking.",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await llmService.parseIntent(
				"book Conference Room A",
				"user123",
			);

			expect(result.action).toBe("needsMoreInfo");
			expect(result.response).toBe(
				"Specify start time and duration for booking.",
			);
			expect(result.params?.missingFields).toEqual(["startTime", "duration"]);
		});

		test("should handle unknown query response", async () => {
			const mockResponse = {
				action: "unknown",
				params: {},
				response: "Query irrelevant. State operational requirements.",
			};

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			const result = await llmService.parseIntent(
				"what's the weather like?",
				"user123",
			);

			expect(result.action).toBe("unknown");
			expect(result.response).toBe(
				"Query irrelevant. State operational requirements.",
			);
		});

		test("should throw error when service is unavailable", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 503,
				statusText: "Service Unavailable",
			});

			await expect(
				llmService.parseIntent("test command", "user123"),
			).rejects.toThrow("LLM service unavailable: 503 Service Unavailable");
		});

		test("should throw error when network fails", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockRejectedValueOnce(new Error("Network error"));

			await expect(
				llmService.parseIntent("test command", "user123"),
			).rejects.toThrow("Network error");
		});

		test("should handle malformed JSON response", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => {
					throw new Error("Invalid JSON");
				},
			});

			await expect(
				llmService.parseIntent("test command", "user123"),
			).rejects.toThrow("Invalid JSON");
		});
	});

	describe("isAvailable", () => {
		test("should return true when health check succeeds", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
			});

			const result = await llmService.isAvailable();

			expect(fetch).toHaveBeenCalledWith("http://localhost:3002/health", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
				},
			});

			expect(result).toBe(true);
		});

		test("should return false when health check fails", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: false,
			});

			const result = await llmService.isAvailable();

			expect(result).toBe(false);
		});

		test("should return false when network fails", async () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockRejectedValueOnce(new Error("Network error"));

			const result = await llmService.isAvailable();

			expect(result).toBe(false);
		});
	});

	describe("getAuthToken", () => {
		test("should get token from localStorage", () => {
			// This is tested indirectly through parseIntent
			const mockResponse = { action: "getRooms", params: {} };

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			llmService.parseIntent("test", "user123");

			expect(global.localStorage.getItem).toHaveBeenCalledWith("irisAuthToken");
		});

		test("should handle missing token", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(global.localStorage.getItem as any).mockReturnValue(null);

			const mockResponse = { action: "getRooms", params: {} };

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			});

			llmService.parseIntent("test", "user123");

			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer ",
					}),
				}),
			);
		});
	});

	describe("getBaseUrl", () => {
		test("should replace port 3000 with 3002", async () => {
			const service = new LLMService(mockApiClient, "http://localhost:3000");

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ action: "getRooms", params: {} }),
			});

			await service.parseIntent("test", "user123");

			expect(fetch).toHaveBeenCalledWith(
				"http://localhost:3002/api/intent",
				expect.any(Object),
			);
		});

		test("should use default port when API URL has no port", async () => {
			const service = new LLMService(mockApiClient, "http://localhost");

			// biome-ignore lint/suspicious/noExplicitAny: Test code needs access to private members
			(fetch as any).mockResolvedValueOnce({
				ok: true,
				json: async () => ({ action: "getRooms", params: {} }),
			});

			await service.parseIntent("test", "user123");

			expect(fetch).toHaveBeenCalledWith(
				"http://localhost:3002/api/intent",
				expect.any(Object),
			);
		});
	});
});
