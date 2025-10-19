# Miles Booking Terminal UI (TUI)

A beautiful terminal user interface for the Miles booking system built with [Bubble Tea](https://github.com/charmbracelet/bubbletea).

## 🔒 Type Safety

This TUI has **complete type safety** from the backend API to the Go code using OpenAPI code generation.

### How It Works

```
Backend OpenAPI Spec → Generated Go Types → TUI Code
     (api/openapi.yaml)    (internal/generated/)   (type-safe)
```

All API types are auto-generated from the OpenAPI specification using [`oapi-codegen`](https://github.com/oapi-codegen/oapi-codegen), ensuring:
- ✅ **Compile-time type safety** - Catch API changes at build time, not runtime
- ✅ **Auto-generated types** - No manual type definitions to keep in sync
- ✅ **JSON marshaling** - Proper JSON tags for all fields
- ✅ **Enum constants** - Type-safe enums for statuses and roles
- ✅ **Time handling** - Proper `time.Time` types with RFC3339 formatting

### Generated Types

The generated code (`internal/generated/types.gen.go`) includes:

```go
// Type-safe booking with enums
type Booking struct {
    Id          *string        `json:"id,omitempty"`
    RoomId      *string        `json:"roomId,omitempty"`
    UserId      *string        `json:"userId,omitempty"`
    StartTime   *time.Time     `json:"startTime,omitempty"`
    EndTime     *time.Time     `json:"endTime,omitempty"`
    Title       *string        `json:"title,omitempty"`
    Description *string        `json:"description,omitempty"`
    Status      *BookingStatus `json:"status,omitempty"`
}

// Type-safe enum
type BookingStatus string
const (
    BookingStatusPENDING   BookingStatus = "PENDING"
    BookingStatusCONFIRMED BookingStatus = "CONFIRMED"
    BookingStatusCANCELLED BookingStatus = "CANCELLED"
)

// Type-safe user roles
type UserRole string
const (
    ADMIN   UserRole = "ADMIN"
    MANAGER UserRole = "MANAGER"
    USER    UserRole = "USER"
)
```

### Regenerating Types

When the backend API changes:

```bash
# Regenerate types from OpenAPI spec
make generate

# Or manually:
oapi-codegen -config .oapi-codegen.yaml -o internal/generated/types.gen.go ../api/openapi.yaml
```

## 🚀 Quick Start

### Prerequisites

- Go 1.24.3 or later
- Access to the Miles booking API

### Installation

```bash
# Install dependencies
go mod download

# Generate type-safe code from OpenAPI spec
make generate

# Build the application
make build

# Run the TUI
make run
# or
./bin/miles-booking
```

## 📦 Features

- **Authentication** - Secure login with JWT tokens
- **Dashboard** - Overview of your bookings and quick actions
- **Locations** - Browse office locations
- **Rooms** - Search and filter meeting rooms
- **Bookings** - View, create, and cancel bookings
- **Admin Panel** - Manage locations and rooms (ADMIN only)
- **Calendar View** - Visual calendar of all bookings

## 🛠️ Development

### Makefile Commands

```bash
make generate      # Generate type-safe Go code from OpenAPI spec
make build         # Build the application
make run           # Run the application
make test          # Run tests
make clean         # Clean build artifacts
make install-tools # Install required code generation tools
make help          # Show all available commands
```

### Project Structure

```
tui/
├── cmd/miles-booking/     # Application entry point
│   └── main.go
├── internal/
│   ├── generated/         # ⭐ Auto-generated types from OpenAPI
│   │   └── types.gen.go
│   ├── api/               # API client
│   │   └── client.go
│   ├── models/            # Domain models (can extend generated types)
│   │   └── types.go
│   ├── ui/                # UI components
│   │   ├── app.go
│   │   ├── login.go
│   │   ├── dashboard.go
│   │   ├── locations.go
│   │   ├── rooms.go
│   │   ├── bookings.go
│   │   ├── admin.go
│   │   └── calendar.go
│   └── styles/            # UI styling
│       └── styles.go
├── .oapi-codegen.yaml     # OpenAPI code generation config
├── Makefile               # Build automation
└── README.md
```

## 🔄 Type Safety Workflow

1. **Backend changes** are made to `api/openapi.yaml`
2. **Run `make generate`** to regenerate Go types
3. **Compiler shows errors** if TUI code needs updates
4. **Fix the code** based on new types
5. **Build succeeds** - guaranteed type safety!

### Example: Adding a New Field

**Backend adds `priority` field to bookings:**

```yaml
# api/openapi.yaml
Booking:
  properties:
    priority:
      type: string
      enum: [low, medium, high]
```

**Regenerate types:**

```bash
make generate
```

**Go compiler immediately shows where to update:**

```go
// ❌ Compiler error: unknown field 'priority' in struct
booking := generated.Booking{
    Title:     "Meeting",
    StartTime: &startTime,
    // priority: ???  ← Compiler tells you to add this
}

// ✅ Fix the code
booking := generated.Booking{
    Title:     "Meeting",
    StartTime: &startTime,
    Priority:  &priority,  // Now type-safe!
}
```

## 🎨 UI Framework

Built with:
- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [Bubbles](https://github.com/charmbracelet/bubbles) - TUI components
- [Lipgloss](https://github.com/charmbracelet/lipgloss) - Styling
- [Huh](https://github.com/charmbracelet/huh) - Forms

## 📝 Configuration

Configuration is loaded from environment variables:

```bash
API_URL=http://localhost:3000  # Backend API URL
```

## 🔗 Related

- **API**: `/api` - Node.js/TypeScript backend with Prisma
- **Web Frontend**: `/web` - React frontend with similar type safety via `@hey-api/openapi-ts`
- **OpenAPI Spec**: `/api/openapi.yaml` - Single source of truth for all types

Both the TUI and web frontend use the same OpenAPI spec for type generation, ensuring consistency across all clients!
