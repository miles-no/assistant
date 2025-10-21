import { defineConfig } from "vite";

export default defineConfig({
	publicDir: "public",
	build: {
		outDir: "dist",
		rollupOptions: {
			output: {
				entryFileNames: "index.js",
				chunkFileNames: "[name].js",
				assetFileNames: "[name].[ext]",
			},
		},
	},
	server: {
		port: 3003,
		open: true, // Auto-open browser in dev mode
		proxy: {
			"/api": "http://localhost:3002",
			"/health": "http://localhost:3002",
		},
	},
});
