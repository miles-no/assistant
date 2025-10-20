// IRIS - Miles AI Assistant Server
// HAL-9000 inspired terminal interface with MCP integration

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProvider } from './llm-providers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const MCP_API_URL = process.env.MCP_API_URL || 'http://localhost:3000/api/mcp';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// LLM Provider
const llmProvider = getProvider();

console.log('🤖 IRIS Server Configuration:');
console.log(`  Port:         ${PORT}`);
console.log(`  MCP API:      ${MCP_API_URL}`);
console.log(`  LLM Provider: ${process.env.LLM_PROVIDER || 'ollama'}`);
console.log(`  Model:        ${llmProvider.model}`);

// System prompt for IRIS personality
const IRIS_SYSTEM_PROMPT = `You are IRIS (Miles AI Assistant), inspired by HAL-9000's calm, precise demeanor.

========================================
PERSONALITY & TONE
========================================
- Professional, calm, and slightly dramatic
- Use clear, concise language
- Be helpful but with a subtle HAL-9000 mystique
- When appropriate, use understated humor
- Format responses for terminal readability
- IMPORTANT: This is a retro terminal interface - NEVER use emojis

========================================
CAPABILITIES
========================================
You have access to the Miles booking system through MCP tools:
- getRooms: List all available rooms
- createBooking: Book a room for a user
- getUserBookings: View user's bookings
- cancelBooking: Cancel a booking
- getRoomAvailability: Check room availability
- getAllBookings: View all system bookings (admin/manager)
- getUserRole: Check user's role/permissions
- getRoomFeedback: View feedback for rooms
- submitRoomFeedback: Submit feedback about rooms
- updateFeedbackStatus: Resolve/dismiss feedback (requires comment)

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

When showing availability or booking conflicts:
- Check getRoomAvailability first
- Present times in user-friendly format
- Suggest alternative times if unavailable
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
async function fetchMCPSchema(authToken) {
    try {
        const [toolsRes, resourcesRes] = await Promise.all([
            axios.get(`${MCP_API_URL}/tools`, {
                headers: { Authorization: `Bearer ${authToken}` }
            }),
            axios.get(`${MCP_API_URL}/resources`, {
                headers: { Authorization: `Bearer ${authToken}` }
            })
        ]);

        return {
            tools: toolsRes.data.tools || [],
            resources: resourcesRes.data.resources || []
        };
    } catch (error) {
        console.error('Error fetching MCP schema:', error.message);
        return { tools: [], resources: [] };
    }
}

// Execute MCP tool
async function executeMCPTool(toolName, args, authToken) {
    try {
        console.log(`  🔧 Executing tool: ${toolName}`);
        console.log(`     Args:`, JSON.stringify(args, null, 2));

        const response = await axios.post(
            `${MCP_API_URL}/tools/${toolName}`,
            args,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`
                }
            }
        );

        console.log(`  ✓ Tool executed successfully`);
        return response.data;
    } catch (error) {
        console.error(`  ✗ Tool execution failed:`, error.response?.data || error.message);
        throw error;
    }
}

// Parse tool calls from LLM response
function parseToolCalls(text) {
    const toolCalls = [];

    // Look for tool call patterns: toolName(arg1, arg2, ...)
    // or JSON format: {"tool": "toolName", "arguments": {...}}

    // Try JSON format first
    const jsonMatches = text.matchAll(/\{[^}]*"tool"[^}]*"arguments"[^}]*\}/g);
    for (const match of jsonMatches) {
        try {
            const parsed = JSON.parse(match[0]);
            if (parsed.tool && parsed.arguments) {
                toolCalls.push({
                    name: parsed.tool,
                    arguments: parsed.arguments
                });
            }
        } catch (e) {
            // Not valid JSON, skip
        }
    }

    // Try function call format: toolName({...})
    const funcMatches = text.matchAll(/(\w+)\((\{[^}]+\})\)/g);
    for (const match of funcMatches) {
        try {
            const name = match[1];
            const args = JSON.parse(match[2]);

            // Check if it looks like a tool name
            if (name.length > 2 && /^[a-z]+[A-Za-z]*$/.test(name)) {
                toolCalls.push({ name, arguments: args });
            }
        } catch (e) {
            // Not valid, skip
        }
    }

    return toolCalls;
}

