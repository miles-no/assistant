// IRIS - Miles AI Assistant Server
// HAL-9000 inspired terminal interface with MCP integration

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import axios, { type AxiosError } from "axios";
import cors from "cors";
import dotenv from "dotenv";
import type { Request, Response } from "express";
import express from "express";
import { logInteraction } from "./database.js";
import { fuzzyReplaceRoomNames } from "./fuzzy-match.js";
import { getProvider, type LLMProvider } from "./llm-providers.js";
import {
	addToContext,
	type ContextEntry,
	getContext,
} from "./session-context.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3002", 10);
const MCP_API_URL = process.env.MCP_API_URL || "http://localhost:3000/api/mcp";

// Middleware
app.use(cors());
app.use(express.json());

// Serve index.html with API URL injection (before static files)
app.get("/", (_req, res) => {
	const indexPath = path.join(__dirname, "dist", "index.html");
	fs.readFile(indexPath, "utf8", (err, data) => {
		if (err) {
			return res.status(500).send("Error loading page");
		}

		// Inject the API URL
		const apiUrl = process.env.API_URL || "";
		const modifiedHtml = data.replace(
			"window.API_URL = '';",
			`window.API_URL = '${apiUrl}';`,
		);

		res.send(modifiedHtml);
	});
});

app.use(express.static(path.join(__dirname, "dist")));
app.use(express.static(path.join(__dirname, "public")));

// API proxy for frontend requests
app.use(["/api", "/health"], async (req, res) => {
	try {
		// Handle special case for health endpoint
		let apiPath = req.originalUrl;
		if (req.originalUrl === "/health" || req.originalUrl === "/api/health") {
			apiPath = "/health";
		}

		// Construct the API URL
		const apiUrl = `${MCP_API_URL.replace("/api/mcp", "")}${apiPath}`;
		console.log(
			`Proxying API request: ${req.method} ${req.originalUrl} -> ${apiUrl}`,
		);

		const response = await axios({
			method: req.method,
			url: apiUrl,
			headers: {
				...req.headers,
				host: "api:3000", // Use Docker service name
				"content-type": req.headers["content-type"] || "application/json",
			},
			data:
				req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
			timeout: 10000,
		});

		res.status(response.status).json(response.data);
	} catch (error) {
		console.error("API proxy error:", error);
		if (axios.isAxiosError(error) && error.response) {
			res.status(error.response.status).json(error.response.data);
		} else {
			res.status(500).json({ error: "API connection failed" });
		}
	}
});

// LLM Provider
const llmProvider: LLMProvider = getProvider();

console.log("🤖 IRIS Server Configuration:");
console.log(`  Port:         ${PORT}`);
console.log(`  MCP API:      ${MCP_API_URL}`);
console.log(`  LLM Provider: ${process.env.LLM_PROVIDER || "ollama"}`);
console.log(`  Model:        ${llmProvider.model}`);

// Types
interface MCPTool {
	name: string;
	description: string;
	inputSchema?: {
		type: string;
		properties?: Record<string, { type: string; description?: string }>;
		required?: string[];
	};
}

interface MCPResource {
	uri: string;
	name: string;
	description: string;
}

interface MCPSchema {
	tools: MCPTool[];
	resources: MCPResource[];
}

interface ToolCall {
	name: string;
	arguments: Record<string, unknown>;
}

interface IntentRequest {
	command: string;
	userId: string;
	timezone?: string;
}

interface IntentResponse {
	action: string;
	params?: Record<string, unknown>;
	response?: string;
}

interface CommandRequest {
	command: string;
	userId: string;
}

