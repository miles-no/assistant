# Miles Room Booking System

A comprehensive room booking system for Miles office locations with **multiple type-safe clients** and REST API.

## 🔒 Type Safety Across All Clients

All clients maintain complete type safety from the backend API using OpenAPI code generation:

```
Backend OpenAPI Spec → Generated Types → All Clients
   (api/openapi.yaml)   (various tools)   (type-safe)
```

- **Web** (React): `@hey-api/openapi-ts` → TypeScript types
- **TUI** (Go): `oapi-codegen` → Go types
- **CLI** (Go): `oapi-codegen` → Go types
- **Slack Bot** (Node.js): `@hey-api/openapi-ts` → TypeScript types (guide available)
- **ESP32 Display** (C++): Python script → C++ headers (guide available)

## 🎯 Features

### Core Features
- **🏢 Multi-location** - 7 office locations (Norway + Lithuania)
- **👥 Role-based access** - Admin, Manager, User roles
- **📅 Real-time booking** - Conflict detection and availability checking
- **📆 Calendar feeds** - iCal export for Google Calendar, Outlook, etc.
- **🔒 Complete Type Safety** - OpenAPI-generated types for all clients

### Multiple Clients
- **🌐 Web App** - Modern React SPA with shadcn/ui components
- **🎨 TUI** - Beautiful terminal interface built with Bubble Tea (Go)
- **⌨️ CLI** - Fast, scriptable command-line interface (Go + Cobra)
- **📱 Slack Bot** - Interactive Slack integration (implementation guide)
- **📺 ESP32 Displays** - Room status displays (implementation guide)

## 🚀 Quick Start

### Prerequisites

- **API**: Node.js 20+, PostgreSQL (or Docker)
- **Web**: Node.js 20+
- **TUI**: Go 1.24.3+
- **CLI**: Go 1.24.3+

### Setup Everything (Automated)

From the root directory:

```bash
# Set up API and database
./setup.sh

# Start API (in one terminal)
cd api && npm run dev

# Start Web App (in another terminal)
cd web && npm run dev  # http://localhost:5173

# Or use the TUI
cd tui && make run

# Or use the CLI
cd cli && make build && ./bin/miles --help
```

### Or Use Docker

```bash
# Start database and API
docker-compose up -d

# Then run any client you prefer
```

## 📁 Project Structure

```
booking/
├── api/                    # REST API (Node.js + TypeScript)
│   ├── src/                # API source code
│   ├── prisma/             # Database schema and migrations
│   └── openapi.yaml        # ⭐ OpenAPI 3.0 specification (source of truth)
│
├── web/                    # Web App (React + TypeScript)
│   ├── src/
│   │   ├── components/     # React components (shadcn/ui)
│   │   ├── lib/
│   │   │   └── api/        # ⭐ Generated API client
│   │   └── pages/          # App routes
│   └── package.json
│
├── tui/                    # Terminal UI (Go + Bubble Tea)
│   ├── cmd/                # Main entry point
│   ├── internal/
│   │   ├── generated/      # ⭐ Generated Go types
│   │   ├── api/            # API client
│   │   ├── ui/             # Views (login, dashboard, calendar, etc.)
│   │   └── styles/         # Theming and colors
│   └── Makefile
│
├── cli/                    # CLI (Go + Cobra)
│   ├── cmd/miles/          # Main entry point
│   ├── internal/
│   │   ├── generated/      # ⭐ Generated Go types
│   │   ├── commands/       # CLI commands
│   │   └── config/         # API client
│   └── Makefile
│
├── docs/                   # Implementation guides
│   ├── SLACK_BOT_GUIDE.md  # Slack bot implementation
│   └── ESP32_DISPLAY_GUIDE.md  # ESP32 display implementation
│
├── docker-compose.yml
└── setup.sh                # Automated setup script
```

## 🌐 Web App Features
- **Modern React SPA** with TypeScript and Vite
- **Beautiful UI** using shadcn/ui components
- **Complete Type Safety** with generated API client
- **Responsive Design** - Works on mobile, tablet, and desktop
- **Dark Mode** support
- **Real-time Updates** - Booking status updates

