# Miles Booking TUI

A beautiful Terminal User Interface for the Miles Room Booking System, built with [Bubble Tea](https://github.com/charmbracelet/bubbletea).

## Features

- **Beautiful Interface** - Gorgeous terminal UI with colors, borders, and animations
- **Vim Keybindings** - Power user features with keyboard shortcuts
- **Interactive Forms** - Date pickers, time selectors, and room filters
- **Visual Calendar** - Month, week, and day views with booking indicators
- **Real-time Updates** - Live availability checking and booking management
- **Role-based Features** - Admin and manager-specific functionality
- **Multi-location Support** - Browse and book across all Miles offices

## Installation

### Prerequisites

- Go 1.21 or higher
- Running API server (see [../api/README.md](../api/README.md))

### Build from Source

```bash
# From the tui/ directory
make build

# Or install system-wide
make install
```

## Usage

### Running the TUI

```bash
# Using Make
make run

# Or directly
./bin/miles-booking

# If installed system-wide
miles-booking
```

### Default API Connection

The TUI connects to `http://localhost:3000` by default. You can configure this in `config.yaml` (auto-created on first run).

## Configuration

Create `~/.config/miles-booking/config.yaml`:

```yaml
api:
  url: http://localhost:3000
  timeout: 30s

ui:
  theme: default
  vim_mode: true
  animations: true

keybindings:
  quit: ctrl+c
  help: "?"
  search: "/"
```

## Views

### Login Screen
- Email and password authentication
- Remember me option
- Register new account

### Dashboard
- Quick stats (upcoming bookings, available rooms)
- Recent activity
- Quick actions

### Locations
- Browse all Miles office locations
- View location details and available rooms
- Filter by country/city

### Rooms
- Browse all meeting rooms
- Filter by location, capacity, equipment
- Check real-time availability
- View room details

### Calendar
- **Month View** - See bookings across the month
- **Week View** - Detailed weekly schedule
- **Day View** - Hourly breakdown of bookings
- Navigate with vim keys or arrows

### Bookings
- View your bookings
- Create new bookings with interactive forms
- Edit or cancel existing bookings
- Filter by date range or location

### Search
- Quick search for rooms
- Filter by multiple criteria
- Save favorite searches

### Admin Panel
*(Admin/Manager only)*
- Manage locations and rooms
- View all bookings
- User management

## Keyboard Shortcuts

### Global
- `Ctrl+C` - Quit application
- `?` or `F1` - Show help
- `Esc` - Go back / Cancel
- `Tab` - Next field
- `Shift+Tab` - Previous field

### Navigation
- `j` / `↓` - Move down
- `k` / `↑` - Move up
- `h` / `←` - Move left / Previous
- `l` / `→` - Move right / Next
- `g` - Go to top
- `G` - Go to bottom

### Actions
- `Enter` - Select / Confirm
- `Space` - Toggle / Select
- `/` or `Ctrl+F` - Search
- `n` - New booking
- `e` - Edit booking
- `d` - Delete / Cancel booking

### Views
- `1` - Dashboard
- `2` - Locations
- `3` - Rooms
- `4` - Calendar
- `5` - Bookings
- `6` - Search
- `0` - Admin (if authorized)

## Development

### Project Structure

```
tui/
├── cmd/miles-booking/      # Main entry point
│   └── main.go
├── internal/
│   ├── api/                # API client
│   │   └── client.go
│   ├── ui/                 # Main UI logic
│   │   ├── app.go          # Application state
│   │   ├── login.go        # Login view
│   │   ├── dashboard.go    # Dashboard view
│   │   ├── locations.go    # Locations view
│   │   ├── rooms.go        # Rooms view
│   │   ├── calendar.go     # Calendar view
│   │   ├── bookings.go     # Bookings view
│   │   ├── search.go       # Search view
│   │   └── admin.go        # Admin view
│   ├── components/         # Reusable UI components
│   │   ├── table.go
│   │   ├── datepicker.go
│   │   ├── timepicker.go
│   │   └── form.go
│   ├── styles/             # UI styles and theme
│   │   └── styles.go
│   ├── models/             # Data models
│   │   └── types.go
│   └── utils/              # Helper functions
│       └── helpers.go
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### Running in Development

```bash
# Run with hot reload (requires air)
make dev

# Or just build and run
make run

# Format code
make fmt

# Run tests
make test

# Run linter
make lint
```

### Installing Air (Hot Reload)

```bash
go install github.com/air-verse/air@latest
```

## Dependencies

- [Bubble Tea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [Bubbles](https://github.com/charmbracelet/bubbles) - TUI components
- [Lip Gloss](https://github.com/charmbracelet/lipgloss) - Style definitions
- [Huh](https://github.com/charmbracelet/huh) - Interactive forms
- [Resty](https://github.com/go-resty/resty) - HTTP client
- [Viper](https://github.com/spf13/viper) - Configuration management

## Testing

Run the test suite:

```bash
make test

# With coverage
go test -cover ./...

# Verbose
go test -v ./...
```

## Troubleshooting

### "Cannot connect to API"
Make sure the API server is running:
```bash
cd ../api && npm run dev
```

### "Terminal too small"
Resize your terminal to at least 80x24 characters.

### Rendering issues
Try setting your `TERM` environment variable:
```bash
export TERM=xterm-256color
```

## Contributing

This is a Miles internal project. Follow the development guidelines:

1. Use `make fmt` before committing
2. Run `make test` to ensure tests pass
3. Follow Go best practices and conventions
4. Update documentation for new features

## License

MIT

---

Built with ❤️ for Miles using [Charm](https://charm.sh) libraries
