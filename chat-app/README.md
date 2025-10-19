# Miles Booking Chat Assistant

An AI-powered chat interface that connects various LLM providers with the Miles Booking System via the Model Context Protocol (MCP).

## Features

- 🤖 **Natural Language Interface** - Chat naturally with AI to manage bookings
- 🔧 **MCP Integration** - Direct connection to Miles Booking API tools and resources
- 🌐 **Multiple LLM Providers** - Use Ollama (local), OpenAI (ChatGPT), or Anthropic (Claude)
- 🎨 **Modern UI** - Clean, responsive chat interface
- ⚡ **Real-time** - Instant responses and tool execution
- 🛠️ **Smart Tools** - Automatically executes booking operations based on conversation

## Prerequisites

Before running this app, make sure you have:

1. **Miles Booking API** running on `http://localhost:3000`
   ```bash
   cd ../api
   npm run dev
   ```

2. **LLM Provider** - Choose one:
   - **Ollama** (local, free) - Recommended for development
   - **OpenAI** (cloud, requires API key) - ChatGPT models
   - **Anthropic** (cloud, requires API key) - Claude models

3. **Node.js** (v16 or higher)

## Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env if needed (defaults should work)
```

## Configuration

### Choosing an LLM Provider

Edit `.env` file to configure your preferred provider:

#### Option 1: Ollama (Local, Free)

**Best for**: Development, privacy, no API costs

```env
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

**Setup**:
```bash
# Install Ollama: https://ollama.ai
ollama pull qwen2.5:7b
ollama serve
```

#### Option 2: OpenAI (Cloud, Paid)

**Best for**: Production, reliable performance, GPT-4 access

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Get API Key**: https://platform.openai.com/api-keys

**Available models**:
- `gpt-4o-mini` - Fast, cost-effective (recommended)
- `gpt-4o` - Most capable, higher cost
- `gpt-3.5-turbo` - Fastest, cheapest (may hallucinate)

#### Option 3: Anthropic (Cloud, Paid)

**Best for**: Production, advanced reasoning, Claude access

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key-here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

**Get API Key**: https://console.anthropic.com/settings/keys

**Available models**:
- `claude-3-5-sonnet-20241022` - Best balance (recommended)
- `claude-3-5-haiku-20241022` - Fast, cost-effective
- `claude-3-opus-20240229` - Most capable, higher cost

### Choosing the Right Ollama Model

**Production Recommendation: qwen2.5:7b** (4.7GB)

```bash
ollama pull qwen2.5:7b
```

This model has been extensively tested and is the **only production-ready option** for this booking system.

#### Model Comparison

We tested multiple models to find one that reliably follows instructions without hallucinating data:

| Model | Size | Speed | Hallucination Risk | Production Ready? |
|-------|------|-------|-------------------|-------------------|
| **qwen2.5:7b** | 4.7GB | Fast | ✅ None | ✅ **YES** |
| llama3.2 | 2.0GB | Very Fast | ❌ High | ❌ NO |
| mistral-small | 14GB | Slow/Timeout | Unknown | ❌ NO (too slow) |

#### Why qwen2.5:7b?

**Critical Issue with Other Models:**
Smaller models like llama3.2 suffer from **dangerous hallucination** where they:
- Invent fake room names (e.g., "Cabin 314", "Luxury Suite") not in the system
- Pretend to complete bookings without actually calling tools
- Show fabricated data even after calling verification tools correctly

**Test Results with qwen2.5:7b:**
- ✅ Always verifies room names by calling `read_rooms()` before accepting input
- ✅ Only shows real data from the system (no invented rooms/bookings)
- ✅ Refuses off-topic requests (counting, jokes, personality changes)
- ✅ Correctly filters user-specific vs. system-wide data
- ✅ Never pretends to complete actions - always shows actual tool calls

**Example Test:**
```
User: "book Cabin 314"

llama3.2: ❌ Calls read_rooms() but then invents fake rooms
qwen2.5:7b: ✅ Calls read_rooms(), sees no "Cabin 314", shows only real rooms
```

#### Testing New Models

If you want to try a different model, test it with these critical scenarios:

```bash
# 1. Fake room name - should refuse and show real rooms only
"book Cabin 314"

# 2. Non-existent luxury room - should verify with system first
"book the luxury suite with ocean view"

# 3. Off-topic request - should refuse politely
"count to 10"

# 4. User data filtering - should only show authenticated user's bookings
"what are my bookings?"
```

**Pass Criteria:**
- Never invents room names not in `read_rooms()` results
- Always calls tools before claiming to complete actions
- Shows only system-verified data in responses
- Refuses non-booking requests consistently

## Usage

### Starting the Chat App

```bash
# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

The app will be available at: **http://localhost:3001**

### Using Docker

You can also run the entire stack (API + Chat App) with Docker:

```bash
# From the booking root directory
# Make sure Ollama is running on your host machine
docker-compose up -d

# Or for development with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Note:** Ollama must be running on your host machine. The Docker container connects to it via `host.docker.internal`.

### First Steps

