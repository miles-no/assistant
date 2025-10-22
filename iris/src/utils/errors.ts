import type { ApiError } from "../services/api-client";

/**
 * IRIS Error handling utilities
 */

export class IrisError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: unknown,
	) {
		super(message);
		this.name = "IrisError";
	}
}

export class ApiRequestError extends IrisError {
	constructor(
		message: string,
		public readonly statusCode?: number,
		context?: unknown,
	) {
		super(message, "API_REQUEST_ERROR", context);
		this.name = "ApiRequestError";
	}
}

export class ValidationError extends IrisError {
	constructor(
		message: string,
		public readonly details?: Array<{
			path: string;
			message: string;
		}>,
	) {
		super(message, "VALIDATION_ERROR", details);
		this.name = "ValidationError";
	}
}

export class AuthenticationError extends IrisError {
	constructor(message: string = "Authentication required") {
		super(message, "AUTHENTICATION_ERROR");
		this.name = "AuthenticationError";
	}
}

export class AuthorizationError extends IrisError {
	constructor(message: string = "Insufficient permissions") {
		super(message, "AUTHORIZATION_ERROR");
		this.name = "AuthorizationError";
	}
}

/**
 * Convert API error response to typed error
 */
export function handleApiError(error: unknown, operation: string): never {
	if (isApiError(error)) {
		const apiError = error as ApiError;

		if (apiError.details) {
			throw new ValidationError(
				`${operation} failed: ${apiError.error}`,
				apiError.details,
			);
		}

		// Check for specific error types
		if (apiError.error.includes("Invalid or expired token")) {
			throw new AuthenticationError(apiError.error);
		}

		if (apiError.error.includes("Insufficient permissions")) {
			throw new AuthorizationError(apiError.error);
		}

		throw new ApiRequestError(`${operation} failed: ${apiError.error}`);
	}

	if (error instanceof Error) {
		throw new IrisError(
			`${operation} failed: ${error.message}`,
			"UNKNOWN_ERROR",
			error,
		);
	}

	throw new IrisError(
		`${operation} failed: Unknown error`,
		"UNKNOWN_ERROR",
		error,
	);
}

/**
 * Type guard for API error responses
 */
function isApiError(error: unknown): error is ApiError {
	return (
		typeof error === "object" &&
		error !== null &&
		"error" in error &&
		typeof (error as ApiError).error === "string"
	);
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
	if (error instanceof IrisError) {
		return error.message;
	}

	if (error instanceof Error) {
		// Handle specific network errors
		if (
			error.message.includes("Failed to fetch") ||
			error.message.includes("NetworkError") ||
			error.message.includes("ERR_CONNECTION_REFUSED") ||
			error.message.includes("ERR_NETWORK")
		) {
			return "Cannot connect to the booking system. Please ensure all services are running and try again.";
		}

		// Handle timeout errors
		if (
			error.message.includes("timeout") ||
			error.message.includes("TimeoutError")
		) {
			return "Connection timed out. The booking system may be experiencing high load.";
		}

		return error.message;
	}

	if (isApiError(error)) {
		return error.error;
	}

	return "An unknown error occurred";
}
