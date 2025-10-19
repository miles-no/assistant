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

By default, only active (CONFIRMED) bookings are shown.
Use --all to include cancelled bookings.

Examples:
  miles bookings                  # List active bookings only
  miles bookings --all            # List all bookings including cancelled
  miles bookings -o json          # Output as JSON
  miles bookings -o csv > my.csv  # Export to CSV`,
	Aliases: []string{"list"},
	RunE:    runBookings,
}

var showAllBookings bool

func init() {
	bookingsCmd.Flags().BoolVarP(&showAllBookings, "all", "a", false, "show all bookings including cancelled")
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
	allBookings, err := client.GetBookings()
	if err != nil {
		return err
	}

	// Separate active and cancelled bookings
	var activeBookings []generated.Booking
	var cancelledCount int

	for _, booking := range allBookings {
		if booking.Status != nil && *booking.Status == "CANCELLED" {
			cancelledCount++
			if showAllBookings {
				activeBookings = append(activeBookings, booking)
			}
		} else {
			activeBookings = append(activeBookings, booking)
		}
	}

	// Determine which bookings to show
	bookingsToShow := activeBookings

	if len(bookingsToShow) == 0 {
		if cancelledCount > 0 {
			fmt.Printf("No active bookings found (%d cancelled)\n", cancelledCount)
			fmt.Println("Use 'miles bookings --all' to see cancelled bookings")
		} else {
			fmt.Println("No bookings found")
		}
		return nil
	}

	// Output based on format
	switch output {
	case "json":
		return outputJSON(bookingsToShow)
	case "csv":
		return outputBookingsCSV(bookingsToShow)
	default:
		return outputBookingsTable(bookingsToShow, cancelledCount)
	}
}

func outputBookingsTable(bookings []generated.Booking, cancelledCount int) error {
	// Print header - show full IDs
	fmt.Printf("%-25s %-30s %-16s %-16s %-10s\n",
		"ID", "Title", "Start", "End", "Status")
	fmt.Println(strings.Repeat("-", 100))

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

		// Show full ID, truncate title if needed
		fmt.Printf("%-25s %-30s %-16s %-16s %-10s\n",
			id,
			truncate(title, 30),
			startStr,
			endStr,
			status,
		)
	}

	// Summary
	if showAllBookings {
		fmt.Printf("\nTotal: %d bookings\n", len(bookings))
	} else {
		if cancelledCount > 0 {
			fmt.Printf("\nShowing: %d active bookings (%d cancelled)\n", len(bookings), cancelledCount)
			fmt.Printf("Use 'miles bookings --all' to see all bookings\n")
		} else {
			fmt.Printf("\nTotal: %d bookings\n", len(bookings))
		}
	}

	if len(bookings) > 0 {
		fmt.Printf("\nTip: Cancel a booking with: miles cancel <booking-id>\n")
	}
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