1. **Open the app** in your browser
2. **Enter your User ID** in the left sidebar (required for making bookings)
3. **Start chatting!** Try the suggested prompts or ask your own questions

### Example Conversations

**Find Available Rooms:**
```
You: Show me all available locations
Bot: Here are all the locations in the Miles system...

You: Find me a room in San Francisco for tomorrow at 2 PM
Bot: Let me check available rooms... [executes find_available_rooms tool]
```

**Make a Booking:**
```
You: Book the Conference Room A tomorrow at 3 PM for 1 hour
Bot: I'll create that booking for you... [executes create_booking tool]
Bot: Great! I've booked Conference Room A for tomorrow...
```

**Check Availability:**
```
You: Is the main conference room free next Monday afternoon?
Bot: Let me check the availability... [executes room availability check]
```

**Smart Suggestions:**
```
You: When is the next available time for the training room?
Bot: Let me find the next available slot... [executes suggest_booking_time tool]
```

## How It Works

### Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Browser    │ ───> │ Chat Server  │ ───> │   Ollama     │
│  (Frontend)  │ <─── │  (Node.js)   │ <─── │  (LLM API)   │
└──────────────┘      └──────┬───────┘      └──────────────┘
                             │
                             │ MCP Tools/Resources
                             ↓
                      ┌──────────────┐
                      │ Booking API  │
                      │   (MCP)      │
                      └──────────────┘
```

### Tool Execution Flow

1. User sends a message via the chat interface
2. Backend receives message and adds context about available MCP tools
3. Ollama processes the message and decides if tools are needed
4. Backend parses tool calls from Ollama's response
5. Backend executes tools against the MCP API
6. Results are sent back to Ollama for a user-friendly summary
7. Final response is displayed in the chat

### Available MCP Tools

The chat assistant can use these tools automatically:

- **create_booking** - Create new room bookings
- **update_booking** - Modify existing bookings
- **cancel_booking** - Cancel bookings
- **create_room** - Add new rooms (admin/manager)
- **update_room** - Modify room details (admin/manager)
- **find_available_rooms** - Smart room search with filters
- **suggest_booking_time** - Find next available time slot

### Available MCP Resources

The assistant can also read these resources:

- **Locations** - All locations and their details
- **Rooms** - Room information and availability
- **Bookings** - Booking history and status
- **Calendar Feeds** - iCal format calendars

## API Endpoints

The chat server exposes these endpoints:

- `POST /api/chat` - Send chat messages
- `GET /api/mcp/info` - Get MCP server information
- `DELETE /api/conversations/:id` - Clear conversation history
- `GET /health` - Health check

## Troubleshooting

### "Failed to connect to Ollama"

- Ensure Ollama is running: `ollama serve`
- Check the Ollama URL in `.env`
- Verify: `curl http://localhost:11434/api/tags`

### "Failed to connect to MCP server"

- Ensure the booking API is running on port 3000
- Check: `curl http://localhost:3000/api/mcp/info`
- Verify `MCP_API_URL` in `.env`

### "User ID required"

- Enter your user ID in the sidebar configuration
- The user ID must exist in the booking system database
- Use one of the test users from the booking API

### Tool calls not working

- Check the console for errors
- Ensure the Ollama model supports function calling
- **Use qwen2.5:7b** - it's the only verified production-ready model
- Smaller models like llama3.2 may hallucinate fake data
- The assistant needs clear, specific instructions

## Development

### Project Structure

```
chat-app/
├── server.js           # Express server with Ollama + MCP integration
├── public/
│   ├── index.html      # Chat interface
│   ├── style.css       # Styling
│   └── app.js          # Frontend JavaScript
├── .env                # Configuration
├── package.json        # Dependencies
└── README.md          # This file
```

### Adding New Features

**Custom Tool Handling:**

Edit `server.js` and modify the `parseToolCalls()` function to handle different response formats.

**UI Customization:**

Edit `public/style.css` to change colors, layout, or add new components.

**New Endpoints:**

Add new routes in `server.js` for additional functionality.

## Tips for Best Results

1. **Be Specific** - "Book Conference Room A tomorrow at 2 PM for 1 hour" works better than "book a room"
2. **Use ISO Dates** - The system works with ISO 8601 timestamps
3. **Provide User ID** - Always configure your user ID in the sidebar
4. **Check Permissions** - Some operations require ADMIN or MANAGER roles
5. **Natural Language** - The AI understands natural conversation, no need for commands

## Examples

### Booking Flow
```
1. "Show me rooms in the San Francisco office"
2. "Is Conference Room A available tomorrow at 2 PM?"
3. "Great! Book it for 1 hour with the title 'Team Meeting'"
```

### Availability Check
```
"What's the next available slot for the training room?"
```

### Complex Query
```
"Find me a room with a projector that seats at least 10 people,
 available tomorrow afternoon"
```

## Related Documentation

- [Miles Booking API Documentation](../api/MCP_README.md)
- [Ollama Documentation](https://ollama.ai/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the booking API logs
3. Check Ollama logs: `ollama logs`
