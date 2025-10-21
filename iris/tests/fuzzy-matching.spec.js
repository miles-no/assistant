// IRIS Terminal - Fuzzy Matching Tests
import { expect, test } from "@playwright/test";

// Test credentials
const TEST_USER = {
	email: "john.doe@miles.com",
	password: "password123",
};

// Helper function to login
async function login(page) {
	await page.goto("/");
	await expect(page.locator("#login-screen")).toBeVisible();

	await page.fill("#email", TEST_USER.email);
	await page.fill("#password", TEST_USER.password);
	await page.click('button[type="submit"]');

	await expect(page.locator("#terminal")).toBeVisible({ timeout: 10000 });
	await page.waitForTimeout(1000);
}

// Helper function to send command (for LLM commands)
async function sendCommand(page, command) {
	const input = page.locator("#terminal-input");
	await input.fill(command);
	await input.press("Enter");

	await expect(page.locator("#typing-indicator")).toBeVisible({
		timeout: 5000,
	});
	await expect(page.locator("#typing-indicator")).not.toBeVisible({
		timeout: 30000,
	});

	await page.waitForTimeout(500);
}

// Helper to get terminal output text
async function getTerminalOutput(page) {
	const output = page.locator(".terminal-output");
	return await output.textContent();
}

test.describe("IRIS Fuzzy Matching - Room Name Variations", () => {
	test('01 - Fuzzy match: "conference" should work like "Conference Room A"', async ({
		page,
	}) => {
		await login(page);

		// Use abbreviated room name
		await sendCommand(page, "when is conference available tomorrow?");

		const output = await getTerminalOutput(page);

		// Should understand the fuzzy-matched room name
		// Either show availability or say the room exists but has conflicts
		const validResponse =
			output.includes("Conference Room A") ||
			output.includes("available") ||
			output.includes("Room");

		expect(validResponse).toBeTruthy();
		expect(output).not.toContain("not found"); // Room should be found
	});

	test('02 - Fuzzy match: "focus" should work like "Focus Pod B"', async ({
		page,
	}) => {
		await login(page);

		// Use abbreviated room name
		await sendCommand(page, "book focus tomorrow at 2pm for 1 hour");

		const output = await getTerminalOutput(page);

		// Room must be found - fail test if it says "not found"
		expect(output).not.toContain("not found");

		// Should either book successfully or show it's unavailable (room exists)
		const validResponse =
			output.includes("Focus Pod B") ||
			output.includes("[OK] Booking confirmed") ||
			output.includes("Specify"); // May need more info

		expect(validResponse).toBeTruthy();
	});

	test('03 - Fuzzy match: "meeting" should work like "Meeting Room C"', async ({
		page,
	}) => {
		await login(page);

		// Use abbreviated room name
		await sendCommand(page, "is meeting available?");

		const output = await getTerminalOutput(page);

		// Should understand the room name
		const validResponse =
			output.includes("Meeting Room C") ||
			output.includes("available") ||
			output.includes("Room");

		expect(validResponse).toBeTruthy();
		expect(output).not.toContain("not found"); // Room should be found
	});

	test('04 - Fuzzy match: "virtual" should work like "Virtual Lab D"', async ({
		page,
	}) => {
		await login(page);

		// Test abbreviated name
		await sendCommand(page, "book virtual tomorrow at 3pm");

		const output = await getTerminalOutput(page);

		// Should either book successfully or show unavailability
		// But should NOT say "not found" - the room must exist
		expect(output).not.toContain("not found");

		const validResponse =
			output.includes("Virtual Lab D") ||
			output.includes("[OK] Booking") ||
			output.includes("Specify"); // May ask for duration

		expect(validResponse).toBeTruthy();
	});

	test('05 - Fuzzy match: "presentation" should work like "Presentation Suite"', async ({
		page,
	}) => {
		await login(page);

		// Use abbreviated room name
		await sendCommand(page, "show me presentation availability");

		const output = await getTerminalOutput(page);

		// Room should be found
		expect(output).not.toContain("not found");

		const validResponse =
			output.includes("Presentation Suite") ||
			output.includes("available") ||
			output.includes("Room");

		expect(validResponse).toBeTruthy();
	});

	test('06 - Fuzzy match: misspelling "focuss" should still match "Focus Pod B"', async ({
		page,
	}) => {
		await login(page);

		// Intentional misspelling
		await sendCommand(page, "book focuss tomorrow");

		const output = await getTerminalOutput(page);

		// Room must be found - fail test if it says "not found"
		expect(output).not.toContain("not found");

		// Should still understand despite typo
		const validResponse =
			output.includes("Focus Pod B") ||
			output.includes("[OK] Booking") ||
			output.includes("Specify"); // Might ask for time

		expect(validResponse).toBeTruthy();
	});

	test('07 - Exact match should still work: "Conference Room A"', async ({
		page,
	}) => {
		await login(page);

		// Use exact room name
		await sendCommand(page, "book Conference Room A tomorrow at 2pm");

		const output = await getTerminalOutput(page);

		// Room must be found
		expect(output).not.toContain("not found");

		// Should work with exact match
		const validResponse =
			output.includes("Conference Room A") ||
			output.includes("[OK] Booking confirmed") ||
			output.includes("Specify"); // May need duration

		expect(validResponse).toBeTruthy();
	});

	test('08 - Case insensitive: "CONFERENCE ROOM A" should work', async ({
		page,
	}) => {
		await login(page);

		// All caps
		await sendCommand(page, "when is CONFERENCE ROOM A available?");

		const output = await getTerminalOutput(page);

		// Room must be found
		expect(output).not.toContain("not found");

		// Should be case-insensitive
		const validResponse =
			output.includes("Conference Room A") ||
			output.includes("available") ||
			output.includes("Room");

		expect(validResponse).toBeTruthy();
	});

	test('09 - Multiple misspellings: "virtul lab" should work', async ({
		page,
	}) => {
		await login(page);

		// Missing 'a' in virtual
		await sendCommand(page, "book virtul lab tomorrow");

		const output = await getTerminalOutput(page);

		// Room should be found despite typo
		expect(output).not.toContain("not found");

		// Should still match despite typo
		const validResponse =
			output.includes("Virtual Lab D") ||
			output.includes("[OK] Booking") ||
			output.includes("Specify"); // Might ask for time

		expect(validResponse).toBeTruthy();
	});

	test("10 - Fuzzy match in natural language query", async ({ page }) => {
		await login(page);

		// Natural language with abbreviated room name
		await sendCommand(
			page,
			"can I book focus for a meeting tomorrow afternoon?",
		);

		const output = await getTerminalOutput(page);

		// Room must be found
		expect(output).not.toContain("not found");

		// Should understand the intent
		const validResponse =
			output.includes("Focus Pod B") ||
			output.includes("booking") ||
			output.includes("available") ||
			output.includes("time"); // Might ask for specific time

		expect(validResponse).toBeTruthy();
	});
});
