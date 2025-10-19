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
- **💬 Chat Assistant** - AI-powered chat interface with Ollama + MCP
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

# Install CLI and TUI to your system (one-time)
./install.sh

# Start API (in one terminal)
cd api && npm run dev

# Start Web App (in another terminal)
cd web && npm run dev  # http://localhost:5173

# Or start the Chat Assistant (requires Ollama)
cd chat-app && npm start  # http://localhost:3001

# Or use the installed TUI
miles-booking

# Or use the installed CLI
miles --help
```

### Install CLI & TUI (Recommended)

The automated installer builds and installs both the CLI and TUI to your system:

```bash
./install.sh
```

This will:
- ✓ Check for Go and required tools
- ✓ Generate type-safe code from OpenAPI
- ✓ Build both CLI and TUI
- ✓ Install to `~/.local/bin` (or custom location via `INSTALL_DIR`)
- ✓ Verify PATH configuration

After installation:
```bash
miles-booking              # Launch TUI
miles login user@email.com # Use CLI
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
│   │   └── mcp/            # ⭐ Model Context Protocol server
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
├── chat-app/               # AI Chat Assistant (Node.js + Ollama)
│   ├── public/             # Frontend (HTML/CSS/JS)
│   ├── server.js           # Backend (Express + MCP client)
│   └── README.md           # Chat assistant documentation
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

## 💬 Chat Assistant Features
- **Natural Language Interface** - Talk to your booking system
- **AI-Powered** - Uses Ollama (llama3.2) for intelligent conversations
- **MCP Integration** - Direct access to all booking tools and resources
- **Smart Suggestions** - Find available rooms, suggest times, make bookings
- **Modern Chat UI** - Beautiful, responsive chat interface

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
- [Chat Assistant](./chat-app/README.md) - AI-powered chat interface
- [TUI](./tui/README.md) - Terminal UI documentation
- [CLI](./cli/README.md) - Command-line interface documentation
- [Slack Bot Guide](./docs/SLACK_BOT_GUIDE.md) - Implementation guide for Slack integration
- [ESP32 Display Guide](./docs/ESP32_DISPLAY_GUIDE.md) - Implementation guide for room displays

### API
- [API Documentation](./api/README.md)
- [API Setup Guide](./api/SETUP.md)
- [API Examples](./api/API_EXAMPLES.md)
- [MCP Integration](./api/MCP_README.md) - Model Context Protocol documentation
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

### Local Development (Recommended)

For the best development experience, use the provided automation scripts to run the API and Chat App locally with the database in Docker:

```bash
# Start all services (database in Docker, API + chat-app locally)
./start-dev.sh

# Check status of all services
./status.sh

# View logs (interactive menu)
./logs.sh

# Stop all services
./stop-dev.sh
```

**What `start-dev.sh` does:**
- ✓ Checks prerequisites (Docker, Ollama)
- ✓ Pulls llama3.2 model if needed
- ✓ Starts PostgreSQL in Docker
- ✓ Starts API on port 3000 with hot reload
- ✓ Starts Chat App on port 3001
- ✓ Performs health checks on all services
- ✓ Saves logs to `logs/` directory
- ✓ Displays service URLs and process IDs

**Services after startup:**
- Database: `localhost:5433` (Docker)
- API: `http://localhost:3000` (local)
- API Docs: `http://localhost:3000/api-docs` (local)
- Chat App: `http://localhost:3001` (local)

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
- Chat Assistant on port 3001 (requires Ollama on host)

```bash
docker-compose up -d     # Start services
docker-compose logs -f   # View logs
docker-compose down      # Stop services

# For development with hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Note for Chat Assistant:** Ollama must be running on your host machine for the chat-app container to work.

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
