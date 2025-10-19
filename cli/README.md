# Miles Booking CLI

A fast, scriptable command-line interface for the Miles booking system.

## 🔒 Type Safety

Like the TUI and web frontend, the CLI has **complete type safety** from the backend API using shared OpenAPI-generated Go types:

```
Backend OpenAPI Spec → Generated Go Types → CLI & TUI
     (api/openapi.yaml)    (tui/internal/generated/)   (shared via symlink)
```

All API types are shared with the TUI, ensuring consistency across all Go-based clients.

## 🚀 Quick Start

### Installation

```bash
# Build the CLI
make build

# Or install to your system
make install

# Verify installation
miles --version
```

### First Use

```bash
# Login to save your token
miles login user@example.com

# Your token is saved to ~/.miles-cli.yaml
```

## 📖 Commands

### Authentication

```bash
# Login and save token
miles login user@example.com

# Login with flags
miles login --email user@example.com
```

### List Rooms

```bash
# List all rooms
miles rooms

# Filter by location
miles rooms --location LOC123

# Output as JSON
miles rooms -o json

# Export to CSV
miles rooms -o csv > rooms.csv
```

### Create Booking

```bash
# Book a room
miles book \
  --room ROOM123 \
  --start "2025-10-19 14:00" \
  --end "2025-10-19 15:00" \
  --title "Team Meeting" \
  --description "Weekly sync"

# Using short flags
miles book -r ROOM123 -s "2025-10-19T14:00:00Z" -e "2025-10-19T15:00:00Z" -t "1:1"
```

### List Your Bookings

```bash
# List all your bookings
miles bookings

# Output as JSON
miles bookings -o json

# Export to CSV
miles bookings -o csv > my-bookings.csv
```

### Cancel Booking

```bash
# Cancel a booking
miles cancel BOOK123

# Using flag
miles cancel --id BOOK123
```

## 🎯 Output Formats

All list commands support multiple output formats:

- `table` (default) - Human-readable table
- `json` - Machine-readable JSON
- `csv` - Comma-separated values

```bash
# Human-readable
miles rooms

# For scripts
miles rooms -o json | jq '.[] | select(.capacity > 10)'

# For spreadsheets
miles bookings -o csv > bookings.csv
```

## ⚙️ Configuration

The CLI uses a configuration file at `~/.miles-cli.yaml`:

```yaml
api_url: http://localhost:3000
token: your-jwt-token-here
```

You can also use environment variables:

```bash
export MILES_API_URL=http://localhost:3000
export MILES_TOKEN=your-token
miles rooms
```

Or pass flags:

```bash
miles --api-url http://localhost:3000 --token your-token rooms
```

**Priority**: Flags > Environment Variables > Config File > Defaults

## 🛠️ Development

### Project Structure

```
cli/
├── cmd/miles/           # Application entry point
│   └── main.go
├── internal/
│   ├── generated/       # ⭐ Symlink to TUI's generated types
│   ├── commands/        # CLI commands
│   │   ├── root.go
│   │   ├── login.go
│   │   ├── rooms.go
│   │   ├── book.go
│   │   ├── bookings.go
│   │   └── cancel.go
│   └── config/          # API client
│       └── client.go
├── Makefile
└── README.md
```

### Makefile Commands

```bash
make build       # Build the binary
make install     # Install to system
make run         # Run the CLI
make test        # Run tests
make clean       # Clean build artifacts
make tidy        # Tidy go.mod
make completions # Generate shell completions
```

### Adding New Commands

1. Create a new command file in `internal/commands/`:

```go
package commands

import (
	"github.com/spf13/cobra"
)

var myCmd = &cobra.Command{
	Use:   "mycmd",
	Short: "My new command",
	RunE:  runMyCmd,
}

func runMyCmd(cmd *cobra.Command, args []string) error {
	// Implementation
	return nil
}
```

2. Register it in `root.go`:

```go
rootCmd.AddCommand(myCmd)
```

## 🔗 Scripting Examples

### Check Available Rooms

```bash
#!/bin/bash
# Find rooms with capacity >= 10

miles rooms -o json | jq '.[] | select(.capacity >= 10) | .name'
```

### Batch Booking

```bash
#!/bin/bash
# Book recurring meetings

for day in {20..24}; do
  miles book \
    -r ROOM123 \
    -s "2025-10-$day 10:00" \
    -e "2025-10-$day 11:00" \
    -t "Daily Standup"
done
```

### Export Report

```bash
#!/bin/bash
# Generate weekly booking report

echo "Booking Report - $(date)" > report.txt
miles bookings -o csv >> report.txt
```

## 🎨 Shell Completions

Generate completions for your shell:

```bash
# Bash
make completions
source completions/miles.bash

# Or add to your .bashrc
echo 'source /path/to/completions/miles.bash' >> ~/.bashrc

# Zsh
source completions/miles.zsh

# Fish
source completions/miles.fish
```

## 🔗 Related

- **TUI**: `/tui` - Interactive terminal UI built with Bubble Tea
- **Web Frontend**: `/web` - React frontend
- **API**: `/api` - Node.js/TypeScript backend with Prisma
- **OpenAPI Spec**: `/api/openapi.yaml` - Single source of truth for all types

All clients maintain type safety from the same OpenAPI specification!
