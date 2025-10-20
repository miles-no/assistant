# 🚀 Getting Started with Miles Assistant

> **Complete guide to setting up and running the entire Miles Assistant platform**

This guide walks you through setting up all six interfaces of the Miles Assistant platform, from database to AI-powered terminals.

---

## 📋 Table of Contents

- [Quick Start (5 Minutes)](#quick-start-5-minutes)
- [Prerequisites](#prerequisites)
- [Full Platform Setup](#full-platform-setup)
- [Individual Component Setup](#individual-component-setup)
- [Configuration](#configuration)
- [Verification & Testing](#verification--testing)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Quick Start (5 Minutes)

The fastest way to get Miles Assistant running:

```bash
# 1. Clone the repository
git clone <repo-url> miles-assistant
cd miles-assistant

# 2. Run the automated setup
./start-dev.sh
```

That's it! The script will:
- Check all prerequisites
- Start PostgreSQL in Docker
- Run database migrations and seeding
- Start API, Chat, and IRIS servers
- Verify all services are healthy

**Access Points:**
- API Docs: http://localhost:3000/api-docs
- Chat Assistant: http://localhost:3001
- IRIS Terminal: http://localhost:3002

**Default Login:**
- Email: `john.doe@miles.com`
- Password: `password123`

---

## Prerequisites

### Required

✅ **Node.js 20.x or higher**
```bash
node --version  # Should be v20.x or higher
```

<details>
<summary>Install Node.js</summary>

**macOS (Homebrew):**
```bash
brew install node@20
```

**Linux (nvm):**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

</details>

✅ **Docker & Docker Compose**
```bash
docker --version
docker-compose --version
```

<details>
<summary>Install Docker</summary>

**macOS:**
```bash
brew install --cask docker
# Or download Docker Desktop from docker.com
```

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

**Windows:**
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

</details>

### Optional (Recommended)

🦙 **Ollama** (for local, privacy-first AI)
```bash
ollama --version
```

<details>
<summary>Install Ollama</summary>

**macOS:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
# Or: brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from [ollama.com](https://ollama.com/download)

**After installation, pull a model:**
```bash
ollama pull qwen2.5:7b  # Recommended model
```

</details>

🛠️ **Go 1.24.3+** (for TUI/CLI)
```bash
go version  # Should be go1.24.3 or higher
```

<details>
<summary>Install Go</summary>

**macOS:**
```bash
brew install go
```

**Linux:**
```bash
wget https://go.dev/dl/go1.24.3.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.3.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

**Windows:**
Download from [go.dev/dl](https://go.dev/dl/)

</details>

---

## Full Platform Setup

### Step 1: Clone and Navigate

```bash
git clone <repo-url> miles-assistant
cd miles-assistant
```

### Step 2: Environment Configuration

Create environment files for each service:

**API Configuration:**
```bash
cp api/.env.example api/.env
nano api/.env  # Edit as needed
```

```env
# api/.env
DATABASE_URL="postgresql://miles:password@localhost:5433/miles_booking"
JWT_SECRET="your-super-secret-jwt-key-change-this"
PORT=3000
NODE_ENV=development
```

**Chat Assistant Configuration:**
```bash
cp chat-app/.env.example chat-app/.env
nano chat-app/.env
```

```env
# chat-app/.env
PORT=3001
MCP_API_URL=http://localhost:3000/api/mcp
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

**IRIS Configuration:**
```bash
cp iris/.env.example iris/.env
nano iris/.env
```

```env
# iris/.env
PORT=3002
MCP_API_URL=http://localhost:3000/api/mcp
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### Step 3: Start Database

```bash
docker-compose up -d database
```

Verify it's running:
```bash
docker ps | grep postgres
```

### Step 4: Setup API

```bash
cd api

# Install dependencies
npm install

# Run migrations
npm run prisma:migrate

# Seed database with test data
npm run prisma:seed

# Start API server
npm run dev  # Runs on port 3000
```

**Verify:**
Open http://localhost:3000/health - should return `{"status":"ok"}`

### Step 5: Start Chat Assistant

```bash
# In a new terminal
cd chat-app

# Install dependencies
npm install

# Start server
npm start  # Runs on port 3001
```

**Verify:**
Open http://localhost:3001 - should see login screen

### Step 6: Start IRIS Terminal

```bash
# In a new terminal
cd iris

# Install dependencies
npm install

# Start server
npm start  # Runs on port 3002
```

**Verify:**
Open http://localhost:3002 - should see HAL eye and login screen

### Step 7: Setup Web App (Optional)

```bash
# In a new terminal
cd web

# Install dependencies
npm install

# Generate API client
npm run generate

# Start development server
npm run dev  # Runs on port 5173
```

**Verify:**
Open http://localhost:5173 - should see login page

### Step 8: Install TUI & CLI (Optional)

```bash
# In a new terminal (from root)
./install.sh
```

This will:
- Check for Go installation
- Generate type-safe code from OpenAPI spec
- Build both TUI and CLI
- Install to `~/.local/bin`
- Verify PATH configuration

**Verify:**
```bash
miles-booking      # Launch TUI
miles --version    # Check CLI
```

---

## Individual Component Setup

### Just the API

```bash
# Minimal setup for API only
docker-compose up -d database
cd api
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

### Just the Chat Assistant

```bash
# Requires API to be running
cd chat-app
npm install
npm start
# Open http://localhost:3001
```

### Just IRIS

```bash
# Requires API to be running
cd iris
npm install
npm start
# Open http://localhost:3002
```

### Just the Web App

```bash
# Requires API to be running
cd web
npm install
npm run generate  # Generate API client
npm run dev
# Open http://localhost:5173
```

### Just TUI/CLI

```bash
# Requires API to be running
# From root directory
./install.sh

# Or manually:
cd tui
make generate
make build
make install

cd ../cli
make generate
make build
make install
```

---

## Configuration

### LLM Provider Selection

You can choose between three LLM providers:

#### Ollama (Local, Recommended)

**Pros:** Privacy-first, free, runs offline
**Setup:**
```bash
ollama pull qwen2.5:7b
```

**Config (chat-app/.env, iris/.env):**
```env
LLM_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

#### OpenAI (ChatGPT)

**Pros:** Highly accurate, no local setup
**Cons:** API costs, requires internet

**Config:**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

#### Anthropic (Claude)

**Pros:** Excellent reasoning, safety features
**Cons:** API costs, requires internet

**Config:**
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### Database Configuration

**Local PostgreSQL:**
```env
DATABASE_URL="postgresql://miles:password@localhost:5433/miles_booking"
```

**External PostgreSQL:**
```env
DATABASE_URL="postgresql://user:pass@your-db-host:5432/dbname?schema=public"
```

### TUI/CLI Configuration

Create `~/.config/miles-booking/config.yaml`:

```yaml
api_url: http://localhost:3000
theme: default
keybindings:
  quit: q
  search: /
  quick_book: Q
```

---

## Verification & Testing

### Health Checks

**API:**
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

**Chat:**
```bash
curl http://localhost:3001/health
# Should return service info
```

**IRIS:**
```bash
curl http://localhost:3002/health
# Should return service info
```

### Database Connection

```bash
cd api
npm run prisma:studio
# Opens database GUI at http://localhost:5555
```

### Test Accounts

All passwords: `password123`

| Email | Role | Location |
|-------|------|----------|
| `admin@miles.com` | ADMIN | Stavanger |
| `manager.stavanger@miles.com` | MANAGER | Stavanger |
| `manager.oslo@miles.com` | MANAGER | Oslo |
| `john.doe@miles.com` | USER | Stavanger |
| `jane.smith@miles.com` | USER | Oslo |

### Test Queries

**Chat/IRIS:**
```
> show me available rooms
> book Teamrommet tomorrow at 2pm for 1 hour
> what are my bookings?
```

**CLI:**
```bash
miles login john.doe@miles.com
miles rooms --location LOC123
miles bookings -o table
```

**Web:**
Navigate through the UI to create and view bookings.

---

## Troubleshooting

### Database Won't Connect

**Problem:** `Error: Can't reach database server`

**Solution:**
```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# If not running, start it
docker-compose up -d database

# Check logs
docker-compose logs database
```

### Ollama Not Responding

**Problem:** `ECONNREFUSED connecting to Ollama`

**Solution:**
```bash
# Check if Ollama is running
ollama list

# If not running (macOS/Linux):
ollama serve

# Check if model is downloaded
ollama pull qwen2.5:7b

# Verify endpoint
curl http://localhost:11434/api/version
```

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find and kill process using the port
lsof -i :3000
kill -9 <PID>

# Or change the port in .env
PORT=3001
```

### TUI/CLI Won't Build

**Problem:** `go: command not found` or build errors

**Solution:**
```bash
# Verify Go version
go version  # Should be 1.24.3+

# Clean and rebuild
cd tui  # or cli
make clean
make generate
make build
```

### Authentication Fails

**Problem:** `Invalid credentials` or `Token expired`

**Solution:**
```bash
# Reset user password in database
cd api
npm run prisma:studio
# Navigate to User table and update password
# Password: password123 (will be hashed on next login)

# Or reseed the database
npm run prisma:migrate reset
```

### Chat/IRIS Shows "Cannot connect to booking system"

**Problem:** MCP API URL is incorrect

**Solution:**
```bash
# Check .env file
cat chat-app/.env | grep MCP_API_URL
# Should be: MCP_API_URL=http://localhost:3000/api/mcp

# Verify API is running
curl http://localhost:3000/health

# Restart chat/iris service
```

---

## Next Steps

### Learn the Interfaces

- **[IRIS Documentation](./iris/README.md)** - Master the HAL-9000 terminal
- **[Chat Documentation](./chat-app/README.md)** - Natural language features
- **[Web App Documentation](./web/README.md)** - Visual interface guide
- **[TUI Documentation](./tui/README.md)** - Keyboard shortcuts and features
- **[CLI Documentation](./cli/README.md)** - Command reference

### Explore the Architecture

- **[Architecture Overview](./ARCHITECTURE.md)** - Deep dive into system design
- **[API Documentation](./api/README.md)** - REST API reference
- **[MCP Integration](./api/MCP_README.md)** - Model Context Protocol details

### Development Workflows

- **[API Development](./api/README.md#development)** - Hot reload, Prisma Studio
- **[Frontend Development](./web/README.md#development)** - React, Vite, API client generation
- **[Go Development](./tui/README.md#development)** - Building native binaries

### Integration Guides

- **[Slack Bot](./docs/SLACK_BOT_GUIDE.md)** - Build a Slack integration
- **[ESP32 Displays](./docs/ESP32_DISPLAY_GUIDE.md)** - Create room status displays
- **[Feedback System](./FEEDBACK_IMPLEMENTATION_GUIDE.md)** - Room feedback workflows

---

## Automation Scripts

### start-dev.sh
Starts the entire platform (database, API, chat, IRIS):
```bash
./start-dev.sh
```

### status.sh
Check status of all running services:
```bash
./status.sh
```

### logs.sh
Interactive log viewer with menu:
```bash
./logs.sh
```

### stop-dev.sh
Stop all services gracefully:
```bash
./stop-dev.sh
```

---

## Development Tips

### Hot Reload

All services support hot reload:
- **API**: `npm run dev` (nodemon)
- **Chat**: `npm start` (watches for changes)
- **IRIS**: `npm run dev` (node --watch)
- **Web**: `npm run dev` (Vite HMR)

### Database Management

```bash
cd api

# Create migration
npm run prisma:migrate dev --name description

# Apply migrations
npm run prisma:migrate deploy

# Reset database (DESTRUCTIVE)
npm run prisma:migrate reset

# Seed data
npm run prisma:seed

# Open Prisma Studio
npm run prisma:studio
```

### API Client Generation

```bash
# For Web App (TypeScript)
cd web
npm run generate  # Generates from api/openapi.yaml

# For TUI/CLI (Go)
cd tui  # or cli
make generate  # Uses oapi-codegen
```

### Testing Multiple LLM Providers

You can run different providers simultaneously:

```bash
# Terminal 1: IRIS with Ollama
cd iris
LLM_PROVIDER=ollama npm start

# Terminal 2: Chat with Claude
cd chat-app
LLM_PROVIDER=anthropic npm start
```

---

## Production Deployment

### Environment Variables

Set these in production:

```env
# api/.env (PRODUCTION)
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="<strong-random-secret>"
PORT=3000

# Ensure JWT_SECRET is:
# - At least 32 characters
# - Cryptographically random
# - Different per environment
```

### Build for Production

```bash
# API
cd api
npm run build
npm start

# Web
cd web
npm run build
# Deploy ./dist to CDN or static host

# TUI/CLI
cd tui
make build
# Binary at: ./bin/miles-booking

cd cli
make build
# Binary at: ./bin/miles
```

### Docker Compose (Production)

```bash
# Use production compose file
docker-compose -f docker-compose.yml up -d

# Or with build
docker-compose -f docker-compose.yml up -d --build
```

---

## Getting Help

- **Documentation**: Check component-specific READMEs
- **Architecture**: Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: Check existing issues or create a new one
- **Logs**: Use `./logs.sh` to debug service issues

---

<div align="center">

**[← Back to Main README](./README.md)** | **[Architecture Overview →](./ARCHITECTURE.md)**

Built with ❤️ for Miles

</div>
