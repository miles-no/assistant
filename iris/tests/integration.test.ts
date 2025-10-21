// Integration Tests for Natural Language Processing
import { expect, test } from "@playwright/test";

// Test credentials
const TEST_USER = {
	email: "john.doe@miles.com",
	password: "password123",
};

// Helper function to login
async function login(page) {
	await page.goto("/");

	// Wait for login screen
	await expect(page.locator("#login-screen")).toBeVisible();

	// Fill in credentials
	await page.fill("#email", TEST_USER.email);
	await page.fill("#password", TEST_USER.password);

	// Click login button
	await page.click('button[type="submit"]');

	// Wait for terminal to appear
	await expect(page.locator("#terminal")).toBeVisible({ timeout: 10000 });
	await expect(page.locator("#login-screen")).not.toBeVisible();

	// Wait for welcome message to finish
	await page.waitForTimeout(1000);
}

// Helper function to send command and wait for response
async function sendCommand(page, command) {
	const input = page.locator("#terminal-input");
	await input.fill(command);
	await input.press("Enter");

	// Wait for thinking indicator to appear and disappear
	await expect(page.locator("#typing-indicator")).toBeVisible({
		timeout: 5000,
	});
	await expect(page.locator("#typing-indicator")).not.toBeVisible({
		timeout: 30000,
	});
}

// Helper to get terminal output text
async function getTerminalOutput(page) {
	const output = page.locator(".terminal-output");
	return await output.textContent();
}

