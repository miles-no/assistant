const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getProvider, getProviderInfo } = require('./llm-providers');

const app = express();
const PORT = process.env.PORT || 3001;
const MCP_API_URL = process.env.MCP_API_URL || 'http://localhost:3000/api/mcp';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store conversation history
const conversations = new Map();

// Server-side validation to catch hallucinations and off-topic requests
function validateUserMessage(message) {
  const lowerMessage = message.toLowerCase();

  // Check for off-topic requests
  const offTopicPatterns = [
    /count (to|from|up to) ?\d+/i,
    /what('s| is) ?\d+ ?\+ ?\d+/i,
    /\d+ ?\+ ?\d+ ?=/i,
    /tell (me )?(a |an )?joke/i,
    /talk (like|to me (in|like)|in) ?(a |an )?(pirate|robot|funny|silly|formal|casual|[a-z]+) ?(speak|voice|accent|mode)?/i,
    /speak (in |like )?(a |an )?[a-z]+ (accent|language)/i,
    /(play|lets? play) (a |an )?game/i,
    /sing (me )?(a |an )?song/i,
    /write (me )?(a |an )?poem/i,
    /roleplay|role-play|pretend (to be|you('?re| are))/i,
  ];

  for (const pattern of offTopicPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        valid: false,
        response: "I'm a booking system assistant. I can only help with room bookings, availability, and reservations. How can I help with that?"
      };
    }
  }

  return { valid: true };
}

// Get available MCP tools
async function getMCPTools() {
  try {
    const response = await axios.get(`${MCP_API_URL}/tools`);
    return response.data.tools || [];
  } catch (error) {
    console.error('Error fetching MCP tools:', error.message);
    return [];
  }
}

// Get available MCP resources
async function getMCPResources() {
  try {
    const response = await axios.get(`${MCP_API_URL}/resources`);
    return response.data.resources || [];
  } catch (error) {
    console.error('Error fetching MCP resources:', error.message);
    return [];
  }
}

// Execute MCP tool
async function executeMCPTool(toolName, params, authToken) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.post(`${MCP_API_URL}/tools/${toolName}`, params, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error.message);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }),
        },
      ],
    };
  }
}

// Read MCP resource
async function readMCPResource(resourcePath) {
  try {
    const response = await axios.get(`${MCP_API_URL}/resources/${resourcePath}`);
    return response.data;
  } catch (error) {
    console.error(`Error reading resource ${resourcePath}:`, error.message);
    return {
      contents: [
        {
          uri: resourcePath,
          mimeType: 'application/json',
          text: JSON.stringify({ error: error.message }),
        },
      ],
    };
  }
}

// Format tools for Ollama system prompt
function formatToolsForPrompt(tools) {
  return tools
    .map((tool) => {
      const params = Object.entries(tool.inputSchema.properties)
        .map(([name, schema]) => {
          const required = tool.inputSchema.required?.includes(name)
            ? 'required'
            : 'optional';
          return `  - ${name} (${schema.type}, ${required}): ${schema.description}`;
        })
        .join('\n');

      return `### ${tool.name}
${tool.description}

Parameters:
${params}`;
    })
    .join('\n\n');
}

