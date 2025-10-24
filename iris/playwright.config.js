// Playwright Test Configuration
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	testMatch: "**/*.spec.{js,ts}",
	fullyParallel: false, // Run tests sequentially to avoid conflicts
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: 1, // Single worker to avoid race conditions
	reporter: "list",

	use: {
		baseURL: `http://localhost:${process.env.PORT || 3002}`,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		headless: true, // Run in headless mode to avoid blocking browser windows
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],

	// Run local dev server before tests
	webServer: {
		command: `PORT=${process.env.PORT || 3002} npm run dev:server`,
		url: `http://localhost:${process.env.PORT || 3002}/health`,
		reuseExistingServer: false,
		timeout: 10000,
	},
});