## 🎨 TUI Features
- **Interactive Terminal UI** built with Bubble Tea
- **Vim Keybindings** - Power user features
- **Views**: Login, Dashboard, Locations, Rooms, Calendar, Bookings, Admin Panel
- **Keyboard Shortcuts**: `j/k` (navigation), `/` (search), `q` (quick book)

## ⌨️ CLI Features
- **Fast & Scriptable** - Perfect for automation
- **Commands**: `login`, `rooms`, `book`, `bookings`, `cancel`
- **Multiple Output Formats** - table, JSON, CSV
- **Configuration** - Via file, environment variables, or flags

```bash
# List rooms
miles rooms --location LOC123 -o json

# Create booking
miles book -r ROOM123 -s "2025-10-19 14:00" -e "2025-10-19 15:00" -t "Meeting"

# View your bookings
miles bookings -o csv > bookings.csv
```

## 📚 Documentation

### Clients
- [Web App](./web/README.md) - React frontend documentation
- [TUI](./tui/README.md) - Terminal UI documentation
- [CLI](./cli/README.md) - Command-line interface documentation
- [Slack Bot Guide](./docs/SLACK_BOT_GUIDE.md) - Implementation guide for Slack integration
- [ESP32 Display Guide](./docs/ESP32_DISPLAY_GUIDE.md) - Implementation guide for room displays

### API
- [API Documentation](./api/README.md)
- [API Setup Guide](./api/SETUP.md)
- [API Examples](./api/API_EXAMPLES.md)
- [OpenAPI Spec](./api/openapi.yaml) - Interactive docs at `/api-docs`

## 🏢 Office Locations

After seeding, you'll have access to:

**Norway**
- Stavanger (5 meeting rooms)
- Haugesund
- Oslo
- Bergen
- Ålesund
- Innlandet (Lillehammer)

**International**
- Lithuania (Vilnius)

## 👥 Test Accounts

All passwords: `password123`

- **Admin**: `admin@miles.com`
- **Manager (Stavanger)**: `manager.stavanger@miles.com`
- **Manager (Oslo)**: `manager.oslo@miles.com`
- **User**: `john.doe@miles.com`
- **User**: `jane.smith@miles.com`

## 🛠️ Development

### API Development

```bash
cd api
npm run dev              # Start dev server with hot reload
npm run prisma:studio    # Open database GUI
npm run openapi:gen      # Generate OpenAPI types
npm run build            # Build for production
```

### Web Development

```bash
cd web
npm run dev              # Start Vite dev server
npm run generate         # Generate API client from OpenAPI
npm run build            # Build for production
```

### TUI Development

```bash
cd tui
make generate            # Generate Go types from OpenAPI
make build               # Build binary
make run                 # Run the TUI
make install             # Install to system
```

### CLI Development

```bash
cd cli
make generate            # Generate Go types from OpenAPI
make build               # Build binary
make install             # Install to system
./bin/miles --help       # Test CLI
```

### Database

```bash
cd api
npm run prisma:migrate   # Run migrations
npm run prisma:seed      # Seed sample data
npx prisma migrate reset # Reset database
```

## 🔧 Configuration

### API Configuration
Edit `api/.env`:
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Secret for JWT tokens
- `PORT` - API server port

### TUI Configuration
Edit `tui/config.yaml` (auto-created):
- `api_url` - API endpoint (default: http://localhost:3000)
- `theme` - Color theme
- `keybindings` - Custom keyboard shortcuts

## 🐳 Docker

The provided `docker-compose.yml` starts:
- PostgreSQL database on port 5433
- API server on port 3000

```bash
docker-compose up -d     # Start services
docker-compose logs -f   # View logs
docker-compose down      # Stop services
```

## 📦 Building for Production

### API
```bash
cd api
npm run build
npm start
```

### Web
```bash
cd web
npm run build
# Static files in: ./dist
```

### TUI
```bash
cd tui
make build
# Binary at: ./bin/miles-booking
```

### CLI
```bash
cd cli
make build
# Binary at: ./bin/miles
```

## 🤝 Contributing

This is a Miles internal project. See individual component READMEs for development guidelines.

## 📄 License

MIT

---

Built with ❤️ for Miles