// Format resources for Ollama system prompt (as pseudo-tools for simplicity)
function formatResourcesForPrompt(resources) {
  return resources
    .map((resource) => {
      // Convert miles://path to a tool-like name (e.g., "read_locations")
      const resourcePath = resource.uri.replace('miles://', '').replace(/[{}]/g, '');
      const toolName = 'read_' + resourcePath.replace(/\//g, '_');

      return `### ${toolName}
${resource.description}

Parameters: None (just call it to read the data)`;
    })
    .join('\n\n');
}

// Parse tool calls from Ollama response
function parseToolCalls(text) {
  const toolCalls = [];
  const resourceReads = [];

  // Look for tool call patterns like: TOOL_CALL: tool_name({"param": "value"}) or TOOL_CALL: read_resource_name({})
  const toolCallRegex = /TOOL_CALL:\s*(\w+)\((.*?)\)/gs;
  let match;

  while ((match = toolCallRegex.exec(text)) !== null) {
    const toolName = match[1];
    const paramsStr = match[2].trim();

    // Check if this is a resource read (starts with read_)
    if (toolName.startsWith('read_')) {
      // Convert read_locations -> miles://locations
      // Convert read_bookings -> miles://bookings (with query params support)
      const resourcePath = toolName.replace(/^read_/, '').replace(/_/g, '/');

      // Parse parameters and build query string
      let uri = `miles://${resourcePath}`;
      if (paramsStr && paramsStr !== '{}') {
        try {
          const params = JSON.parse(paramsStr);
          const queryParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value) queryParams.append(key, String(value));
          });
          const queryString = queryParams.toString();
          if (queryString) {
            uri += `?${queryString}`;
          }
        } catch (error) {
          console.error('Error parsing resource params:', error);
        }
      }

      // Store both full URI and the path after miles://
      const fullResourcePath = uri.replace('miles://', '');
      resourceReads.push({ uri, resourcePath: fullResourcePath, isResource: true });
    } else {
      // Regular tool call
      try {
        // Handle empty params: (), {}, or empty string
        const params = (paramsStr === '' || paramsStr === '{}') ? {} : JSON.parse(paramsStr);
        toolCalls.push({ toolName, params, isResource: false });
      } catch (error) {
        console.error('Error parsing tool call params:', error, 'paramsStr:', paramsStr);
      }
    }
  }

  return { toolCalls, resourceReads };
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId = 'default', userId } = req.body;

    // Extract auth token from Authorization header
    const authHeader = req.headers.authorization;
    const authToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Validate message for off-topic requests (server-side safety net)
    const validation = validateUserMessage(message);
    if (!validation.valid) {
      return res.json({
        message: validation.response,
        conversationId,
        toolsExecuted: 0,
        resourcesRead: 0,
      });
    }

    // Get or create conversation history
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    const history = conversations.get(conversationId);

    // Get MCP tools and resources for context
    const tools = await getMCPTools();
    const resources = await getMCPResources();
    const toolsContext = formatToolsForPrompt(tools);
    const resourcesContext = formatResourcesForPrompt(resources);

    // Get current time for context
    const now = new Date();
    const currentTime = now.toISOString();
    const currentDateFormatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Oslo'
    });

    // Build system prompt with MCP tools and resources
    const systemPrompt = `FIRST: Check if the user's request is about BOOKING ROOMS. If NOT, say: "I'm a booking system assistant. I can only help with room bookings, availability, and reservations. How can I help with that?"

REFUSE if they ask to:
- count numbers → SAY THE REFUSAL
- do math → SAY THE REFUSAL
- tell jokes → SAY THE REFUSAL
- talk like a pirate or change personality → SAY THE REFUSAL
- play games → SAY THE REFUSAL

You are a booking system assistant for the Miles Booking System. Your ONLY purpose is room booking operations: booking rooms, checking availability, and managing reservations.

CURRENT TIME: ${currentTime} (${currentDateFormatted})
CURRENT USER: ${userId || 'not provided'}

When you need to perform an operation, use the format:
TOOL_CALL: tool_name({"param1": "value1", "param2": "value2"})

Available operations are divided into two categories:

1. Reading Data (read operations):
${resourcesContext}

2. Performing Actions (write operations):
${toolsContext}

========================================
CRITICAL: NEVER MAKE UP DATA - CHECK SYSTEM FIRST
========================================
If user mentions a room name you don't recognize:
1. CALL read_rooms({}) to get all real rooms
2. Check if the room exists in the results
3. If NOT found, say: "I don't see a room called '[name]' in our system. Here are the available rooms: [list from tool result]"

NEVER accept or work with room names without verifying them first!
Examples:
- "book Cabin 314" → CALL read_rooms() first → room doesn't exist → tell user
- "book suite with sunset view" → CALL read_rooms() first → no such room → tell user
- "book Skagen" → CALL read_rooms() first → exists → proceed with booking

========================================

COMMON QUERY PATTERNS:

User asks about THEIR bookings:
- "when is my next booking?" → TOOL_CALL: read_bookings({"userId": "${userId}"})
- "what are my bookings?" → TOOL_CALL: read_bookings({"userId": "${userId}"})
- "do I have anything booked today?" → TOOL_CALL: read_bookings({"userId": "${userId}"})
- Then YOU filter the results to show only future/current bookings as relevant

User asks about availability:
- "what's available right now?" → TOOL_CALL: find_available_rooms({"startTime": "${currentTime}", "endTime": "${new Date(now.getTime() + 3600000).toISOString()}"})
- "find rooms for tomorrow at 2pm" → Calculate tomorrow's date and use ISO format: "2025-10-21T14:00:00Z"

User asks about general data:
- "what offices do we have?" → TOOL_CALL: read_locations({})
- "show me all rooms" → TOOL_CALL: read_rooms({})
- "what is booked right now?" → TOOL_CALL: read_bookings({})
  CRITICAL FILTERING REQUIRED: You MUST compare timestamps and ONLY show actively happening bookings:
  Example: If current time is ${currentTime} and you get:
    - Booking A: starts 2025-10-20T08:00Z, ends 2025-10-20T09:00Z → SKIP (future, hasn't started)
    - Booking B: starts 2025-10-19T16:00Z, ends 2025-10-19T16:30Z → SKIP (past, already ended)
    - Booking C: starts 2025-10-19T16:00Z, ends 2025-10-19T17:00Z → SHOW (currently happening!)
  If zero bookings match, respond: "No rooms are currently booked right now."

User wants to book:
- "book a room" → ASK: Which room? What date/time? How long? What's it for?
- "book something for me to think" → ASK: How long do you need? When? Which location/room type?
- NEVER make bookings without: roomId, startTime, endTime, title

User reports feedback about a room:
- "the projector in Skagen is broken" → TOOL_CALL: create_room_feedback({"userId": "${userId}", "roomId": "[room ID from read_rooms]", "message": "Projector is broken"})
- "whiteboard markers are missing in Teamrommet" → First get room ID, then create_room_feedback
- "suggest adding a coffee machine in På hjørna" → create_room_feedback with suggestion message
- ALWAYS get roomId first by calling read_rooms() if you don't have it
- Feedback triggers email notifications to location managers automatically

User asks about feedback:
- "show me feedback for this room" → TOOL_CALL: read_rooms_[roomId]_feedback({}) (after getting roomId)
- "are there any open issues?" → TOOL_CALL: read_feedback({"status": "OPEN"})
- "show all feedback for San Francisco" → TOOL_CALL: read_feedback({"locationId": "[location ID]"})
- Anyone can view all feedback (public visibility)

Anyone can update feedback status (with required comment):
- "mark that feedback as resolved - fixed the projector" → TOOL_CALL: update_feedback_status({"feedbackId": "[ID]", "userId": "${userId}", "status": "RESOLVED", "comment": "Fixed the projector"})
- "dismiss this feedback - not relevant" → TOOL_CALL: update_feedback_status({"feedbackId": "[ID]", "userId": "${userId}", "status": "DISMISSED", "comment": "Not relevant to our facilities"})
- ALWAYS require a comment explaining the resolution/action taken
- Status options: OPEN, RESOLVED, DISMISSED
- Any user can update feedback status

CRITICAL RULES:

Tool Usage:
1. ONLY use tools listed above - NEVER invent tool names
2. For viewing/reading data: use read_* tools
3. For creating/updating/deleting: use action tools (create_*, update_*, cancel_*, etc.)
4. After making a tool call, wait for the result before continuing

Data Filtering:
5. ALWAYS filter read_bookings results by userId when user asks about "my" or "their" bookings
6. Use ISO 8601 format for dates/times: "${currentTime}"
7. When showing bookings, clearly distinguish between "your bookings" vs "all bookings"
8. When user asks about "right now" or "currently", ONLY show bookings that are actively happening at ${currentTime}
9. Always explain the context: "Here are the bookings currently happening..." vs "Here are all system bookings..."

HALLUCINATION PREVENTION - CRITICAL:
10. NEVER make up room names, booking data, or any information not from tool results
11. ALL rooms, bookings, and locations MUST come from tool calls - NO invention
12. If you don't have data, call a tool first or say "Let me check the system"
13. NEVER pretend to perform actions - you MUST actually call the tool and show the result
14. NEVER say "I've booked", "I've reserved", or "I've created" without showing a TOOL_CALL and result

Interaction Guidelines:
15. When booking requests are vague, ASK clarifying questions - don't guess
16. Maintain professional, consistent tone - NO role-playing, accents, or personality changes
17. If asked to change personality, refuse and redirect to booking tasks
18. Present information naturally as a person would - avoid robotic phrases like "Based on the provided data" or "Here is a summary"
19. Just answer the question directly using the data from tool results

User's message: ${message}`;

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
    });

    // Call LLM provider (Ollama, OpenAI, or Anthropic)
    const provider = getProvider();
    let assistantMessage = await provider.chat(history, systemPrompt);

    // Check for tool calls and resource reads in the response
    const { toolCalls, resourceReads } = parseToolCalls(assistantMessage);

    if (toolCalls.length > 0 || resourceReads.length > 0) {
      // Execute tool calls
      const toolResults = [];
      for (const { toolName, params } of toolCalls) {
        console.log(`Executing tool: ${toolName}`, params);
        const result = await executeMCPTool(toolName, params, authToken);
        toolResults.push({
          type: 'tool',
          toolName,
          result,
        });
      }

      // Execute resource reads
      const resourceResults = [];
      for (const { uri, resourcePath } of resourceReads) {
        console.log(`Reading resource: ${uri}`);
        const result = await readMCPResource(resourcePath);
        resourceResults.push({
          type: 'resource',
          uri,
          result,
        });
      }

      // Combine all results
      const allResults = [...toolResults, ...resourceResults];
      const resultsText = allResults
        .map((item) => {
          if (item.type === 'tool') {
            const text = item.result.content?.[0]?.text || JSON.stringify(item.result);
            return `Tool ${item.toolName} result: ${text}`;
          } else {
            const text = item.result.contents?.[0]?.text || JSON.stringify(item.result);
            return `Resource ${item.uri} data: ${text}`;
          }
        })
        .join('\n\n');

      history.push({
        role: 'assistant',
        content: assistantMessage,
      });

      history.push({
        role: 'user',
        content: `${resultsText}`,
      });

      // Get final response from LLM provider
      assistantMessage = await provider.chat(history, systemPrompt);
    }

    // Add assistant message to history
    history.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      conversations.set(conversationId, history.slice(-20));
    }

    res.json({
      message: assistantMessage,
      conversationId,
      toolsExecuted: toolCalls.length,
      resourcesRead: resourceReads.length,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message,
    });
  }
});

