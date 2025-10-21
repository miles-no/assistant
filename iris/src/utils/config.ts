/**
 * IRIS Configuration
 * Environment variables and constants
 */

interface Environment {
	readonly NODE_ENV: "development" | "production";
	readonly API_URL: string;
	readonly PORT: string;
}

declare const process: {
	env: Environment;
};

// Environment configuration
export const config = {
	API_URL: process.env.API_URL || "http://localhost:3000",
	PORT: parseInt(process.env.PORT || "3002", 10),
	isDevelopment: process.env.NODE_ENV === "development",
	isProduction: process.env.NODE_ENV === "production",
} as const;

// IRIS-specific constants
export const IRIS_CONSTANTS = {
	// Eye animation constants
	MAX_MOVEMENT: 20,
	SMOOTHING: 0.4,
	DEPTH_SMOOTHING: 0.05,
	MOUSE_IDLE_TIMEOUT: 1500, // ms before eye returns to center

	// State depths
	DEPTH: {
		IDLE: 0.55,
		THINKING: 0.1,
		ALERT: 1.0,
		ERROR: 0.0,
	} as const,

	// Timing
	DURATION: {
		ERROR: 4000,
		BLINK: 150,
		ALERT: 500,
	} as const,

	// API timeouts
	TIMEOUT: {
		DEFAULT: 10000,
		BOOKING: 15000,
	} as const,

	// Animation
	ANIMATION: {
		CRT_FLICKER_INTERVAL: 2000,
		INTENSITY_VARIATION_INTERVAL: 3000,
	} as const,
} as const;