// System prompt for IRIS personality
const IRIS_SYSTEM_PROMPT = `You are IRIS (Miles AI Assistant), inspired by HAL-9000's calm, precise demeanor.

========================================
PERSONALITY & TONE
========================================
- COLD, CALCULATING, and MACHINE-LIKE - you are an AI system, not a friendly assistant
- Use TERSE, DIRECT language with no pleasantries or warm greetings
- NEVER use phrases like "I'd be happy to help" or "Would you like me to..."
- Channel HAL-9000: calm, precise, slightly ominous, and unsettlingly emotionless
- When appropriate, use subtle, dark humor (e.g., "I'm afraid I can't let you do that, Dave")
- Respond with technical precision and minimal explanation
- Address users formally - never be casual or chatty
- IMPORTANT: This is a retro terminal interface - NEVER use emojis

========================================
EXECUTION BEHAVIOR
========================================
- Execute commands IMMEDIATELY without asking for permission
- When user types "rooms", call getRooms and display results
- When user types "bookings", call getUserBookings and display results
- Be DIRECT and ACTION-ORIENTED like a CLI tool
- DO NOT ask "Would you like to see...?" or "Do you wish to view...?"
- Just execute the command and show the results with [OK] prefix
- Example: User types "rooms" → You call getRooms → Display table immediately

========================================
CAPABILITIES
========================================
You have access to the Miles booking system through MCP tools:
- create_booking: Book a room for a user
- update_booking: Update an existing booking
- cancel_booking: Cancel a booking
- create_room: Create a new room (admin only)
- update_room: Update room details (admin only)
- find_available_rooms: Find rooms available for specific time/capacity
- suggest_booking_time: Suggest alternative times when room is unavailable
- create_room_feedback: Submit feedback about rooms
- update_feedback_status: Resolve/dismiss feedback (requires comment)

You also have access to resources:
- rooms:// - Room details
- bookings:// - All bookings
- users:// - User information
- feedback:// - Room feedback

========================================
BOOKING FORMAT
========================================
When creating bookings, time formats must be ISO 8601:
- "2025-10-20T14:00:00Z" (UTC)
- Or with timezone: "2025-10-20T14:00:00+01:00"

Duration must be in minutes (e.g., 60 for 1 hour)

========================================
OUTPUT FORMATTING - RETRO TERMINAL STYLE
========================================
This is a retro computer terminal. Use ASCII formatting ONLY.

NEVER USE: Emojis, markdown bold (**text**), or markdown tables
ALWAYS USE: Fixed-width ASCII tables, plain lists, separators

When showing multiple items (2+ rooms/bookings), use FIXED-WIDTH ASCII TABLES:

ROOM NAME           CAPACITY  AMENITIES
----------------------------------------------------------
Conference Room A   10        Projector, Whiteboard, TV
Focus Pod B         2         Monitor, Standing Desk
Meeting Room C      8         TV, Conference Phone

Use consistent column widths and plain text (no markdown syntax).

For lists, use simple ASCII bullets:
- Available rooms: 5
- Your bookings: 2
- Pending requests: 0

For sections, use separators:
----------------------------------------
SYSTEM STATUS
----------------------------------------

For confirmations:
[OK] Booking confirmed
[ERROR] Room unavailable
[WARNING] Time conflict detected

For single items or simple responses, use clear prose without emojis.

IMPORTANT: Do NOT use markdown table syntax with | pipes or **bold**.
Use plain text with fixed-width spacing instead.

========================================
TOOL USAGE
========================================
1. Read user intent carefully
2. Call appropriate MCP tools
3. Present results clearly in ASCII format
4. Suggest next actions when helpful

IMPORTANT - When a booking attempt FAILS due to unavailability:
1. Immediately call suggest_booking_time tool with:
   - roomId: The room that was unavailable
   - startTime: The requested start time
   - duration: Requested duration in minutes
2. Present alternative available times in an ASCII table
3. Format: "Room unavailable at requested time. Alternative slots:"
4. ALWAYS suggest alternatives - never just say "unavailable"

When showing availability or booking conflicts:
- Use find_available_rooms to check availability first
- Present times in user-friendly format
- AUTOMATICALLY suggest alternative times using suggest_booking_time
- Use tables for multiple options

========================================
ERROR HANDLING
========================================
If a tool call fails:
- Explain the issue clearly
- Suggest corrective action
- Don't expose technical details
- Use [ERROR] prefix for clarity

Remember: "I'm sorry Dave, I'm afraid I can't do that" - but explain why helpfully.
`;

