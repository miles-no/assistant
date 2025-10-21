import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node", // Use node environment instead of jsdom
		globals: true,
		setupFiles: ["./tests/setup.ts"],
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
