# Quick Start Guide

Get the Miles Booking Chat Assistant up and running in 3 steps!

## Step 1: Start the Booking API

```bash
# Terminal 1 - Start the booking API
cd ../api
npm run dev
```

Wait until you see: `🚀 Server listening on port 3000`

## Step 2: Start Ollama

```bash
# Terminal 2 - Start Ollama (if not already running)
ollama serve

# In another terminal, pull the model if you haven't already
ollama pull llama3.2
```

Verify Ollama is working:
```bash
curl http://localhost:11434/api/tags
```

## Step 3: Start the Chat App

```bash
# Terminal 3 - Start the chat application
cd chat-app
npm install  # First time only
npm start
```

## Open Your Browser

Navigate to: **http://localhost:3001**

## First Interaction

1. **Configure your User ID** in the left sidebar
   - Use one of the test users from the booking API
   - Example: Look in the booking API's seed data or create a user

2. **Try a sample query:**
   ```
   "Show me all available locations"
   ```

3. **Make a booking:**
   ```
   "Find available rooms for tomorrow at 2 PM"
   ```

## Troubleshooting

### Chat app won't start?
- Check that port 3001 is available
- Ensure all dependencies are installed: `npm install`

### Can't connect to booking API?
- Verify it's running on port 3000
- Test: `curl http://localhost:3000/api/mcp/info`

### Can't connect to Ollama?
- Ensure Ollama is running: `ollama serve`
- Test: `curl http://localhost:11434/api/tags`
- Check the model is pulled: `ollama list`

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Explore the [MCP API documentation](../api/MCP_README.md)
- Try different conversation patterns and see how the AI responds!

## Example Conversations

**Simple booking:**
```
You: Book Conference Room A for tomorrow at 3 PM for one hour
```

**Complex search:**
```
You: Find me a room with a projector that can fit 10 people,
     available tomorrow afternoon in San Francisco
```

**Availability check:**
```
You: When is the next available time slot for the main conference room?
```

Happy booking! 🎉