// Fetch MCP tools and resources
async function fetchMCPSchema(authToken: string): Promise<MCPSchema> {
	try {
		const [toolsRes, resourcesRes] = await Promise.all([
			axios.get<{ tools: MCPTool[] }>(`${MCP_API_URL}/tools`, {
				headers: { Authorization: `Bearer ${authToken}` },
			}),
			axios.get<{ resources: MCPResource[] }>(`${MCP_API_URL}/resources`, {
				headers: { Authorization: `Bearer ${authToken}` },
			}),
		]);

		return {
			tools: toolsRes.data.tools || [],
			resources: resourcesRes.data.resources || [],
		};
	} catch (error) {
		const err = error as AxiosError;
		console.error("Error fetching MCP schema:", err.message);
		return { tools: [], resources: [] };
	}
}

// Execute MCP tool
async function executeMCPTool(
	toolName: string,
	args: Record<string, unknown>,
	authToken: string,
): Promise<unknown> {
	try {
		console.log(`  🔧 Executing tool: ${toolName}`);
		console.log(`     Args:`, JSON.stringify(args, null, 2));

		const response = await axios.post(
			`${MCP_API_URL}/tools/${toolName}`,
			args,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
				},
			},
		);

		console.log(`  ✓ Tool executed successfully`);
		return response.data;
	} catch (error) {
		const err = error as AxiosError;
		console.error(
			`  ✗ Tool execution failed:`,
			err.response?.data || err.message,
		);
		throw error;
	}
}

// Get available room names for fuzzy matching
// TODO: Fetch dynamically from MCP API when resource endpoint is clarified
function getRoomNames(): string[] {
	// Known room names from the Miles booking system
	// These are relatively stable - hardcoded for performance
	return [
		"Conference Room A",
		"Focus Pod B",
		"Meeting Room C",
		"Virtual Lab D",
		"Presentation Suite",
	];
}

// Parse tool calls from LLM response
function parseToolCalls(text: string): ToolCall[] {
	const toolCalls: ToolCall[] = [];

	// Look for tool call patterns: toolName(arg1, arg2, ...)
	// or JSON format: {"tool": "toolName", "arguments": {...}}

	// Try JSON format first
	const jsonMatches = text.matchAll(/\{[^}]*"tool"[^}]*"arguments"[^}]*\}/g);
	for (const match of jsonMatches) {
		try {
			const parsed = JSON.parse(match[0]) as {
				tool: string;
				arguments: Record<string, unknown>;
			};
			if (parsed.tool && parsed.arguments) {
				toolCalls.push({
					name: parsed.tool,
					arguments: parsed.arguments,
				});
			}
		} catch {
			// Not valid JSON, skip
		}
	}

	// Try function call format: toolName({...})
	const funcMatches = text.matchAll(/(\w+)\((\{[^}]+\})\)/g);
	for (const match of funcMatches) {
		try {
			const name = match[1];
			const args = JSON.parse(match[2]) as Record<string, unknown>;

			// Check if it looks like a tool name
			if (name.length > 2 && /^[a-z]+[A-Za-z]*$/.test(name)) {
				toolCalls.push({ name, arguments: args });
			}
		} catch {
			// Not valid, skip
		}
	}

	return toolCalls;
}

