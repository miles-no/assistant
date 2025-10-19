# Miles Booking Chat - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Chat Interface (HTML/CSS/JS)            │  │
│  │  • Message input/output                                    │  │
│  │  • User configuration                                      │  │
│  │  • Tool status indicators                                  │  │
│  │  • Real-time updates                                       │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │ HTTP/JSON                            │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              CHAT SERVER (Node.js/Express)                       │
│              Port: 3001                                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Conversation Manager                                     │   │
│  │  • Maintains chat history                                │   │
│  │  • Manages context & state                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tool Call Parser                                         │   │
│  │  • Extracts tool calls from LLM responses               │   │
│  │  • Validates parameters                                  │   │
│  │  • Formats results                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MCP Client                                              │   │
│  │  • Connects to MCP API                                   │   │
│  │  • Executes tools                                        │   │
│  │  • Reads resources                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────┬─────────────────────────────────────────┬───────────────┘
        │                                         │
        │ HTTP POST                               │ HTTP GET/POST
        │ /api/chat                               │ /api/mcp/*
        ↓                                         ↓
┌─────────────────────┐              ┌─────────────────────────────┐
│   OLLAMA SERVER     │              │   BOOKING API (MCP)         │
│   Port: 11434       │              │   Port: 3000                │
│                     │              │                             │
│  Model: llama3.2    │              │  ┌─────────────────────┐   │
│  • NLP Processing   │              │  │  MCP Server         │   │
│  • Intent Detection │              │  │  • Tools (write)    │   │
│  • Response Gen     │              │  │  • Resources (read) │   │
│  • Tool Selection   │              │  └─────────────────────┘   │
└─────────────────────┘              │                             │
                                     │  ┌─────────────────────┐   │
                                     │  │  Booking Logic      │   │
                                     │  │  • Create bookings  │   │
                                     │  │  • Check conflicts  │   │
                                     │  │  • Manage rooms     │   │
                                     │  └─────────────────────┘   │
                                     │                             │
                                     │  ┌─────────────────────┐   │
                                     │  │  PostgreSQL DB      │   │
                                     │  │  • Users            │   │
                                     │  │  • Locations        │   │
                                     │  │  • Rooms            │   │
                                     │  │  • Bookings         │   │
                                     │  └─────────────────────┘   │
                                     └─────────────────────────────┘
```

## Data Flow

### 1. User Message Flow

```
User Types Message
       ↓
Frontend captures input
       ↓
POST /api/chat {message, userId, conversationId}
       ↓
Chat Server receives message
       ↓
Add to conversation history
       ↓
Fetch available MCP tools
       ↓
Build system prompt with tools context
       ↓
POST to Ollama with full conversation
       ↓
Ollama processes and generates response
       ↓
Parse response for tool calls (TOOL_CALL: name(...))
```

### 2. Tool Execution Flow

```
Tool calls detected in response
       ↓
For each tool call:
  - Extract tool name and parameters
  - POST /api/mcp/tools/{toolName} with params
       ↓
  MCP Server validates parameters
       ↓
  Execute tool logic (create booking, etc.)
       ↓
  Query/Update database
       ↓
  Return result to Chat Server
       ↓
Collect all tool results
       ↓
Send results back to Ollama for summary
       ↓
Ollama generates user-friendly response
       ↓
Return final response to frontend
       ↓
Display in chat interface
```

### 3. Resource Query Flow

```
User asks for information
       ↓
Ollama identifies need for data
       ↓
(Future enhancement: automatic resource reading)
Currently: Tools fetch data as needed
       ↓
GET /api/mcp/resources/{resourcePath}
       ↓
MCP Server queries database
       ↓
Format and return data
       ↓
Display in chat
```

## Component Details

### Frontend (Browser)
- **Technology:** Vanilla HTML/CSS/JavaScript
- **Responsibilities:**
  - Render chat interface
  - Handle user input
  - Display messages
  - Manage local configuration (userId)
  - Show status indicators

### Chat Server (Node.js)
- **Technology:** Express.js, Axios
- **Responsibilities:**
  - Route HTTP requests
  - Manage conversation state
  - Interface with Ollama
  - Parse tool calls
  - Execute MCP tools
  - Format responses

### Ollama (LLM)
- **Technology:** Local LLM server
- **Responsibilities:**
  - Natural language understanding
  - Intent classification
  - Tool selection
  - Response generation
  - Context management

### MCP Server (Booking API)
- **Technology:** Express.js, TypeScript, Prisma
- **Responsibilities:**
  - Expose booking tools
  - Validate permissions
  - Execute database operations
  - Provide read resources
  - Generate calendar feeds

## Communication Protocols

### Frontend ↔ Chat Server
- **Protocol:** HTTP/JSON
- **Endpoints:**
  - `POST /api/chat` - Send messages
  - `GET /api/mcp/info` - Get capabilities
  - `DELETE /api/conversations/:id` - Clear history

### Chat Server ↔ Ollama
- **Protocol:** HTTP/JSON (Ollama API)
- **Format:**
  ```json
  {
    "model": "llama3.2",
    "messages": [
      {"role": "system", "content": "..."},
      {"role": "user", "content": "..."},
      {"role": "assistant", "content": "..."}
    ],
    "stream": false
  }
  ```

### Chat Server ↔ MCP Server
- **Protocol:** HTTP/JSON (MCP over HTTP)
- **Endpoints:**
  - `GET /api/mcp/tools` - List tools
  - `POST /api/mcp/tools/:name` - Execute tool
  - `GET /api/mcp/resources` - List resources
  - `GET /api/mcp/resources/*` - Read resource

## Security Considerations

### Current Implementation
- No authentication between chat server and MCP (local network)
- User ID passed through for permission checks
- MCP server enforces RBAC (Role-Based Access Control)

### Production Recommendations
- Add JWT authentication
- Implement rate limiting
- Use HTTPS for all connections
- Add input sanitization
- Implement CORS restrictions
- Add audit logging

## Scalability

### Current Limitations
- Single conversation store (in-memory Map)
- No persistence of chat history
- Single-threaded Node.js

### Scaling Strategies
- Add Redis for conversation storage
- Implement conversation persistence to database
- Use message queues for tool execution
- Load balance multiple chat servers
- Cache MCP tool/resource listings

## Extension Points

### Adding New Tools
1. Add tool definition to MCP server (`src/mcp/tools.ts`)
2. Implement tool logic
3. Chat server automatically picks it up
4. Ollama learns to use it from system prompt

### Adding New Resources
1. Add resource to MCP server (`src/mcp/resources.ts`)
2. Implement read logic
3. Make available via `/api/mcp/resources/*`

### Customizing LLM Behavior
- Modify system prompt in `server.js`
- Adjust tool call parsing regex
- Change response formatting

### UI Customization
- Edit `public/style.css` for styling
- Modify `public/index.html` for structure
- Extend `public/app.js` for functionality

## Performance Characteristics

### Response Times
- Simple query: 1-3 seconds (Ollama processing)
- Tool execution: +500ms-2s (database operations)
- Total: 2-5 seconds for tool-using queries

### Bottlenecks
- Ollama inference (main bottleneck)
- Database queries (secondary)
- Network latency (minimal on localhost)

### Optimization Opportunities
- Use streaming responses from Ollama
- Parallel tool execution
- Cache frequently accessed resources
- Use faster/smaller LLM models

## Error Handling

### Error Sources
1. Ollama unavailable → Graceful degradation message
2. MCP server down → Show error, suggest checking API
3. Tool execution fails → Return error to Ollama for explanation
4. Parse errors → Fallback to direct response

### Recovery Strategies
- Retry logic for network errors
- Clear conversation history on fatal errors
- Show user-friendly error messages
- Log errors for debugging

## Monitoring

### Key Metrics to Track
- Average response time
- Tool execution success rate
- Conversation length
- Error rates
- API availability

### Logging
- All tool executions logged
- Errors logged with context
- Conversation IDs for tracing