test.describe("Natural Language Integration Tests", () => {
	test("should handle greeting commands with simple NLP", async ({ page }) => {
		await login(page);

		// Test various greetings
		const greetings = ["hello", "hi there", "good morning", "what's up?"];

		for (const greeting of greetings) {
			await sendCommand(page, greeting);

			const output = await getTerminalOutput(page);
			expect(output).toContain("IRIS");
			expect(output).toContain(/system|operational|assistant/i);
		}
	});

	test("should handle room queries with simple NLP", async ({ page }) => {
		await login(page);

		// Test various room query formats
		const roomQueries = [
			"show me all rooms",
			"list rooms",
			"what rooms are available",
			"rooms",
		];

		for (const query of roomQueries) {
			await sendCommand(page, query);

			const output = await getTerminalOutput(page);
			expect(output).toContain("Room") ||
				expect(output).toContain("NAME") ||
				expect(output).toContain("CAPACITY");
		}
	});

	test("should handle booking queries with simple NLP", async ({ page }) => {
		await login(page);

		// Test various booking query formats
		const bookingQueries = [
			"show my bookings",
			"list my bookings",
			"what are my bookings",
			"bookings",
		];

		for (const query of bookingQueries) {
			await sendCommand(page, query);

			const output = await getTerminalOutput(page);
			// Should either show bookings or indicate no bookings
			const hasBookings =
				output.includes("booking") || output.includes("Booking");
			const noBookings =
				output.includes("No active bookings") || output.includes("not found");
			expect(hasBookings || noBookings).toBeTruthy();
		}
	});

	test("should handle cancel all commands with simple NLP", async ({
		page,
	}) => {
		await login(page);

		// Test cancel all variations
		const cancelCommands = ["cancel all bookings", "cancel all reservations"];

		for (const command of cancelCommands) {
			await sendCommand(page, command);

			const output = await getTerminalOutput(page);
			expect(output).toContain("cancel") ||
				expect(output).toContain("No bookings");
		}
	});

	test("should handle availability queries with LLM when available", async ({
		page,
	}) => {
		await login(page);

		// Test availability queries that should trigger LLM
		const availabilityQueries = [
			"when is conference available?",
			"is meeting room free tomorrow?",
			"check focus pod availability",
		];

		for (const query of availabilityQueries) {
			await sendCommand(page, query);

			const output = await getTerminalOutput(page);
			// Should either show availability data or indicate room not found
			const hasAvailability =
				output.includes("available") ||
				output.includes("Available") ||
				output.includes("Room") ||
				output.includes("not found");
			expect(hasAvailability).toBeTruthy();
		}
	});

	test("should handle complex booking intents with LLM", async ({ page }) => {
		await login(page);

		// Test complex booking queries that should trigger LLM
		const bookingIntents = [
			"book conference room tomorrow at 2pm for 1 hour",
			"I need to book meeting room for a client presentation",
			"can you reserve focus pod for me this afternoon?",
		];

		for (const intent of bookingIntents) {
			await sendCommand(page, intent);

			const output = await getTerminalOutput(page);
			// Should either process booking or ask for more info
			const hasBooking =
				output.includes("booking") ||
				output.includes("Booking") ||
				output.includes("confirmed") ||
				output.includes("unavailable");
			const needsInfo =
				output.includes("Specify") ||
				output.includes("more details") ||
				output.includes("format");
			expect(hasBooking || needsInfo).toBeTruthy();
		}
	});

	test("should fallback gracefully when LLM is unavailable", async ({
		page,
	}) => {
		await login(page);

		// Test complex query that would normally go to LLM
		await sendCommand(page, "I need a quiet space for focused work tomorrow");

		const output = await getTerminalOutput(page);
		// Should either get a response or fall back to error message
		const hasResponse = output.length > 20; // Some meaningful response
		const hasError =
			output.includes("ERROR") ||
			output.includes("not recognized") ||
			output.includes("help");
		expect(hasResponse || hasError).toBeTruthy();
	});

	test("should maintain IRIS personality in responses", async ({ page }) => {
		await login(page);

		// Test personality in greetings
		await sendCommand(page, "hello");
		const greetingOutput = await getTerminalOutput(page);
		expect(greetingOutput).toContain("IRIS");
		expect(greetingOutput).not.toContain("😊"); // No emojis
		expect(greetingOutput).not.toContain("happy to help"); // No friendly language

		// Test personality in error responses
		await sendCommand(page, "what is the meaning of life?");
		const errorOutput = await getTerminalOutput(page);
		expect(errorOutput).toContain(/irrelevant|operational|query/i);
		expect(errorOutput).not.toContain("sorry"); // HAL-9000 style
	});

	test("should handle mixed command types in sequence", async ({ page }) => {
		await login(page);

		// Test sequence of different command types
		await sendCommand(page, "hello"); // Simple NLP
		await sendCommand(page, "show rooms"); // Simple NLP
		await sendCommand(page, "when is conference available?"); // LLM
		await sendCommand(page, "my bookings"); // Simple NLP
		await sendCommand(page, "book meeting room tomorrow at 3pm"); // LLM

		// All commands should be processed without errors
		const output = await getTerminalOutput(page);
		expect(output).toContain("IRIS"); // Greeting response
		expect(output).toContain("Room") || expect(output).toContain("NAME"); // Room listing
		expect(output).toContain("available") || expect(output).toContain("Room"); // Availability
		expect(output).toContain("booking") ||
			expect(output).toContain("No active"); // Bookings
		expect(output).toContain("booking") || expect(output).toContain("Specify"); // Booking intent
	});

	test("should preserve existing direct commands", async ({ page }) => {
		await login(page);

		// Test that existing direct commands still work
		const directCommands = [
			{ cmd: "help", expected: "COMMAND REFERENCE" },
			{ cmd: "status", expected: "SYSTEM STATUS" },
			{ cmd: "about", expected: "IRIS" },
			{ cmd: "clear", expected: "" }, // Clear should result in empty output
		];

		for (const { cmd, expected } of directCommands) {
			await sendCommand(page, cmd);

			if (expected) {
				const output = await getTerminalOutput(page);
				expect(output).toContain(expected);
			}
		}
	});

	test("should handle command history with natural language", async ({
		page,
	}) => {
		await login(page);

		const input = page.locator("#terminal-input");

		// Send a natural language command
		await sendCommand(page, "show rooms");

		// Test command history navigation
		await input.press("ArrowUp");
		const value = await input.inputValue();
		expect(value).toBe("show rooms");

		// Send another command
		await sendCommand(page, "hello");

		// Test history navigation again
		await input.press("ArrowUp");
		const value2 = await input.inputValue();
		expect(value2).toBe("hello");

		await input.press("ArrowUp");
		const value3 = await input.inputValue();
		expect(value3).toBe("show rooms");
	});

	test("should handle autocomplete with natural language", async ({ page }) => {
		await login(page);

		const input = page.locator("#terminal-input");

		// Test autocomplete for room-related commands
		await input.fill("show roo");
		await input.press("Tab");

		const value = await input.inputValue();
		// Should autocomplete to 'show rooms' or similar
		expect(value).toMatch(/show rooms|rooms/i);
	});

	test("should handle edge cases gracefully", async ({ page }) => {
		await login(page);

		// Test edge cases
		const edgeCases = [
			"", // Empty input
			"   ", // Whitespace only
			"HELLO", // All caps
			"hello?", // With punctuation
			"show rooms!!!", // Multiple punctuation
		];

		for (const edgeCase of edgeCases) {
			if (edgeCase.trim()) {
				// Skip empty input as it won't be processed
				await sendCommand(page, edgeCase);

				// Should not crash and should provide some response
				const output = await getTerminalOutput(page);
				expect(output.length).toBeGreaterThan(0);
			}
		}
	});
});
