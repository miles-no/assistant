const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MCP_API_URL = process.env.MCP_API_URL || 'http://localhost:3000/api/mcp';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store conversation history
const conversations = new Map();

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
async function executeMCPTool(toolName, params) {
  try {
    const response = await axios.post(`${MCP_API_URL}/tools/${toolName}`, params);
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

// Parse tool calls from Ollama response
function parseToolCalls(text) {
  const toolCalls = [];

  // Look for tool call patterns like: TOOL_CALL: tool_name({"param": "value"})
  const toolCallRegex = /TOOL_CALL:\s*(\w+)\((.*?)\)/gs;
  let match;

  while ((match = toolCallRegex.exec(text)) !== null) {
    const toolName = match[1];
    try {
      const params = JSON.parse(match[2]);
      toolCalls.push({ toolName, params });
    } catch (error) {
      console.error('Error parsing tool call params:', error);
    }
  }

  return toolCalls;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId = 'default', userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation history
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, []);
    }
    const history = conversations.get(conversationId);

    // Get MCP tools for context
    const tools = await getMCPTools();
    const toolsContext = formatToolsForPrompt(tools);

    // Build system prompt with MCP tools
    const systemPrompt = `You are a helpful assistant for the Miles Booking System. You can help users book rooms, check availability, and manage their bookings.

When you need to perform an action, use the available tools by responding with:
TOOL_CALL: tool_name({"param1": "value1", "param2": "value2"})

Available Tools:
${toolsContext}

Important:
- Always use the correct userId parameter when calling tools (user provided: ${userId || 'not provided'})
- Use ISO 8601 format for dates and times (e.g., "2025-10-20T14:00:00Z")
- Be helpful and conversational
- After making a tool call, wait for the result before continuing

User's message: ${message}`;

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
    });

    // Call Ollama
    const ollamaResponse = await axios.post(`${OLLAMA_URL}/api/chat`, {
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...history,
      ],
      stream: false,
    });

    let assistantMessage = ollamaResponse.data.message.content;

    // Check for tool calls in the response
    const toolCalls = parseToolCalls(assistantMessage);

    if (toolCalls.length > 0) {
      // Execute tool calls
      const toolResults = [];

      for (const { toolName, params } of toolCalls) {
        console.log(`Executing tool: ${toolName}`, params);
        const result = await executeMCPTool(toolName, params);
        toolResults.push({
          toolName,
          result,
        });
      }

      // Add tool results to context and get final response
      const toolResultsText = toolResults
        .map(({ toolName, result }) => {
          const text = result.content?.[0]?.text || JSON.stringify(result);
          return `Tool ${toolName} result: ${text}`;
        })
        .join('\n\n');

      history.push({
        role: 'assistant',
        content: assistantMessage,
      });

      history.push({
        role: 'user',
        content: `Here are the tool execution results:\n\n${toolResultsText}\n\nPlease provide a user-friendly summary of what happened.`,
      });

      // Get final response from Ollama
      const finalResponse = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        messages: history,
        stream: false,
      });

      assistantMessage = finalResponse.data.message.content;
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
  res.json({
    status: 'ok',
    ollama: OLLAMA_URL,
    mcp: MCP_API_URL,
  });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Miles Booking Chat App running on http://localhost:${PORT}`);
  console.log(`📡 Connecting to Ollama at ${OLLAMA_URL}`);
  console.log(`🔧 Connecting to MCP API at ${MCP_API_URL}`);
});
