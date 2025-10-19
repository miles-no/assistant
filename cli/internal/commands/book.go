package commands

import (
	"fmt"
	"time"

	"github.com/miles/booking-cli/internal/config"
	"github.com/miles/booking-cli/internal/generated"
	"github.com/spf13/cobra"
)

var bookCmd = &cobra.Command{
	Use:   "book",
	Short: "Create a new booking",
	Long: `Create a new meeting room booking.

Time formats supported (most human-friendly first):
  "2025-10-19 14:00"           Simple format (recommended)
  "2025-10-19T14:00:00Z"       RFC3339 / ISO 8601
  "2025-10-19"                 Date only (defaults to 9 AM)

Examples:
  # Human-friendly format
  miles book -r ROOM123 -s "2025-10-19 14:00" -e "2025-10-19 15:00" -t "Team Meeting"

  # With description
  miles book -r ROOM123 -s "2025-10-19 14:00" -e "15:00" -t "1:1" -d "Performance review"

  # RFC3339 format also works
  miles book -r ROOM123 -s "2025-10-19T14:00:00Z" -e "2025-10-19T15:00:00Z" -t "Meeting"`,
	RunE: runBook,
}

var (
	bookRoomID      string
	bookStartTime   string
	bookEndTime     string
	bookTitle       string
	bookDescription string
)

func init() {
	bookCmd.Flags().StringVarP(&bookRoomID, "room", "r", "", "room ID (required)")
	bookCmd.Flags().StringVarP(&bookStartTime, "start", "s", "", `start time (e.g. "2025-10-19 14:00", required)`)
	bookCmd.Flags().StringVarP(&bookEndTime, "end", "e", "", `end time (e.g. "2025-10-19 15:00" or "15:00", required)`)
	bookCmd.Flags().StringVarP(&bookTitle, "title", "t", "", "meeting title (required)")
	bookCmd.Flags().StringVarP(&bookDescription, "description", "d", "", "meeting description")

	bookCmd.MarkFlagRequired("room")
	bookCmd.MarkFlagRequired("start")
	bookCmd.MarkFlagRequired("end")
	bookCmd.MarkFlagRequired("title")
}

func runBook(cmd *cobra.Command, args []string) error {
	// Check authentication
	token := getAuthToken()
	if token == "" {
		return fmt.Errorf("not authenticated. Run 'miles login' first")
	}

	// Parse times
	startTime, err := parseTime(bookStartTime)
	if err != nil {
		return fmt.Errorf("invalid start time: %w", err)
	}

	endTime, err := parseTime(bookEndTime)
	if err != nil {
		return fmt.Errorf("invalid end time: %w", err)
	}

	// Validate times
	if endTime.Before(startTime) {
		return fmt.Errorf("end time must be after start time")
	}

	// Create API client
	client := config.NewClient(getAPIURL(), token)

	// Create booking request
	req := generated.BookingInput{
		RoomId:      bookRoomID,
		StartTime:   startTime,
		EndTime:     endTime,
		Title:       bookTitle,
		Description: &bookDescription,
	}

	// Create booking
	booking, err := client.CreateBooking(req)
	if err != nil {
		return err
	}

	// Output result
	fmt.Printf("✓ Booking created successfully!\n\n")
	fmt.Printf("Room:        %s\n", bookRoomID)
	fmt.Printf("Title:       %s\n", bookTitle)
	fmt.Printf("Start:       %s\n", startTime.Format("2006-01-02 15:04"))
	fmt.Printf("End:         %s\n", endTime.Format("2006-01-02 15:04"))

	// Show optional details if returned by API
	if booking.Id != nil {
		fmt.Printf("ID:          %s\n", *booking.Id)
	}
	if booking.Status != nil {
		fmt.Printf("Status:      %s\n", *booking.Status)
	}

	fmt.Printf("\nView all bookings: miles bookings\n")

	return nil
}

func parseTime(timeStr string) (time.Time, error) {
	// Try simple format first - most human-friendly (2025-10-19 14:00)
	t, err := time.Parse("2006-01-02 15:04", timeStr)
	if err == nil {
		return t, nil
	}

	// Try time only (15:00) - use today's date
	t, err = time.Parse("15:04", timeStr)
	if err == nil {
		now := time.Now()
		return time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, time.Local), nil
	}

	// Try RFC3339 format (2025-10-19T14:00:00Z)
	t, err = time.Parse(time.RFC3339, timeStr)
	if err == nil {
		return t, nil
	}

	// Try date only (2025-10-19), default to 9 AM
	t, err = time.Parse("2006-01-02", timeStr)
	if err == nil {
		return time.Date(t.Year(), t.Month(), t.Day(), 9, 0, 0, 0, time.Local), nil
	}

	// Provide helpful error message
	return time.Time{}, fmt.Errorf(`unable to parse time: "%s"

Supported formats:
  "2025-10-19 14:00"    (recommended)
  "15:00"               (time only, uses today)
  "2025-10-19T14:00:00Z" (RFC3339)
  "2025-10-19"          (date only, defaults to 9 AM)

Example: miles book -r ROOM123 -s "2025-10-19 14:00" -e "15:00" -t "Meeting"`, timeStr)
}
