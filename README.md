# Miles Room Booking API

A comprehensive room booking system for Miles office locations with role-based access control and calendar feed generation.

## Features

- **Multi-location support**: Manage multiple office locations
- **Role-based access control**: Admin, Manager, and User roles
- **Room booking**: Book rooms with conflict detection
- **Calendar feeds**: Generate iCal feeds per office, room, or user
- **Timezone support**: Handle bookings across different timezones

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Zod

## Quick Start

### Automated Setup (Recommended)

Get up and running in under 2 minutes:

```bash
./setup.sh
```

This automated script will:
- Install dependencies
- Start PostgreSQL in Docker
- Run migrations and seed data
- Configure environment variables

Then start the server:

```bash
npm run dev
```

See [QUICKSTART.md](./QUICKSTART.md) for details.

### Manual Setup

If you prefer manual setup or have an existing PostgreSQL instance:

**Prerequisites**: Node.js 20+, PostgreSQL 14+, npm

1. Install dependencies: `npm install`
2. Configure `.env` with your database URL
3. Run migrations: `npm run prisma:migrate`
4. Generate Prisma Client: `npm run prisma:generate`
5. Seed database: `npm run prisma:seed`
6. Start server: `npm run dev`

See [SETUP.md](./SETUP.md) for detailed instructions.

## API Documentation

**Interactive API Documentation**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

The API includes a complete OpenAPI 3.0 specification with interactive Swagger UI documentation. Start the server and visit `/api-docs` to explore all endpoints, request/response schemas, and try out the API directly from your browser.

**OpenAPI Spec**: [openapi.yaml](./openapi.yaml)

### Quick Reference

#### Authentication

#### Register a new user
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

### Locations

```
GET    /api/locations          - List all locations
GET    /api/locations/:id      - Get location details
POST   /api/locations          - Create location (Admin only)
PATCH  /api/locations/:id      - Update location (Admin/Manager)
DELETE /api/locations/:id      - Delete location (Admin only)
```

### Rooms

```
GET    /api/rooms              - List rooms (filter by locationId)
GET    /api/rooms/:id          - Get room details
POST   /api/rooms              - Create room (Admin/Manager)
PATCH  /api/rooms/:id          - Update room (Admin/Manager)
DELETE /api/rooms/:id          - Delete room (Admin/Manager)
```

### Bookings

```
GET    /api/bookings           - List bookings (filtered by role)
GET    /api/bookings/:id       - Get booking details
POST   /api/bookings           - Create booking
PATCH  /api/bookings/:id       - Update booking (owner/manager/admin)
DELETE /api/bookings/:id       - Cancel booking (owner/manager/admin)
```

### Calendar Feeds

```
GET /api/calendar/office/:locationId.ics  - Office calendar feed
GET /api/calendar/room/:roomId.ics        - Room calendar feed
GET /api/calendar/user/:userId.ics        - User calendar feed
```

## Database Schema

### Roles
- **ADMIN**: Full system access
- **MANAGER**: Manage assigned locations and their rooms
- **USER**: Book rooms

### Main Entities
- **User**: System users with roles
- **Location**: Office locations
- **Room**: Bookable rooms within locations
- **Booking**: Room reservations
- **ManagerLocation**: Manager-to-location assignments

## License

MIT