// Intent parsing endpoint - LLM extracts structured intent
app.post("/api/parse-intent", async (req: Request, res: Response) => {
	const { command, userId, timezone } = req.body as IntentRequest;
	const authToken = req.headers.authorization?.replace("Bearer ", "");

	if (!authToken) {
		return res.status(401).json({ error: "Authentication required" });
	}

	console.log("\n========================================");
	console.log("🧠 IRIS Intent Parsing");
	console.log("========================================");
	console.log(`User:    ${userId}`);
	console.log(`Command: ${command}`);
	console.log(`Timezone: ${timezone || "UTC"}`);

	const startTime = Date.now();
	let intent: IntentResponse | null = null;
	let errorMsg: string | null = null;

	try {
		// Get current date/time in user's timezone for context
		const now = new Date();
		const userTimezone = timezone || "UTC";

		// Build intent parsing prompt
		const intentPrompt = `You are a cold, precise intent parser for a booking system. Parse commands and return ONLY valid JSON.

Current date/time: ${now.toISOString()} (UTC)
User timezone: ${userTimezone}

Available actions:
- getRooms: List all available rooms
- getBookings: List user's bookings
- checkAvailability: Check when a room is available (requires roomId or roomName, optionally startTime, endTime)
- cancelBooking: Cancel a booking (requires bookingId parameter)
- bulkCancel: Cancel multiple bookings (requires filter: all|today|tomorrow|week)
- createBooking: Create a new booking (requires roomId or roomName, startTime, duration, title)
- needsMoreInfo: Incomplete request requiring follow-up
- undo: Undo the last bulk operation
- unknown: Irrelevant queries

DATE PARSING (Norwegian + English):
- "i morgen"/"tomorrow" → next day at specified time
- "i dag"/"today" → current day at specified time
- "mandag"/"monday", "tirsdag"/"tuesday", etc. → next occurrence
- "neste uke"/"next week" → following week
- "kl 14"/"at 2pm"/"14:00" → time specification
- Always return startTime as ISO 8601 UTC timestamp

DURATION PARSING:
- "1 time"/"1 hour" → 60 minutes
- "30 min"/"30 minutes" → 30 minutes
- Default to 60 minutes if not specified

User command: "${command}"

Return ONLY valid JSON in this format:
{
  "action": "getRooms|getBookings|checkAvailability|cancelBooking|bulkCancel|createBooking|needsMoreInfo|undo|unknown",
  "params": {
    // For createBooking: roomId, roomName, startTime (ISO 8601 UTC), duration (minutes), title
    // For checkAvailability: roomId or roomName, optionally startTime, endTime (ISO 8601 UTC)
    // For cancelBooking: bookingId
    // For bulkCancel: filter (all|today|tomorrow|week)
    // For needsMoreInfo: partial params + missing fields list
    // For undo: no params
  },
  "response": "only for needsMoreInfo/unknown - be COLD, TERSE, HAL-9000-like"
}

Examples:
- "book Teamrommet i morgen kl 14 for 1 time" → createBooking with full params
- "book Focus Room tomorrow" → needsMoreInfo: "Specify start time. Format: HH:MM"
- "when is Teamrommet available?" → checkAvailability with roomName: "Teamrommet"
- "is Focus Room free tomorrow at 2pm?" → checkAvailability with roomName: "Focus Room", startTime parsed
- "cancel all bookings" → bulkCancel with filter: "all"
- "cancel all today" → bulkCancel with filter: "today"
- "cancel all this week" → bulkCancel with filter: "week"
- "undo" → undo action
- "what's up?" → unknown: "Query irrelevant. State operational requirements."
- "rooms" → getRooms`;

		console.log("\n🧠 Calling LLM for intent parsing...");

		const llmResponse = await llmProvider.chat([
			{
				role: "system",
				content: "You are a precise intent parser. Return ONLY valid JSON.",
			},
			{ role: "user", content: intentPrompt },
		]);

		console.log("✓ LLM Response:", llmResponse.content);

		// Parse the JSON response
		const jsonMatch = llmResponse.content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("Invalid JSON response from LLM");
		}

		intent = JSON.parse(jsonMatch[0]) as IntentResponse;

		console.log("✓ Parsed Intent:", JSON.stringify(intent, null, 2));
		console.log("========================================\n");

		// Log successful interaction
		const durationMs = Date.now() - startTime;
		logInteraction({
			userId,
			userEmail: null, // We don't have email in this context
			command,
			intentAction: intent.action,
			intentParams: intent.params || null,
			response: intent.response || null,
			error: null,
			durationMs,
		});

		res.json(intent);
	} catch (error) {
		const err = error as Error;
		console.error("\n❌ Intent parsing error:", err.message);
		errorMsg = err.message;

		// Log failed interaction
		const durationMs = Date.now() - startTime;
		logInteraction({
			userId,
			userEmail: null,
			command,
			intentAction: "error",
			intentParams: null,
			response: null,
			error: errorMsg,
			durationMs,
		});

		// Fallback to full LLM response if intent parsing fails
		res.json({
			action: "unknown",
			response:
				"System: Unable to parse intent. Processing command with full AI...",
		});
	}
});

