package commands

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/miles/booking-cli/internal/config"
	"github.com/miles/booking-cli/internal/generated"
	"github.com/spf13/cobra"
)

var roomsCmd = &cobra.Command{
	Use:   "rooms",
	Short: "List and search meeting rooms",
	Long: `List all available meeting rooms or filter by location.

Examples:
  miles rooms                           # List all rooms
  miles rooms --location LOC123         # Filter by location ID
  miles rooms -o json                   # Output as JSON
  miles rooms -o csv > rooms.csv        # Export to CSV`,
	RunE: runRooms,
}

var roomsLocationID string

func init() {
	roomsCmd.Flags().StringVarP(&roomsLocationID, "location", "l", "", "filter by location ID")
}

func runRooms(cmd *cobra.Command, args []string) error {
	// Check authentication
	token := getAuthToken()
	if token == "" {
		return fmt.Errorf("not authenticated. Run 'miles login' first")
	}

	// Create API client
	client := config.NewClient(getAPIURL(), token)

	// Fetch rooms
	rooms, err := client.GetRooms(roomsLocationID)
	if err != nil {
		return err
	}

	if len(rooms) == 0 {
		fmt.Println("No rooms found")
		return nil
	}

	// Output based on format
	switch output {
	case "json":
		return outputJSON(rooms)
	case "csv":
		return outputRoomsCSV(rooms)
	default:
		return outputRoomsTable(rooms)
	}
}

func outputRoomsTable(rooms []generated.Room) error {
	// Print header
	fmt.Printf("%-12s %-30s %-20s %-10s\n", "ID", "Name", "Location", "Capacity")
	fmt.Println(strings.Repeat("-", 80))

	// Print rooms
	for _, room := range rooms {
		id := ""
		if room.Id != nil {
			id = *room.Id
		}
		name := ""
		if room.Name != nil {
			name = *room.Name
		}
		capacity := 0
		if room.Capacity != nil {
			capacity = *room.Capacity
		}
		locationId := ""
		if room.LocationId != nil {
			locationId = *room.LocationId
		}

		fmt.Printf("%-12s %-30s %-20s %-10d\n",
			truncate(id, 12),
			truncate(name, 30),
			truncate(locationId, 20),
			capacity,
		)
	}

	fmt.Printf("\nTotal: %d rooms\n", len(rooms))
	return nil
}

func outputRoomsCSV(rooms []generated.Room) error {
	w := csv.NewWriter(os.Stdout)
	defer w.Flush()

	// Write header
	w.Write([]string{"ID", "Name", "LocationID", "Capacity"})

	// Write data
	for _, room := range rooms {
		id := ""
		if room.Id != nil {
			id = *room.Id
		}
		name := ""
		if room.Name != nil {
			name = *room.Name
		}
		locationId := ""
		if room.LocationId != nil {
			locationId = *room.LocationId
		}
		capacity := "0"
		if room.Capacity != nil {
			capacity = strconv.Itoa(*room.Capacity)
		}

		w.Write([]string{id, name, locationId, capacity})
	}

	return nil
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func outputJSON(data interface{}) error {
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}
