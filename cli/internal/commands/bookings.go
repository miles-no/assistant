package commands

import (
	"encoding/csv"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/miles/booking-cli/internal/config"
	"github.com/miles/booking-cli/internal/generated"
	"github.com/spf13/cobra"
)

var bookingsCmd = &cobra.Command{
	Use:   "bookings",
	Short: "List your bookings",
	Long: `List all your current and upcoming bookings.

Examples:
  miles bookings                  # List all bookings
  miles bookings -o json          # Output as JSON
  miles bookings -o csv > my.csv  # Export to CSV`,
	Aliases: []string{"list"},
	RunE:    runBookings,
}

func runBookings(cmd *cobra.Command, args []string) error {
	// Check authentication
	token := getAuthToken()
	if token == "" {
		return fmt.Errorf("not authenticated. Run 'miles login' first")
	}

	// Create API client
	client := config.NewClient(getAPIURL(), token)

	// Fetch bookings
	bookings, err := client.GetBookings()
	if err != nil {
		return err
	}

	if len(bookings) == 0 {
		fmt.Println("No bookings found")
		return nil
	}

	// Output based on format
	switch output {
	case "json":
		return outputJSON(bookings)
	case "csv":
		return outputBookingsCSV(bookings)
	default:
		return outputBookingsTable(bookings)
	}
}

func outputBookingsTable(bookings []generated.Booking) error {
	// Print header
	fmt.Printf("%-12s %-30s %-12s %-20s %-20s %-10s\n",
		"ID", "Title", "Room", "Start", "End", "Status")
	fmt.Println(strings.Repeat("-", 120))

	// Print bookings
	for _, booking := range bookings {
		id := ""
		if booking.Id != nil {
			id = *booking.Id
		}
		title := ""
		if booking.Title != nil {
			title = *booking.Title
		}
		roomId := ""
		if booking.RoomId != nil {
			roomId = *booking.RoomId
		}
		status := ""
		if booking.Status != nil {
			status = string(*booking.Status)
		}

		startStr := ""
		if booking.StartTime != nil {
			startStr = booking.StartTime.Format("2006-01-02 15:04")
		}
		endStr := ""
		if booking.EndTime != nil {
			endStr = booking.EndTime.Format("2006-01-02 15:04")
		}

		fmt.Printf("%-12s %-30s %-12s %-20s %-20s %-10s\n",
			truncate(id, 12),
			truncate(title, 30),
			truncate(roomId, 12),
			startStr,
			endStr,
			status,
		)
	}

	fmt.Printf("\nTotal: %d bookings\n", len(bookings))
	return nil
}

func outputBookingsCSV(bookings []generated.Booking) error {
	w := csv.NewWriter(os.Stdout)
	defer w.Flush()

	// Write header
	w.Write([]string{"ID", "Title", "Description", "Room ID", "Start Time", "End Time", "Status"})

	// Write data
	for _, booking := range bookings {
		id := ""
		if booking.Id != nil {
			id = *booking.Id
		}
		title := ""
		if booking.Title != nil {
			title = *booking.Title
		}
		description := ""
		if booking.Description != nil {
			description = *booking.Description
		}
		roomId := ""
		if booking.RoomId != nil {
			roomId = *booking.RoomId
		}
		status := ""
		if booking.Status != nil {
			status = string(*booking.Status)
		}
		startTime := ""
		if booking.StartTime != nil {
			startTime = booking.StartTime.Format(time.RFC3339)
		}
		endTime := ""
		if booking.EndTime != nil {
			endTime = booking.EndTime.Format(time.RFC3339)
		}

		w.Write([]string{id, title, description, roomId, startTime, endTime, status})
	}

	return nil
}