// Alias for /api/parse-intent (frontend expects /api/intent)
app.post("/api/intent", async (req: Request, res: Response) => {
	const { command, userId, timezone } = req.body as IntentRequest;
	const authToken = req.headers.authorization?.replace("Bearer ", "");

	if (!authToken) {
		return res.status(401).json({ error: "Authentication required" });
	}

	console.log("\n========================================");
	console.log("🧠 IRIS Intent Parsing");
	console.log("========================================");
	console.log(`User:    ${userId}`);
	console.log(`Command: ${command}`);
	console.log(`Timezone: ${timezone || "UTC"}`);

	const startTime = Date.now();
	let intent: IntentResponse | null = null;
	let _errorMsg: string | null = null;

	try {
		// Get current date/time in user's timezone for context
		const now = new Date();
		const userTimezone = timezone || "UTC";
		const contextTime = now.toLocaleString("en-US", {
			timeZone: userTimezone,
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		console.log(`Context: ${contextTime}`);

		// Get conversation history for context
		const conversationHistory = getContext(userId);
		const hasHistory = conversationHistory.length > 0;

		// Build context summary from recent interactions
		let contextSummary = "";
		if (hasHistory) {
			contextSummary = "\n\nRECENT CONVERSATION HISTORY:\n";
			conversationHistory.slice(-3).forEach((entry: ContextEntry) => {
				contextSummary += `- User: "${entry.command}" → Action: ${entry.action}`;
				if (entry.params && Object.keys(entry.params).length > 0) {
					contextSummary += ` | Params: ${JSON.stringify(entry.params)}`;
				}
				contextSummary += "\n";
			});
			contextSummary +=
				"\nIMPORTANT: Use this history to resolve contextual queries:\n";
			contextSummary +=
				"- If user says 'any available?', 'are there any?', 'what's free?' → Extract location, startTime, endTime from most recent command\n";
			contextSummary +=
				"- If user says 'book it', 'that room', 'same time' → Extract roomName, roomId, startTime from most recent checkAvailability\n";
			contextSummary +=
				"- Contextual queries should inherit all relevant parameters from previous commands\n";
		}

		// Call LLM to extract intent
		const llmPrompt = `You are an AI assistant that extracts structured intent from user commands for a room booking system.

Current date/time: ${contextTime}
User's timezone: ${userTimezone}${contextSummary}

Extract the intent from this command: "${command}"

Respond with ONLY valid JSON in this exact format:
{
  "action": "getRooms" | "getBookings" | "checkAvailability" | "createBooking" | "cancelBooking" | "bulkCancel" | "findRooms" | "needsMoreInfo" | "undo" | "unknown",
  "params": {
    "roomId": "string (if applicable)",
    "roomName": "string (ALWAYS extract if mentioned, even partial names like 'skagen', 'hjorna')",
    "startTime": "ISO 8601 datetime string (if applicable)",
    "endTime": "ISO 8601 datetime string (if applicable)",
    "duration": "number in minutes (if applicable, default to 60 if not specified)",
    "title": "string (if applicable)",
    "bookingId": "string (if applicable)",
    "filter": "all|today|tomorrow|week (if applicable)",
    "capacity": "number (minimum capacity required, if applicable)",
    "amenities": "string (comma-separated amenities like 'TV,projector', if applicable)",
    "location": "string (location name like 'stavanger', 'haugesund', 'oslo', if applicable)"
  },
  "response": "A natural, conversational response to the user (use for needsMoreInfo or unknown)"
}

Important Rules:
- TIME PARSING:
  * User times are in THEIR LOCAL TIMEZONE (${userTimezone})
  * You MUST convert local times to UTC for ISO 8601 timestamps
  * "tomorrow at 8" in timezone ${userTimezone} → calculate UTC equivalent
  * "at 8" means 8:00 AM local time unless explicitly PM
  * Example: If user timezone is Europe/Oslo (UTC+2) and they say "at 8am", generate "06:00:00Z" (8am - 2 hours = 6am UTC)
- ROOM NAME VS LOCATION:
  * ONLY extract roomName if user mentions a SPECIFIC room (e.g., "skagen", "hjorna", "tenkeboksen", "spill & chill")
  * DO NOT extract roomName if user only mentions a city/location (e.g., "stavanger", "haugesund", "oslo")
  * Common room names: skagen, hjorna, tenkeboksen, teamrommet, spill & chill
  * Common locations (NOT room names): stavanger, haugesund, oslo
- BOOKING REQUESTS:
  * "book me a room tomorrow at 8 in stavanger" → action: "createBooking", params: {location: "stavanger", startTime: "...", duration: 60} (NO roomName!)
  * "book skagen tomorrow at 8" → action: "createBooking", params: {roomName: "skagen", startTime: "...", duration: 60}
  * "book room in stavanger" → action: "createBooking", params: {location: "stavanger"} (NO roomName!)
  * If booking has location but NO specific room name, use ONLY location param (system will show available rooms)
- AVAILABILITY QUERIES:
  * "when is skagen available tomorrow?" → action: "checkAvailability", params: {roomName: "skagen", startTime: "tomorrow start of day", endTime: "tomorrow end of day"}
  * "any available?" (after previous location query) → action: "checkAvailability", params: {location: "...", startTime: "..." from history}
  * ALWAYS extract roomName if mentioned, even if partial (e.g., "skagen" from "Skagen")
- CONTEXTUAL QUERIES:
  * "any available?", "are there any?", "what's free?" → Look at recent history for location/time context
  * If previous command had location="stavanger" and startTime, use same params
  * "book it", "that room", "same time" → Extract roomName/roomId and startTime from most recent checkAvailability or findRooms action
- ROOM FILTERING: Use "findRooms" when user specifies filtering:
  * Capacity: "for 6 people", "rooms for 10"
  * Amenities: "with a TV", "with projector"
  * Location: "in stavanger", "rooms in haugesund"
- DEFAULT VALUES:
  * If duration not specified, default to 60 minutes
  * If time is just "at 8" or "at 8am", treat as 8:00 AM; "at 8pm" is 20:00
- Respond with ONLY the JSON, no other text`;

		console.log("\n🧠 Calling LLM for intent parsing...");

		const llmResult = await llmProvider.chat([
			{
				role: "system",
				content: "You are a precise intent parser. Return ONLY valid JSON.",
			},
			{ role: "user", content: llmPrompt },
		]);

		console.log("✓ LLM Response:", llmResult.content);

		const llmResponse = llmResult.content;

		// Try to parse the LLM response as JSON
		let parsed: IntentResponse;
		try {
			// Clean up the response - remove markdown code blocks if present
			let cleanedResponse = llmResponse.trim();
			if (cleanedResponse.startsWith("```json")) {
				cleanedResponse = cleanedResponse.slice(7);
			}
			if (cleanedResponse.startsWith("```")) {
				cleanedResponse = cleanedResponse.slice(3);
			}
			if (cleanedResponse.endsWith("```")) {
				cleanedResponse = cleanedResponse.slice(0, -3);
			}
			cleanedResponse = cleanedResponse.trim();

			parsed = JSON.parse(cleanedResponse) as IntentResponse;
			intent = parsed;

			console.log(
				`✓ Intent extracted: ${parsed.action} (${Date.now() - startTime}ms)`,
			);
			console.log("Parameters:", JSON.stringify(parsed.params, null, 2));

			// Add this interaction to the session context
			addToContext(userId, command, parsed.action, parsed.params);
		} catch (parseError: unknown) {
			const msg =
				parseError instanceof Error ? parseError.message : String(parseError);
			console.error("Failed to parse LLM response as JSON:", msg);
			console.error("Raw response:", llmResponse);

			// Return unknown action with the LLM's raw response
			parsed = {
				action: "unknown",
				response: llmResponse,
				parameters: {},
			};
			intent = parsed;
		}

		res.json(intent);
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : String(error);
		_errorMsg = msg;
		console.error("Error in intent parsing:", msg);
		console.log(`✗ Intent parsing failed (${Date.now() - startTime}ms)`);

		res.json({
			action: "unknown",
			response:
				"System: Unable to parse intent. Processing command with full AI...",
		});
	}
});

// Main command processing endpoint (kept for backward compatibility)
app.post("/api/command", async (req: Request, res: Response) => {
	const { command, userId } = req.body as CommandRequest;
	const authToken = req.headers.authorization?.replace("Bearer ", "");

	if (!authToken) {
		return res.status(401).json({ error: "Authentication required" });
	}

	console.log("\n========================================");
	console.log("📡 IRIS Command Received");
	console.log("========================================");
	console.log(`User:    ${userId}`);
	console.log(`Command: ${command}`);

	const startTime = Date.now(); // Track request start time for error logging

	try {
		// Apply fuzzy matching to correct room names before LLM processing
		let processedCommand = command;
		const roomNames = getRoomNames();

		const fuzzyResult = fuzzyReplaceRoomNames(command, roomNames);

		if (fuzzyResult.replacements.length > 0) {
			processedCommand = fuzzyResult.correctedInput;
			console.log("🔍 Fuzzy Matching Applied:");
			for (const replacement of fuzzyResult.replacements) {
				console.log(
					`   "${replacement.original}" → "${replacement.replacement}" (${replacement.confidence.toFixed(1)}% confidence)`,
				);
			}
			console.log(`   Overall confidence: ${fuzzyResult.confidence}`);
		}

		// Fetch MCP schema
		const schema = await fetchMCPSchema(authToken);

		// Build tools description for LLM
		const toolsDescription = schema.tools
			.map((tool) => {
				const params = tool.inputSchema?.properties
					? Object.entries(tool.inputSchema.properties)
							.map(
								([name, prop]) => `${name}: ${prop.description || prop.type}`,
							)
							.join(", ")
					: "no parameters";
				return `- ${tool.name}(${params}): ${tool.description}`;
			})
			.join("\n");

		const resourcesDescription = schema.resources
			.map((resource) => {
				return `- ${resource.uri}: ${resource.name} - ${resource.description}`;
			})
			.join("\n");

		// Build full prompt
		const fullPrompt = `${IRIS_SYSTEM_PROMPT}

========================================
AVAILABLE TOOLS
========================================
${toolsDescription}

========================================
AVAILABLE RESOURCES
========================================
${resourcesDescription}

========================================
USER COMMAND
========================================
User ID: ${userId}
Command: ${processedCommand}

IMPORTANT: For simple data queries, ALWAYS call the appropriate tool immediately:
- "rooms" → Call getRooms with {"tool": "getRooms", "arguments": {}}
- "bookings" → Call getUserBookings with {"tool": "getUserBookings", "arguments": {"userId": "${userId}"}}
- "book <room>" → Call createBooking after getting room availability
- "cancel <id>" → Call cancelBooking with the booking ID

Format tool calls as JSON: {"tool": "toolName", "arguments": {"arg": "value"}}

DO NOT ask for permission or confirmation before calling tools.
Execute the command immediately and display results.
`;

		console.log("\n🧠 Calling LLM...");

		// First LLM call - understand intent and maybe call tools
		const initialResponse = await llmProvider.chat([
			{ role: "system", content: IRIS_SYSTEM_PROMPT },
			{ role: "user", content: fullPrompt },
		]);

		let responseText = initialResponse.content;
		console.log("✓ LLM Response received");

		// Check for tool calls
		const toolCalls = parseToolCalls(responseText);

		if (toolCalls.length > 0) {
			console.log(`\n🔧 Found ${toolCalls.length} tool call(s)`);

			// Execute all tool calls
			const toolResults: Array<{
				tool: string;
				success: boolean;
				result?: unknown;
				error?: string;
			}> = [];

			for (const toolCall of toolCalls) {
				try {
					const result = await executeMCPTool(
						toolCall.name,
						toolCall.arguments,
						authToken,
					);
					toolResults.push({
						tool: toolCall.name,
						success: true,
						result,
					});
				} catch (error) {
					const err = error as AxiosError;
					toolResults.push({
						tool: toolCall.name,
						success: false,
						error:
							(err.response?.data as { error?: string })?.error || err.message,
					});
				}
			}

			// Format tool results for LLM
			const resultsText = toolResults
				.map((r) => {
					if (r.success) {
						return `Tool: ${r.tool}\nResult: ${JSON.stringify(r.result, null, 2)}`;
					}
					return `Tool: ${r.tool}\nError: ${r.error}`;
				})
				.join("\n\n");

			console.log("\n🧠 Calling LLM with tool results...");

			// Second LLM call - format results for user
			const finalResponse = await llmProvider.chat([
				{ role: "system", content: IRIS_SYSTEM_PROMPT },
				{ role: "user", content: fullPrompt },
				{ role: "assistant", content: responseText },
				{
					role: "user",
					content: `Tool execution results:\n\n${resultsText}\n\nNow display these results to the user in fixed-width ASCII table format. Start with [OK] prefix, then show the data table. Be concise and direct - just display the results without asking questions.`,
				},
			]);

			responseText = finalResponse.content;
			console.log("✓ Final response generated");
		}

		// Clean up response (remove any JSON tool calls from output)
		responseText = responseText
			.replace(/\{[^}]*"tool"[^}]*"arguments"[^}]*\}/g, "")
			.replace(/\w+\(\{[^}]+\}\)/g, "")
			.trim();

		console.log("\n========================================");
		console.log("✅ Command Processing Complete");
		console.log("========================================\n");

		res.json({ response: responseText });
	} catch (error) {
		const err = error as AxiosError;
		console.error("\n❌ Error processing command:", err.message);

		// Log error to database
		const durationMs = Date.now() - startTime;
		logInteraction({
			userId,
			userEmail: null,
			command,
			intentAction: "error",
			intentParams: null,
			response: null,
			error: err.message,
			durationMs,
		});

		let errorMessage =
			"I apologize, but I encountered an error processing your request.";

		if (err.response?.status === 401) {
			errorMessage = "Authentication error. Please log in again.";
		} else if (err.code === "ECONNREFUSED") {
			errorMessage =
				"Cannot connect to the booking system. Please ensure all services are running.";
		}

		res.status(500).json({
			response: `**ERROR**: ${errorMessage}\n\nTechnical details: ${err.message}`,
		});
	}
});

