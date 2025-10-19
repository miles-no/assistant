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

Examples:
  miles book --room ROOM123 --start "2025-10-19 14:00" --end "2025-10-19 15:00" --title "Team Meeting"
  miles book -r ROOM123 -s "2025-10-19T14:00:00Z" -e "2025-10-19T15:00:00Z" -t "1:1 with Manager"`,
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
	bookCmd.Flags().StringVarP(&bookStartTime, "start", "s", "", "start time (RFC3339 format, required)")
	bookCmd.Flags().StringVarP(&bookEndTime, "end", "e", "", "end time (RFC3339 format, required)")
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
	fmt.Printf("ID:          %s\n", *booking.Id)
	fmt.Printf("Room:        %s\n", *booking.RoomId)
	fmt.Printf("Title:       %s\n", *booking.Title)
	fmt.Printf("Start:       %s\n", booking.StartTime.Format(time.RFC3339))
	fmt.Printf("End:         %s\n", booking.EndTime.Format(time.RFC3339))
	fmt.Printf("Status:      %s\n", *booking.Status)

	return nil
}

func parseTime(timeStr string) (time.Time, error) {
	// Try RFC3339 format first (2025-10-19T14:00:00Z)
	t, err := time.Parse(time.RFC3339, timeStr)
	if err == nil {
		return t, nil
	}

	// Try simple format (2025-10-19 14:00)
	t, err = time.Parse("2006-01-02 15:04", timeStr)
	if err == nil {
		return t, nil
	}

	// Try date only (2025-10-19), default to 9 AM
	t, err = time.Parse("2006-01-02", timeStr)
	if err == nil {
		// Set to 9 AM
		return time.Date(t.Year(), t.Month(), t.Day(), 9, 0, 0, 0, time.Local), nil
	}

	return time.Time{}, fmt.Errorf("unable to parse time: %s (expected RFC3339 or '2006-01-02 15:04')", timeStr)
}
