package commands

import (
	"context"
	"time"

	"github.com/miles/booking-cli/internal/config"
	"github.com/spf13/cobra"
)

// completeRoomIDs provides room ID completions for the -r flag
func completeRoomIDs(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	// Get auth token
	token := getAuthToken()
	if token == "" {
		// Not authenticated, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}

	// Create client with timeout
	client := config.NewClient(getAPIURL(), token)

	// Use context with timeout to prevent hanging
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Fetch rooms in a goroutine
	type result struct {
		ids []string
		err error
	}
	resultCh := make(chan result, 1)

	go func() {
		rooms, err := client.GetRooms("")
		if err != nil {
			resultCh <- result{nil, err}
			return
		}

		ids := make([]string, 0, len(rooms))
		for _, room := range rooms {
			if room.Id != nil {
				// Format: room-id:Room Name
				id := *room.Id
				if room.Name != nil {
					id = id + "\t" + *room.Name
				}
				ids = append(ids, id)
			}
		}
		resultCh <- result{ids, nil}
	}()

	// Wait for result or timeout
	select {
	case res := <-resultCh:
		if res.err != nil {
			return nil, cobra.ShellCompDirectiveNoFileComp
		}
		return res.ids, cobra.ShellCompDirectiveNoFileComp
	case <-ctx.Done():
		// Timeout, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}
}

// completeLocationIDs provides location ID completions for the -l flag
func completeLocationIDs(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	// Get auth token
	token := getAuthToken()
	if token == "" {
		// Not authenticated, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}

	// Create client with timeout
	client := config.NewClient(getAPIURL(), token)

	// Use context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Fetch locations in a goroutine
	type result struct {
		ids []string
		err error
	}
	resultCh := make(chan result, 1)

	go func() {
		locations, err := client.GetLocations()
		if err != nil {
			resultCh <- result{nil, err}
			return
		}

		ids := make([]string, 0, len(locations))
		for _, location := range locations {
			if location.Id != nil {
				// Format: location-id:Location Name
				id := *location.Id
				if location.Name != nil {
					id = id + "\t" + *location.Name
				}
				ids = append(ids, id)
			}
		}
		resultCh <- result{ids, nil}
	}()

	// Wait for result or timeout
	select {
	case res := <-resultCh:
		if res.err != nil {
			return nil, cobra.ShellCompDirectiveNoFileComp
		}
		return res.ids, cobra.ShellCompDirectiveNoFileComp
	case <-ctx.Done():
		// Timeout, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}
}

// completeBookingIDs provides booking ID completions for the cancel command
func completeBookingIDs(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	// Get auth token
	token := getAuthToken()
	if token == "" {
		// Not authenticated, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}

	// Create client with timeout
	client := config.NewClient(getAPIURL(), token)

	// Use context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	// Fetch bookings in a goroutine
	type result struct {
		ids []string
		err error
	}
	resultCh := make(chan result, 1)

	go func() {
		bookings, err := client.GetBookings()
		if err != nil {
			resultCh <- result{nil, err}
			return
		}

		ids := make([]string, 0, len(bookings))
		for _, booking := range bookings {
			// Only suggest active (CONFIRMED) bookings
			if booking.Status != nil && *booking.Status == "CANCELLED" {
				continue
			}

			if booking.Id != nil {
				// Format: booking-id:Title (Start - End)
				id := *booking.Id
				if booking.Title != nil {
					desc := *booking.Title
					if booking.StartTime != nil {
						desc = desc + " (" + booking.StartTime.Format("Jan 02 15:04") + ")"
					}
					id = id + "\t" + desc
				}
				ids = append(ids, id)
			}
		}
		resultCh <- result{ids, nil}
	}()

	// Wait for result or timeout
	select {
	case res := <-resultCh:
		if res.err != nil {
			return nil, cobra.ShellCompDirectiveNoFileComp
		}
		return res.ids, cobra.ShellCompDirectiveNoFileComp
	case <-ctx.Done():
		// Timeout, return empty
		return nil, cobra.ShellCompDirectiveNoFileComp
	}
}
