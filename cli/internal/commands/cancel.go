package commands

import (
	"fmt"

	"github.com/miles/booking-cli/internal/config"
	"github.com/spf13/cobra"
)

var cancelCmd = &cobra.Command{
	Use:               "cancel [booking-id]",
	Short:             "Cancel a booking",
	Long:              `Cancel an existing booking by its ID.

Examples:
  miles cancel BOOK123
  miles cancel --id BOOK123`,
	Args:              cobra.MaximumNArgs(1),
	RunE:              runCancel,
	ValidArgsFunction: completeBookingIDs,
}

var cancelID string

func init() {
	cancelCmd.Flags().StringVar(&cancelID, "id", "", "booking ID to cancel")
}

func runCancel(cmd *cobra.Command, args []string) error {
	// Check authentication
	token := getAuthToken()
	if token == "" {
		return fmt.Errorf("not authenticated. Run 'miles login' first")
	}

	// Get booking ID from args or flag
	bookingID := cancelID
	if len(args) > 0 {
		bookingID = args[0]
	}

	if bookingID == "" {
		return fmt.Errorf("booking ID is required")
	}

	// Create API client
	client := config.NewClient(getAPIURL(), token)

	// Cancel booking
	if err := client.CancelBooking(bookingID); err != nil {
		return err
	}

	fmt.Printf("✓ Booking %s has been cancelled\n\n", bookingID)
	fmt.Println("The booking no longer appears in your active bookings.")
	fmt.Println("Use 'miles bookings --all' to see all bookings including cancelled ones.")
	return nil
}
