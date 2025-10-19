# Model Context Protocol (MCP) Integration

The Miles Booking API now supports the **Model Context Protocol (MCP)**, allowing AI assistants like Claude to interact with the booking system programmatically.

## Overview

MCP is a protocol that enables AI assistants to:
- Call **tools** (write operations like creating/updating bookings)
- Access **resources** (read operations like viewing locations and availability)
- Stream updates via **Server-Sent Events (SSE)**

## Base URL

All MCP endpoints are available under:
```
/api/mcp
```

## Available Endpoints

### 1. Server Information
Get information about the MCP server and its capabilities.

**Endpoint:** `GET /api/mcp/info`

**Response:**
```json
{
  "name": "miles-booking-api",
  "version": "1.0.0",
  "description": "Model Context Protocol server for Miles Booking API",
  "capabilities": {
    "tools": true,
    "resources": true
  },
  "protocol": "mcp",
  "protocolVersion": "1.0"
}
```

### 2. List Available Tools
View all tools that can be called via MCP.

**Endpoint:** `GET /api/mcp/tools`

**Response:**
```json
{
  "success": true,
  "count": 7,
  "tools": [
    {
      "name": "create_booking",
      "description": "Create a new room booking...",
      "inputSchema": { ... }
    },
    ...
  ]
}
```

### 3. Call a Tool
Execute a specific tool with parameters.

**Endpoint:** `POST /api/mcp/tools/:toolName`

**Example:** Create a booking
```bash
curl -X POST http://localhost:3000/api/mcp/tools/create_booking \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "roomId": "room456",
    "startTime": "2025-10-20T14:00:00Z",
    "endTime": "2025-10-20T15:00:00Z",
    "title": "Team Meeting",
    "description": "Weekly standup"
  }'
```

**Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"success\":true,\"booking\":{...}}"
    }
  ]
}
```

### 4. List Available Resources
View all resources that can be accessed via MCP.

**Endpoint:** `GET /api/mcp/resources`

**Response:**
```json
{
  "success": true,
  "count": 10,
  "resources": [
    {
      "uri": "miles://locations",
      "name": "All Locations",
      "description": "List of all office locations",
      "mimeType": "application/json"
    },
    ...
  ]
}
```

### 5. Read a Resource
Access a specific resource by its URI.

**Endpoint:** `GET /api/mcp/resources/*`

**Examples:**

Get all locations:
```bash
curl http://localhost:3000/api/mcp/resources/locations
```

Get specific location:
```bash
curl http://localhost:3000/api/mcp/resources/locations/loc123
```

Check room availability:
```bash
curl "http://localhost:3000/api/mcp/resources/rooms/room456/availability?startTime=2025-10-20T14:00:00Z&endTime=2025-10-20T15:00:00Z"
```

Get calendar feed (iCal):
```bash
curl http://localhost:3000/api/mcp/resources/calendar/location/loc123
```

### 6. JSON-RPC 2.0 Messages
Send JSON-RPC messages for programmatic access.

**Endpoint:** `POST /api/mcp/messages`

**Example:** Initialize connection
```bash
curl -X POST http://localhost:3000/api/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "1.0",
    "serverInfo": {
      "name": "miles-booking-api",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "resources": {}
    }
  }
}
```

### 7. Server-Sent Events (SSE)
Stream real-time updates from the MCP server.

**Endpoint:** `GET /api/mcp/sse`

**Example:**
```bash
curl -N http://localhost:3000/api/mcp/sse
```

**Response Stream:**
```
data: {"type":"connection","status":"connected","serverInfo":{...}}

data: {"type":"heartbeat","timestamp":"2025-10-19T14:30:00.000Z"}
```

## Available Tools

### 1. create_booking
Create a new room booking.

**Parameters:**
- `userId` (string, required): User ID
- `roomId` (string, required): Room ID
- `startTime` (string, required): Start time (ISO 8601)
- `endTime` (string, required): End time (ISO 8601)
- `title` (string, required): Booking title
- `description` (string, optional): Additional details

### 2. update_booking
Update an existing booking.

**Parameters:**
- `bookingId` (string, required): Booking ID to update
- `userId` (string, required): User making the change
- `startTime` (string, optional): New start time
- `endTime` (string, optional): New end time
- `title` (string, optional): New title
- `description` (string, optional): New description

### 3. cancel_booking
Cancel a booking (sets status to CANCELLED).

**Parameters:**
- `bookingId` (string, required): Booking ID to cancel
- `userId` (string, required): User cancelling the booking

### 4. create_room
Create a new room in a location.

**Parameters:**
- `userId` (string, required): User creating the room (ADMIN or MANAGER)
- `name` (string, required): Room name
- `locationId` (string, required): Location ID
- `capacity` (number, required): Room capacity
- `amenities` (array, optional): List of amenities
- `description` (string, optional): Room description
- `isActive` (boolean, optional): Active status

### 5. update_room
Update an existing room.

**Parameters:**
- `roomId` (string, required): Room ID to update
- `userId` (string, required): User making the change
- Plus any optional fields from create_room

### 6. find_available_rooms
Smart tool to find available rooms based on criteria.

**Parameters:**
- `startTime` (string, required): Desired start time
- `endTime` (string, required): Desired end time
- `locationId` (string, optional): Filter by location
- `capacity` (number, optional): Minimum capacity
- `amenities` (array, optional): Required amenities

### 7. suggest_booking_time
AI-powered tool that suggests the next available time slot for a room.

**Parameters:**
- `roomId` (string, required): Room to find availability for
- `duration` (number, required): Duration in minutes
- `preferredDate` (string, optional): Preferred start date

## Available Resources

### Resource URIs

#### Locations
- `miles://locations` - All locations
- `miles://locations/{locationId}` - Specific location details

#### Rooms
- `miles://rooms` - All rooms
- `miles://rooms/{roomId}` - Specific room details
- `miles://rooms/{roomId}/availability?startTime=...&endTime=...` - Room availability

#### Bookings
- `miles://bookings?userId=...&locationId=...&roomId=...&status=...` - Filtered bookings
- `miles://bookings/{bookingId}` - Specific booking details

#### Calendar Feeds (iCalendar format)
- `miles://calendar/location/{locationId}` - All bookings for a location
- `miles://calendar/room/{roomId}` - All bookings for a room
- `miles://calendar/user/{userId}` - All bookings for a user

## Example Use Cases

### 1. Book a Room for a Meeting
```bash
# Step 1: Find available rooms
curl "http://localhost:3000/api/mcp/tools/find_available_rooms" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-10-20T14:00:00Z",
    "endTime": "2025-10-20T15:00:00Z",
    "capacity": 6,
    "amenities": ["projector", "whiteboard"]
  }'

# Step 2: Create booking
curl "http://localhost:3000/api/mcp/tools/create_booking" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "roomId": "room456",
    "startTime": "2025-10-20T14:00:00Z",
    "endTime": "2025-10-20T15:00:00Z",
    "title": "Product Planning",
    "description": "Q4 roadmap discussion"
  }'
```

### 2. Find Next Available Slot
```bash
curl "http://localhost:3000/api/mcp/tools/suggest_booking_time" \
  -X POST -H "Content-Type: application/json" \
  -d '{
    "roomId": "room456",
    "duration": 60,
    "preferredDate": "2025-10-20"
  }'
```

### 3. Get Location Calendar
```bash
curl "http://localhost:3000/api/mcp/resources/calendar/location/loc123" \
  -o office-calendar.ics
```

## Using MCP with Claude

To use this MCP server with Claude:

1. **Via HTTP API**: Use the endpoints above directly
2. **Via MCP Client**: Configure an MCP client to connect to `http://localhost:3000/api/mcp`
3. **Via SSE Stream**: Connect to `/api/mcp/sse` for real-time updates

### Example MCP Client Configuration
```json
{
  "mcpServers": {
    "miles-booking": {
      "url": "http://localhost:3000/api/mcp",
      "type": "http"
    }
  }
}
```

## Authentication & Authorization

The MCP endpoints currently use the same authentication as the REST API:
- Tools that modify data check user permissions (ADMIN, MANAGER, USER roles)
- Resources are generally read-only and accessible based on user context
- For production use, add JWT bearer token authentication to MCP endpoints

## Error Handling

MCP endpoints return errors in consistent formats:

**Tool Errors:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"Room not found\"}"
    }
  ]
}
```

**JSON-RPC Errors:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal error: ..."
  }
}
```

## Development

### Running the MCP Server
The MCP server runs alongside the main API:
```bash
npm run dev
```

### Testing MCP Endpoints
Use the provided examples above with `curl`, or use an MCP client library.

### Extending MCP Functionality

To add new tools:
1. Add tool schema to `src/mcp/tools.ts` in `registerTools()`
2. Implement tool logic in the same file
3. Add to `callTool()` switch statement

To add new resources:
1. Add resource definition to `src/mcp/resources.ts` in `listResources()`
2. Implement resource reader in `readResource()`

## Chat Interface

Want to interact with the booking system through natural language? Check out the **Miles Booking Chat Assistant**!

The chat-app provides an AI-powered chat interface using Ollama that connects to this MCP server:

```bash
cd ../chat-app
npm install
npm start
```

Visit [Chat App Documentation](../chat-app/README.md) for more details.

## Further Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Miles Booking API Documentation](/api-docs)
- [Miles Booking Chat Assistant](../chat-app/README.md)
