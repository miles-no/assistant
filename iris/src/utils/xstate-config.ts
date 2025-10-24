import { inspect } from "@xstate/inspect";

/**
 * Check if we're in development mode
 */
const isDev = (import.meta as any)?.env?.DEV ?? false;

/**
 * XState configuration for IRIS Terminal
 * Sets up development debugging and production optimizations
 */

export function setupXState() {
	// Only enable inspector in development
	if (isDev) {
		inspect();

		console.log("🔧 XState Inspector enabled for development");
	} else {
		console.log("🚀 XState running in production mode");
	}
}

/**
 * Global XState configuration options
 */
export const XSTATE_CONFIG = {
	// Development settings
	devTools: isDev,

	// Logging configuration
	logEvents: isDev,
	logExecutions: isDev,

	// Error handling
	strict: true, // Throw on invalid transitions in development
	predictableActionArguments: true,

	// Performance settings
	preserveActionOrder: true,
} as const;

/**
 * Type-safe event logging utility
 */
export function logStateTransition(
	machineId: string,
	from: string,
	to: string,
	event?: string,
) {
	if (XSTATE_CONFIG.logEvents) {
		console.log(
			`🔄 [${machineId}] ${from} → ${to}${event ? ` (${event})` : ""}`,
		);
	}
}

/**
 * Type-safe action execution logging
 */
export function logActionExecution(
	machineId: string,
	action: string,
	context?: any,
) {
	if (XSTATE_CONFIG.logExecutions) {
		console.log(
			`⚡ [${machineId}] Action: ${action}`,
			context ? { context } : "",
		);
	}
}
