# Miles Room Booking API

REST API for the Miles room booking system. Part of the Miles Booking monorepo.

## Quick Start

From the `api/` directory:

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run prisma:generate
npm run prisma:migrate

# Seed database
npm run prisma:seed

# Start development server
npm run dev
```

API will be available at `http://localhost:3000`

## API Documentation

Interactive API documentation: `http://localhost:3000/api-docs`

## Features

- JWT authentication
- Role-based access control (Admin, Manager, User)
- Multi-location office management
- Room booking with conflict detection
- iCal calendar feed generation
- PostgreSQL database with Prisma ORM

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:seed` - Seed database with sample data

## Documentation

- [Setup Guide](./SETUP.md)
- [Quick Start](./QUICKSTART.md)
- [API Examples](./API_EXAMPLES.md)
- [OpenAPI Spec](./openapi.yaml)
- [REST Client Tests](./api.http)

## Project Structure

```
api/
├── src/
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Auth, authorization, error handling
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities (JWT, password, Prisma)
│   ├── app.ts          # Express app configuration
│   └── index.ts        # Server entry point
├── prisma/
│   ├── schema.prisma   # Database schema
│   └── seed.ts         # Seed data
├── openapi.yaml        # OpenAPI 3.0 specification
└── package.json
```

## Main Branch

See the root [README.md](../README.md) for the complete monorepo overview.
