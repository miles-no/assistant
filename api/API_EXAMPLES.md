# API Examples

Complete examples for testing all API endpoints.

## Authentication

### Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@miles.com",
    "password": "securepassword123",
    "firstName": "New",
    "lastName": "User"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "clx...",
    "email": "newuser@miles.com",
    "firstName": "New",
    "lastName": "User",
    "role": "USER",
    "createdAt": "2025-10-18T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@miles.com",
    "password": "password123"
  }'
```

### Get current user info

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Locations

### Get all locations (public)

```bash
curl http://localhost:3000/api/locations
```

### Get specific location

```bash
curl http://localhost:3000/api/locations/sf-office
```

### Create location (Admin only)

```bash
curl -X POST http://localhost:3000/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "name": "Austin Office",
    "address": "123 Congress Ave",
    "city": "Austin",
    "country": "USA",
    "timezone": "America/Chicago",
    "description": "New Texas office"
  }'
```

### Update location (Admin or Manager)

```bash
curl -X PATCH http://localhost:3000/api/locations/sf-office \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -d '{
    "description": "Updated description"
  }'
```

### Assign manager to location (Admin only)

```bash
curl -X POST http://localhost:3000/api/locations/sf-office/managers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "userId": "USER_ID_HERE"
  }'
```

### Remove manager from location (Admin only)

```bash
curl -X DELETE http://localhost:3000/api/locations/sf-office/managers/USER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Rooms

### Get all rooms

```bash
curl http://localhost:3000/api/rooms
```

### Get rooms for a specific location

```bash
curl "http://localhost:3000/api/rooms?locationId=sf-office"
```

### Get specific room

```bash
curl http://localhost:3000/api/rooms/sf-golden-gate-conference-room
```

### Check room availability

```bash
curl "http://localhost:3000/api/rooms/sf-golden-gate-conference-room/availability?startDate=2025-10-20T00:00:00Z&endDate=2025-10-21T00:00:00Z"
```

### Create room (Admin or Manager)

```bash
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -d '{
    "name": "Innovation Lab",
    "locationId": "sf-office",
    "capacity": 8,
    "amenities": ["whiteboard", "video_conference", "standing_desks"],
    "description": "Creative workspace for brainstorming"
  }'
```

### Update room (Admin or Manager of location)

```bash
curl -X PATCH http://localhost:3000/api/rooms/ROOM_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer MANAGER_TOKEN" \
  -d '{
    "capacity": 12,
    "amenities": ["projector", "whiteboard", "video_conference"]
  }'
```

### Delete room (Admin or Manager of location)

```bash
curl -X DELETE http://localhost:3000/api/rooms/ROOM_ID \
  -H "Authorization: Bearer MANAGER_TOKEN"
```

## Bookings

### Get all bookings (filtered by role)

```bash
# Users see only their bookings
# Managers see bookings in their locations
# Admins see all bookings
curl http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter bookings by room

```bash
curl "http://localhost:3000/api/bookings?roomId=sf-golden-gate-conference-room" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter bookings by date range

```bash
curl "http://localhost:3000/api/bookings?startDate=2025-10-20T00:00:00Z&endDate=2025-10-27T00:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get specific booking

```bash
curl http://localhost:3000/api/bookings/BOOKING_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roomId": "sf-golden-gate-conference-room",
    "startTime": "2025-10-20T14:00:00Z",
    "endTime": "2025-10-20T15:30:00Z",
    "title": "Product Review Meeting",
    "description": "Monthly product review with stakeholders"
  }'
```

**Response:**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "id": "clx...",
    "roomId": "sf-golden-gate-conference-room",
    "userId": "clx...",
    "startTime": "2025-10-20T14:00:00.000Z",
    "endTime": "2025-10-20T15:30:00.000Z",
    "title": "Product Review Meeting",
    "description": "Monthly product review with stakeholders",
    "status": "CONFIRMED",
    "room": {...},
    "user": {...}
  }
}
```

