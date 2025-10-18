# Quick Start Guide

Get the Miles Room Booking API running on your machine in under 2 minutes!

## Prerequisites

- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 20+** - [Install Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)

## One-Command Setup

Run the automated setup script:

```bash
./setup.sh
```

This script will:
- ✓ Check all prerequisites
- ✓ Install npm dependencies
- ✓ Create `.env` file with proper configuration
- ✓ Start PostgreSQL in Docker
- ✓ Run database migrations
- ✓ Seed the database with sample data
- ✓ Verify the setup

## What You Get

After running the setup script, you'll have:

- **PostgreSQL database** running in Docker (port 5432)
- **5 test user accounts** with different roles
- **3 office locations** (San Francisco, New York, London)
- **8 meeting rooms** across the offices
- **2 sample bookings**

### Test Accounts

All passwords: `password123`

| Email | Role | Access |
|-------|------|--------|
| admin@miles.com | Admin | Full system access |
| manager.sf@miles.com | Manager | San Francisco office |
| manager.ny@miles.com | Manager | New York office |
| john.doe@miles.com | User | Can book rooms |
| jane.smith@miles.com | User | Can book rooms |

## Start Development

### 1. Start the API server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 2. View API Documentation

Open your browser and visit:
```
http://localhost:3000/api-docs
```

This provides interactive API documentation where you can explore all endpoints and try them out.

### 3. Test the API

```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@miles.com", "password": "password123"}'
```

### 4. Explore with Prisma Studio (optional)

```bash
npm run prisma:studio
```

Opens a GUI at `http://localhost:5555` to view and edit your database.

## Common Commands

### Database Management

```bash
# Stop database
docker-compose stop

# Start database
docker-compose start

# View database logs
docker-compose logs -f

# Reset database (deletes all data)
npx prisma migrate reset
```

### Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Open Prisma Studio
npm run prisma:studio
```

## Project Structure

```
├── docker-compose.yml      # PostgreSQL setup
├── setup.sh                # Automated setup script
├── .env                    # Environment variables (created by setup)
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Sample data
└── src/
    ├── controllers/        # Request handlers
    ├── middleware/         # Auth & authorization
    ├── routes/             # API endpoints
    └── utils/              # Utilities
```

## API Endpoints

**Complete API documentation**: Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive Swagger UI documentation.

### Quick Reference

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

**Locations**
- `GET /api/locations` - List all locations
- `POST /api/locations` - Create location (Admin)
- `PATCH /api/locations/:id` - Update location (Admin/Manager)

**Rooms**
- `GET /api/rooms` - List rooms
- `GET /api/rooms/:id/availability` - Check availability
- `POST /api/rooms` - Create room (Admin/Manager)

**Bookings**
- `GET /api/bookings` - List bookings
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

**Calendar Feeds**
- `GET /api/calendar/office/:id.ics` - Office calendar
- `GET /api/calendar/room/:id.ics` - Room calendar
- `GET /api/calendar/user/:id.ics` - User calendar

## Testing the API

See [API_EXAMPLES.md](./API_EXAMPLES.md) for comprehensive examples with curl commands.

Or use the included [api.http](./api.http) file with the REST Client extension in VS Code.

## Troubleshooting

### "Docker daemon is not running"
Start Docker Desktop or the Docker service.

### "Port 5432 is already in use"
Another PostgreSQL instance is running. Either:
- Stop the other instance: `sudo systemctl stop postgresql`
- Change the port in `docker-compose.yml`: `"5433:5432"`
- Update `DATABASE_URL` in `.env` to match the new port

### "Database connection failed"
```bash
# Check if container is running
docker ps | grep miles-booking-db

# Restart the container
docker-compose restart

# View logs for errors
docker-compose logs
```

### Reset Everything

```bash
# Stop and remove database container
docker-compose down -v

# Run setup again
./setup.sh
```

## Next Steps

- **Explore the API** - Try all endpoints with [API_EXAMPLES.md](./API_EXAMPLES.md)
- **Read full docs** - Check [SETUP.md](./SETUP.md) for detailed information
- **Build a frontend** - The API is ready for integration
- **Deploy** - Ready for production deployment

## Need Help?

- Full setup guide: [SETUP.md](./SETUP.md)
- API documentation: [README.md](./README.md)
- API examples: [API_EXAMPLES.md](./API_EXAMPLES.md)