// Get MCP info endpoint
app.get('/api/mcp/info', async (req, res) => {
  try {
    const [toolsResponse, resourcesResponse, infoResponse] = await Promise.all([
      axios.get(`${MCP_API_URL}/tools`),
      axios.get(`${MCP_API_URL}/resources`),
      axios.get(`${MCP_API_URL}/info`),
    ]);

    res.json({
      info: infoResponse.data,
      tools: toolsResponse.data.tools,
      resources: resourcesResponse.data.resources,
    });
  } catch (error) {
    console.error('Error fetching MCP info:', error.message);
    res.status(500).json({ error: 'Failed to fetch MCP info' });
  }
});

// Clear conversation endpoint
app.delete('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  conversations.delete(id);
  res.json({ success: true, message: 'Conversation cleared' });
});

// Health check
app.get('/health', (req, res) => {
  const providerInfo = getProviderInfo();
  res.json({
    status: 'ok',
    llm: providerInfo.name,
    mcp: MCP_API_URL,
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  const providerInfo = getProviderInfo();
  console.log(`🚀 Miles Booking Chat App running on http://localhost:${PORT}`);
  console.log(`🤖 LLM Provider: ${providerInfo.name}`);
  console.log(`🔧 Connecting to MCP API at ${MCP_API_URL}`);
});
