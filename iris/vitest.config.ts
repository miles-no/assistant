import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node", // Use node environment
		globals: true,
		setupFiles: ["./tests/setup.ts"],
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
