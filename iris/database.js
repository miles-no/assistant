// IRIS Interaction Logging - SQLite Database

import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const dbPath = path.join(__dirname, "iris-logs.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Create interactions table
db.exec(`
  CREATE TABLE IF NOT EXISTS interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    user_email TEXT,
    command TEXT,
    intent_action TEXT,
    intent_params TEXT,
    response TEXT,
    error TEXT,
    duration_ms INTEGER
  )
`);

// Create index on timestamp for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_timestamp ON interactions(timestamp DESC)
`);

// Create index on user_id for per-user queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_user_id ON interactions(user_id)
`);

console.log("✅ SQLite interaction logging initialized:", dbPath);

// Prepared statements for better performance
const insertInteraction = db.prepare(`
  INSERT INTO interactions (
    user_id,
    user_email,
    command,
    intent_action,
    intent_params,
    response,
    error,
    duration_ms
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getRecentInteractions = db.prepare(`
  SELECT * FROM interactions
  ORDER BY timestamp DESC
  LIMIT ?
`);

const getInteractionsByUser = db.prepare(`
  SELECT * FROM interactions
  WHERE user_id = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

const getInteractionsByAction = db.prepare(`
  SELECT * FROM interactions
  WHERE intent_action = ?
  ORDER BY timestamp DESC
  LIMIT ?
`);

const getErrorInteractions = db.prepare(`
  SELECT * FROM interactions
  WHERE error IS NOT NULL AND error != ''
  ORDER BY timestamp DESC
  LIMIT ?
`);

// Public API
export function logInteraction({
	userId,
	userEmail,
	command,
	intentAction,
	intentParams,
	response,
	error,
	durationMs,
}) {
	try {
		const result = insertInteraction.run(
			userId || null,
			userEmail || null,
			command || null,
			intentAction || null,
			intentParams ? JSON.stringify(intentParams) : null,
			response || null,
			error || null,
			durationMs || null,
		);
		return result.lastInsertRowid;
	} catch (err) {
		console.error("Failed to log interaction:", err.message);
		return null;
	}
}

export function getRecent(limit = 50) {
	try {
		return getRecentInteractions.all(limit);
	} catch (err) {
		console.error("Failed to fetch recent interactions:", err.message);
		return [];
	}
}

export function getByUser(userId, limit = 50) {
	try {
		return getInteractionsByUser.all(userId, limit);
	} catch (err) {
		console.error("Failed to fetch user interactions:", err.message);
		return [];
	}
}

export function getByAction(action, limit = 50) {
	try {
		return getInteractionsByAction.all(action, limit);
	} catch (err) {
		console.error("Failed to fetch action interactions:", err.message);
		return [];
	}
}

export function getErrors(limit = 50) {
	try {
		return getErrorInteractions.all(limit);
	} catch (err) {
		console.error("Failed to fetch error interactions:", err.message);
		return [];
	}
}

// Graceful shutdown
process.on("SIGINT", () => {
	db.close();
	process.exit(0);
});

process.on("SIGTERM", () => {
	db.close();
	process.exit(0);
});

export default {
	logInteraction,
	getRecent,
	getByUser,
	getByAction,
	getErrors,
};
