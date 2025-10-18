# Miles Room Booking API - Setup Guide

## Prerequisites

- Node.js 20+
- Docker (for automated setup) OR PostgreSQL 14+
- npm or yarn

## Quick Start (Automated)

**Recommended for local development:**

```bash
./setup.sh
```

This automated script will set up everything you need:
- Install npm dependencies
- Start PostgreSQL in Docker
- Configure environment variables
- Run database migrations
- Seed with sample data

Then start the server: `npm run dev`

See [QUICKSTART.md](./QUICKSTART.md) for more details.

## Manual Setup

If you prefer manual setup or need to use an existing PostgreSQL instance:

### 1. Database Setup

First, make sure PostgreSQL is running. Then create the database:

```bash
createdb miles_booking
```

Or using psql:
```sql
CREATE DATABASE miles_booking;
```

### 2. Install Dependencies

Dependencies are already installed, but if you need to reinstall:

```bash
npm install
```

### 3. Configure Environment Variables

The `.env` file has been created with default values. Update it with your database credentials:

```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/miles_booking?schema=public"
```

### 4. Run Database Migrations

Generate the Prisma client and create database tables:

```bash
npm run prisma:generate
npm run prisma:migrate
```

When prompted for a migration name, you can use: `init`

### 5. Seed the Database (Optional)

Populate the database with sample data:

```bash
npm run prisma:seed
```

This creates:
- **5 test users** (1 admin, 2 managers, 2 regular users)
- **7 office locations** (Stavanger, Haugesund, Oslo, Bergen, Ålesund, Innlandet, Lithuania)
- **5 rooms** in Stavanger office
- **2 sample bookings**

Test accounts (all passwords: `password123`):
- Admin: `admin@miles.com`
- Manager (Stavanger): `manager.stavanger@miles.com`
- Manager (Oslo): `manager.oslo@miles.com`
- User 1: `john.doe@miles.com`
- User 2: `jane.smith@miles.com`

### 6. Start the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

Check health: `http://localhost:3000/health`

## Development Tools

### Prisma Studio

View and edit your database with a GUI:

```bash
npm run prisma:studio
```

Opens at `http://localhost:5555`

### Build for Production

```bash
npm run build
npm start
```

## Testing the API

### 1. Register a new user

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@miles.com",
    "password": "password123"
  }'
```

Save the returned `token` for subsequent requests.

### 3. Get all locations

```bash
curl http://localhost:3000/api/locations
```

### 4. Get rooms for a location

```bash
curl http://localhost:3000/api/rooms?locationId=sf-office
```

### 5. Create a booking (requires authentication)

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "roomId": "sf-golden-gate-conference-room",
    "startTime": "2025-10-20T10:00:00Z",
    "endTime": "2025-10-20T11:00:00Z",
    "title": "Team Standup",
    "description": "Daily team sync"
  }'
```

### 6. Get calendar feed for a room

```bash
curl http://localhost:3000/api/calendar/room/sf-golden-gate-conference-room.ics \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -o calendar.ics
```

## Project Structure

```
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Seed data script
├── src/
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth, authorization, error handling
│   ├── routes/             # API routes
│   ├── services/           # Business logic (future)
│   ├── types/              # TypeScript types
│   ├── utils/              # Utilities (JWT, password, Prisma)
│   ├── app.ts              # Express app configuration
│   └── index.ts            # Server entry point
├── .env                    # Environment variables
├── package.json
└── tsconfig.json
```

## Common Issues

### Database connection failed
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Verify database exists: `psql -l`

### Port already in use
- Change PORT in .env file
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

### Prisma errors
- Regenerate Prisma Client: `npm run prisma:generate`
- Reset database (WARNING: deletes all data): `npx prisma migrate reset`

## Next Steps

- Integrate with a frontend application
- Add email notifications for bookings
- Implement recurring bookings
- Add booking conflicts resolution UI
- Implement webhook notifications
- Add booking reminders
- Create admin dashboard
- Add more comprehensive tests

## API Documentation

See [README.md](./README.md) for full API endpoint documentation.
