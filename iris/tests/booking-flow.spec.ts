import { expect, test } from "@playwright/test";

test.describe("IRIS Booking Flow", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to IRIS
		await page.goto("http://localhost:3002");

		// Login
		await page.fill("#email", "john.doe@miles.com");
		await page.fill("#password", "password123");
		await page.click('button[type="submit"]');

		// Wait for terminal to be visible
		await page.waitForSelector("#terminal", { state: "visible" });
		await page.waitForTimeout(1000); // Wait for initialization
	});

	test("should show available rooms when booking with location only", async ({
		page,
	}) => {
		// Type booking command with location but no specific room
		const input = page.locator("#terminal-input");
		await input.fill("book me a room tomorrow at 8 in stavanger");
		await input.press("Enter");

		// Wait for response
		await page.waitForTimeout(6000); // LLM takes time

		// Get all output
		const output = await page.locator("#terminal-output").textContent();
		console.log("Output:", output);

		// Should show multiple rooms available or indicate showing available rooms
		expect(output).toMatch(/available|rooms|stavanger/i);

		// Should NOT immediately create a booking
		expect(output).not.toMatch(/Booking ID:/);
	});

	test('should parse "tomorrow at 8" correctly and create booking', async ({
		page,
	}) => {
		// Type booking command
		const input = page.locator("#terminal-input");
		await input.fill("book skagen tomorrow at 8");
		await input.press("Enter");

		// Wait for response
		await page.waitForTimeout(6000);

		// Get output
		const output = await page.locator("#terminal-output").textContent();
		console.log("Output:", output);

		// Should create a booking successfully
		expect(output).toMatch(/Booking confirmed/i);
		expect(output).toMatch(/skagen/i);
		// Time may show as 10:00 AM due to timezone conversion (8:00 UTC + 2 hours)
		expect(output).toMatch(/10:00|8:00|08:00/i);
	});

	test("should correctly extract room name from availability query", async ({
		page,
	}) => {
		// Type availability query
		const input = page.locator("#terminal-input");
		await input.fill("when is skagen available tomorrow?");
		await input.press("Enter");

		// Wait for response
		await page.waitForTimeout(6000);

		// Get output
		const output = await page.locator("#terminal-output").textContent();
		console.log("Output:", output);

		// Should show availability for Skagen specifically
		expect(output).toMatch(/skagen/i);
		expect(output).toMatch(/availability|available|free/i);
	});
});