### Update booking

```bash
curl -X PATCH http://localhost:3000/api/bookings/BOOKING_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startTime": "2025-10-20T15:00:00Z",
    "endTime": "2025-10-20T16:00:00Z",
    "title": "Updated Meeting Title"
  }'
```

### Cancel booking

```bash
curl -X DELETE http://localhost:3000/api/bookings/BOOKING_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Calendar Feeds

### Get office calendar feed

```bash
curl http://localhost:3000/api/calendar/office/sf-office.ics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o sf-office-calendar.ics
```

### Get room calendar feed

```bash
curl http://localhost:3000/api/calendar/room/sf-golden-gate-conference-room.ics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o room-calendar.ics
```

### Get user calendar feed

```bash
curl http://localhost:3000/api/calendar/user/YOUR_USER_ID.ics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o my-bookings.ics
```

## Testing Workflow

### 1. Complete booking workflow

```bash
# 1. Login as a user
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@miles.com", "password": "password123"}' \
  | jq -r '.token')

# 2. Get available rooms
curl http://localhost:3000/api/rooms?locationId=sf-office

# 3. Check room availability
curl "http://localhost:3000/api/rooms/sf-golden-gate-conference-room/availability?startDate=2025-10-20T00:00:00Z&endDate=2025-10-21T00:00:00Z"

# 4. Create a booking
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "roomId": "sf-golden-gate-conference-room",
    "startTime": "2025-10-20T14:00:00Z",
    "endTime": "2025-10-20T15:00:00Z",
    "title": "Team Meeting"
  }'

# 5. Get your bookings
curl http://localhost:3000/api/bookings -H "Authorization: Bearer $TOKEN"

# 6. Download calendar feed
curl http://localhost:3000/api/calendar/user/YOUR_USER_ID.ics \
  -H "Authorization: Bearer $TOKEN" \
  -o my-calendar.ics
```

### 2. Manager workflow

```bash
# Login as manager
MANAGER_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager.stavanger@miles.com", "password": "password123"}' \
  | jq -r '.token')

# Create a new room
curl -X POST http://localhost:3000/api/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -d '{
    "name": "Møterom 2",
    "locationId": "stavanger",
    "capacity": 6,
    "amenities": ["whiteboard"]
  }'

# View all bookings in managed locations
curl http://localhost:3000/api/bookings -H "Authorization: Bearer $MANAGER_TOKEN"
```

### 3. Admin workflow

```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@miles.com", "password": "password123"}' \
  | jq -r '.token')

# Create new location
curl -X POST http://localhost:3000/api/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Trondheim",
    "address": "Kongens gate 10",
    "city": "Trondheim",
    "country": "Norway",
    "timezone": "Europe/Oslo"
  }'

# Assign a manager to the location
curl -X POST http://localhost:3000/api/locations/LOCATION_ID/managers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"userId": "USER_ID"}'
```

## Error Examples

### 401 Unauthorized (missing token)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Response:
```json
{
  "error": "Missing or invalid authorization header"
}
```

### 403 Forbidden (insufficient permissions)

```bash
# Regular user trying to create a location
curl -X POST http://localhost:3000/api/locations \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{...}'
```

Response:
```json
{
  "error": "Insufficient permissions"
}
```

### 409 Conflict (room already booked)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roomId": "sf-golden-gate-conference-room",
    "startTime": "2025-10-20T10:00:00Z",
    "endTime": "2025-10-20T11:00:00Z",
    "title": "Meeting"
  }'
```

Response:
```json
{
  "error": "Room is not available for the selected time slot"
}
```

### 400 Bad Request (validation error)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "roomId": "sf-golden-gate-conference-room",
    "startTime": "invalid-date",
    "title": "Meeting"
  }'
```

Response:
```json
{
  "error": "Validation error",
  "details": [...]
}
```