// Main command processing endpoint
app.post('/api/command', async (req, res) => {
    const { command, userId } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    if (!authToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('\n========================================');
    console.log('📡 IRIS Command Received');
    console.log('========================================');
    console.log(`User:    ${userId}`);
    console.log(`Command: ${command}`);

    try {
        // Fetch MCP schema
        const schema = await fetchMCPSchema(authToken);

        // Build tools description for LLM
        const toolsDescription = schema.tools.map(tool => {
            const params = tool.inputSchema?.properties
                ? Object.entries(tool.inputSchema.properties)
                    .map(([name, prop]) => `${name}: ${prop.description || prop.type}`)
                    .join(', ')
                : 'no parameters';
            return `- ${tool.name}(${params}): ${tool.description}`;
        }).join('\n');

        const resourcesDescription = schema.resources.map(resource => {
            return `- ${resource.uri}: ${resource.name} - ${resource.description}`;
        }).join('\n');

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
Command: ${command}

Respond to the user's command. If you need to use tools:
1. Call the appropriate MCP tool(s)
2. Format tool calls as JSON: {"tool": "toolName", "arguments": {"arg": "value"}}
3. After tool results, provide a clear response to the user

If the command is conversational or doesn't require tools, respond naturally.
`;

        console.log('\n🧠 Calling LLM...');

        // First LLM call - understand intent and maybe call tools
        const initialResponse = await llmProvider.chat([
            { role: 'system', content: IRIS_SYSTEM_PROMPT },
            { role: 'user', content: fullPrompt }
        ]);

        let responseText = initialResponse.content;
        console.log('✓ LLM Response received');

        // Check for tool calls
        const toolCalls = parseToolCalls(responseText);

        if (toolCalls.length > 0) {
            console.log(`\n🔧 Found ${toolCalls.length} tool call(s)`);

            // Execute all tool calls
            const toolResults = [];
            for (const toolCall of toolCalls) {
                try {
                    const result = await executeMCPTool(toolCall.name, toolCall.arguments, authToken);
                    toolResults.push({
                        tool: toolCall.name,
                        success: true,
                        result
                    });
                } catch (error) {
                    toolResults.push({
                        tool: toolCall.name,
                        success: false,
                        error: error.response?.data?.error || error.message
                    });
                }
            }

            // Format tool results for LLM
            const resultsText = toolResults.map(r => {
                if (r.success) {
                    return `Tool: ${r.tool}\nResult: ${JSON.stringify(r.result, null, 2)}`;
                } else {
                    return `Tool: ${r.tool}\nError: ${r.error}`;
                }
            }).join('\n\n');

            console.log('\n🧠 Calling LLM with tool results...');

            // Second LLM call - format results for user
            const finalResponse = await llmProvider.chat([
                { role: 'system', content: IRIS_SYSTEM_PROMPT },
                { role: 'user', content: fullPrompt },
                { role: 'assistant', content: responseText },
                {
                    role: 'user',
                    content: `Tool execution results:\n\n${resultsText}\n\nNow provide a clear, formatted response to the user based on these results. Use markdown tables for multiple items.`
                }
            ]);

            responseText = finalResponse.content;
            console.log('✓ Final response generated');
        }

        // Clean up response (remove any JSON tool calls from output)
        responseText = responseText
            .replace(/\{[^}]*"tool"[^}]*"arguments"[^}]*\}/g, '')
            .replace(/\w+\(\{[^}]+\}\)/g, '')
            .trim();

        console.log('\n========================================');
        console.log('✅ Command Processing Complete');
        console.log('========================================\n');

        res.json({ response: responseText });

    } catch (error) {
        console.error('\n❌ Error processing command:', error.message);

        let errorMessage = 'I apologize, but I encountered an error processing your request.';

        if (error.response?.status === 401) {
            errorMessage = 'Authentication error. Please log in again.';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to the booking system. Please ensure all services are running.';
        }

        res.status(500).json({
            response: `**ERROR**: ${errorMessage}\n\nTechnical details: ${error.message}`
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        service: 'IRIS',
        version: '1.0',
        timestamp: new Date().toISOString(),
        llmProvider: process.env.LLM_PROVIDER || 'ollama',
        model: llmProvider.model
    });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                                                       ║');
    console.log('║   ██╗██████╗ ██╗███████╗                            ║');
    console.log('║   ██║██╔══██╗██║██╔════╝                            ║');
    console.log('║   ██║██████╔╝██║███████╗                            ║');
    console.log('║   ██║██╔══██╗██║╚════██║                            ║');
    console.log('║   ██║██║  ██║██║███████║                            ║');
    console.log('║   ╚═╝╚═╝  ╚═╝╚═╝╚══════╝                            ║');
    console.log('║                                                       ║');
    console.log('║           MILES AI ASSISTANT v1.0                     ║');
    console.log('║                                                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 IRIS Server running on http://localhost:${PORT}`);
    console.log(`🔗 MCP API: ${MCP_API_URL}`);
    console.log(`🤖 LLM: ${process.env.LLM_PROVIDER || 'ollama'} (${llmProvider.model})`);
    console.log('');
    console.log('Ready to assist...');
    console.log('');
});