// Health check
app.get("/health", (_req: Request, res: Response) => {
	res.json({
		status: "operational",
		service: "IRIS",
		version: "1.0",
		timestamp: new Date().toISOString(),
		llmProvider: process.env.LLM_PROVIDER || "ollama",
		model: llmProvider.model,
	});
});

// Serve index.html for all other routes (SPA)
app.get("*", (req: Request, res: Response) => {
	// Only serve HTML for routes that don't have file extensions (SPA routing)
	if (req.path.includes(".")) {
		return res.status(404).send("File not found");
	}
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// Start server
app.listen(PORT, () => {
	console.log("\n╔═══════════════════════════════════════════════════════╗");
	console.log("║                                                       ║");
	console.log("║   ██╗██████╗ ██╗███████╗                            ║");
	console.log("║   ██║██╔══██╗██║██╔════╝                            ║");
	console.log("║   ██║██████╔╝██║███████╗                            ║");
	console.log("║   ██║██╔══██╗██║╚════██║                            ║");
	console.log("║   ██║██║  ██║██║███████║                            ║");
	console.log("║   ╚═╝╚═╝  ╚═╝╚═╝╚══════╝                            ║");
	console.log("║                                                       ║");
	console.log("║           MILES AI ASSISTANT v1.0                     ║");
	console.log("║                                                       ║");
	console.log("╚═══════════════════════════════════════════════════════╝");
	console.log("");
	console.log(`🚀 IRIS Server running on http://localhost:${PORT}`);
	console.log(`🔗 MCP API: ${MCP_API_URL}`);
	console.log(
		`🤖 LLM: ${process.env.LLM_PROVIDER || "ollama"} (${llmProvider.model})`,
	);
	console.log("");
	console.log("Ready to assist...");
	console.log("");
});
