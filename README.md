# Miles Room Booking System

A comprehensive room booking system for Miles office locations with a **beautiful Terminal User Interface** (TUI) and REST API.

## 🎯 Features

- **🎨 Beautiful TUI** - Gorgeous terminal interface built with Bubble Tea (Go)
- **🔌 REST API** - Full-featured API with OpenAPI documentation
- **🏢 Multi-location** - 7 office locations (Norway + Lithuania)
- **👥 Role-based access** - Admin, Manager, User roles
- **📅 Real-time booking** - Conflict detection and availability checking
- **📆 Calendar feeds** - iCal export for Google Calendar, Outlook, etc.
- **✨ Interactive forms** - Date pickers, time slots, room selection
- **⚡ Vim keybindings** - Power user features with keyboard shortcuts

## 🚀 Quick Start

### Prerequisites

- **API**: Node.js 20+, PostgreSQL (or Docker)
- **TUI**: Go 1.21+

### Setup Everything (Automated)

From the root directory:

```bash
# Set up API and database
./setup.sh

# Start API (in one terminal)
cd api && npm run dev

# Build and run TUI (in another terminal)
cd tui && make run
```

### Or Use Docker

```bash
# Start database and API
docker-compose up -d

# Run TUI
cd tui && make run
```

## 📁 Project Structure

```
booking/
├── api/              # REST API (Node.js + TypeScript)
│   ├── src/          # API source code
│   ├── prisma/       # Database schema and migrations
│   └── openapi.yaml  # OpenAPI 3.0 specification
│
├── tui/              # Terminal UI (Go + Bubble Tea)
│   ├── cmd/          # Main entry point
│   ├── internal/     # TUI implementation
│   │   ├── api/      # API client
│   │   ├── ui/       # Views (login, dashboard, calendar, etc.)
│   │   ├── components/ # Reusable UI components
│   │   └── styles/   # Theming and colors
│   └── Makefile      # Build commands
│
├── docker-compose.yml
└── setup.sh          # Automated setup script
```

## 🎨 TUI Features

### Views
- **Login** - Secure authentication
- **Dashboard** - Overview of your bookings and quick stats
- **Locations** - Browse all Miles offices
- **Rooms** - Filter and search meeting rooms
- **Calendar** - Visual month/week/day views with booking indicators
- **Bookings** - Manage your reservations
- **Search** - Quick find rooms and filter by criteria
- **Admin Panel** - Manage locations and rooms (Admin/Manager)

### Keyboard Shortcuts
- **Navigation**: `j/k` (up/down), `h/l` (left/right), `Tab` (next field)
- **Actions**: `Enter` (select), `Esc` (back), `q` (quick book)
- **Search**: `/` or `Ctrl+F`
- **Help**: `F1` or `?`
- **Quit**: `Ctrl+C`

## 📚 Documentation

- [API Documentation](./api/README.md)
- [API Setup Guide](./api/SETUP.md)
- [API Examples](./api/API_EXAMPLES.md)
- [TUI Documentation](./tui/README.md)
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
npm run dev              # Start dev server
npm run prisma:studio    # Open database GUI
npm run build            # Build for production
```

### TUI Development

```bash
cd tui
make dev                 # Run with hot reload
make build               # Build binary
make install             # Install to /usr/local/bin
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

### TUI
```bash
cd tui
make build
# Binary at: ./bin/miles-booking
```

## 🤝 Contributing

This is a Miles internal project. See individual component READMEs for development guidelines.

## 📄 License

MIT

---

Built with ❤️ for Miles
