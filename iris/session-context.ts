// Session Context Manager for IRIS
// Keeps track of conversation history and context for each user session

export interface ContextEntry {
	timestamp: Date;
	command: string;
	action: string;
	params?: Record<string, unknown>;
	response?: string;
}

export interface SessionContext {
	userId: string;
	history: ContextEntry[];
	lastUpdated: Date;
}

// In-memory store (could be moved to Redis for production)
const sessions = new Map<string, SessionContext>();

// Configuration
const MAX_HISTORY_LENGTH = 10; // Keep last 10 interactions
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Add an interaction to a user's session context
 */
export function addToContext(
	userId: string,
	command: string,
	action: string,
	params?: Record<string, unknown>,
	response?: string,
): void {
	let session = sessions.get(userId);

	if (!session) {
		session = {
			userId,
			history: [],
			lastUpdated: new Date(),
		};
		sessions.set(userId, session);
	}

	// Add new entry
	session.history.push({
		timestamp: new Date(),
		command,
		action,
		params,
		response,
	});

	// Keep only the most recent entries
	if (session.history.length > MAX_HISTORY_LENGTH) {
		session.history = session.history.slice(-MAX_HISTORY_LENGTH);
	}

	session.lastUpdated = new Date();
}

/**
 * Get a user's conversation context
 */
export function getContext(userId: string): ContextEntry[] {
	const session = sessions.get(userId);

	if (!session) {
		return [];
	}

	// Check if session has expired
	const now = Date.now();
	const lastUpdate = session.lastUpdated.getTime();

	if (now - lastUpdate > SESSION_TIMEOUT_MS) {
		// Session expired, clear it
		sessions.delete(userId);
		return [];
	}

	return session.history;
}

/**
 * Get the most recent interaction for a user
 */
export function getLastInteraction(userId: string): ContextEntry | null {
	const history = getContext(userId);
	return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * Clear a user's session context
 */
export function clearContext(userId: string): void {
	sessions.delete(userId);
}

/**
 * Clean up expired sessions (call periodically)
 */
export function cleanupExpiredSessions(): number {
	const now = Date.now();
	let cleanedCount = 0;

	for (const [userId, session] of sessions.entries()) {
		const lastUpdate = session.lastUpdated.getTime();
		if (now - lastUpdate > SESSION_TIMEOUT_MS) {
			sessions.delete(userId);
			cleanedCount++;
		}
	}

	return cleanedCount;
}

// Cleanup expired sessions every 15 minutes
setInterval(
	() => {
		const cleaned = cleanupExpiredSessions();
		if (cleaned > 0) {
			console.log(`🧹 Cleaned up ${cleaned} expired session(s)`);
		}
	},
	15 * 60 * 1000,
);

export default {
	addToContext,
	getContext,
	getLastInteraction,
	clearContext,
	cleanupExpiredSessions,
};
