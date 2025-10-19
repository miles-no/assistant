package commands

import (
	"fmt"
	"strings"
	"time"

	"github.com/manifoldco/promptui"
	"github.com/miles/booking-cli/internal/config"
	"github.com/miles/booking-cli/internal/generated"
	"github.com/spf13/cobra"
)

var bookCmd = &cobra.Command{
	Use:   "book",
	Short: "Create a new booking",
	Long: `Create a new meeting room booking.

Interactive mode (no flags):
  miles book                                    # Interactive prompts guide you

One-liner mode (all flags):
  miles book -r ROOM123 -s "2025-10-19 14:00" -e "2025-10-19 15:00" -t "Team Meeting"

Time formats supported:
  "2025-10-19 14:00"           Simple format (recommended)
  "2025-10-19T14:00:00Z"       RFC3339 / ISO 8601
  "2025-10-19"                 Date only (defaults to 9 AM)
  "15:00"                      Time only (uses today's date)

Examples:
  # Interactive mode - prompts for each field
  miles book

  # Quick booking with flags
  miles book -r ROOM123 -s "2025-10-19 14:00" -e "15:00" -t "1:1"

  # With description
  miles book -r ROOM123 -s "2025-10-19 14:00" -e "15:00" -t "1:1" -d "Performance review"`,
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
	bookCmd.Flags().StringVarP(&bookRoomID, "room", "r", "", "room ID (optional in interactive mode)")
	bookCmd.Flags().StringVarP(&bookStartTime, "start", "s", "", `start time (e.g. "2025-10-19 14:00", optional in interactive mode)`)
	bookCmd.Flags().StringVarP(&bookEndTime, "end", "e", "", `end time (e.g. "2025-10-19 15:00" or "15:00", optional in interactive mode)`)
	bookCmd.Flags().StringVarP(&bookTitle, "title", "t", "", "meeting title (optional in interactive mode)")
	bookCmd.Flags().StringVarP(&bookDescription, "description", "d", "", "meeting description (optional)")

	// Flags are optional - if missing, interactive mode is triggered
}

func runBook(cmd *cobra.Command, args []string) error {
	// Check authentication
	token := getAuthToken()
	if token == "" {
		return fmt.Errorf("not authenticated. Run 'miles login' first")
	}

	// Create API client
	client := config.NewClient(getAPIURL(), token)

	// Determine if any flags were provided
	anyFlagsProvided := bookRoomID != "" || bookStartTime != "" || bookEndTime != "" || bookTitle != ""

	// If no flags provided, enter interactive mode
	if !anyFlagsProvided {
		return runInteractiveBook(client)
	}

	// If any flags provided, require all required flags
	if bookRoomID == "" {
		return fmt.Errorf("room ID is required. Use -r flag or run 'miles book' without flags for interactive mode")
	}
	if bookStartTime == "" {
		return fmt.Errorf("start time is required. Use -s flag or run 'miles book' without flags for interactive mode")
	}
	if bookEndTime == "" {
		return fmt.Errorf("end time is required. Use -e flag or run 'miles book' without flags for interactive mode")
	}
	if bookTitle == "" {
		return fmt.Errorf("title is required. Use -t flag or run 'miles book' without flags for interactive mode")
	}

	// Flag-based mode - proceed with existing logic
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

	// Create booking
	return createBooking(client, bookRoomID, startTime, endTime, bookTitle, bookDescription)
}

func runInteractiveBook(client *config.Client) error {
	fmt.Println("📅 Interactive Booking\n")

	// Step 1: Select location
	location, err := selectLocation(client)
	if err != nil {
		return err
	}

	// Step 2: Select room
	room, err := selectRoom(client, location)
	if err != nil {
		return err
	}

	// Step 3: Select start time
	startTime, err := selectTime("start")
	if err != nil {
		return err
	}

	// Step 4: Select end time
	endTime, err := selectTime("end")
	if err != nil {
		return err
	}

	// Validate times
	if endTime.Before(startTime) {
		return fmt.Errorf("end time must be after start time")
	}

	// Step 5: Enter title
	title, err := promptString("Meeting title", "", true)
	if err != nil {
		return err
	}

	// Step 6: Enter description (optional)
	description, err := promptString("Description (optional)", "", false)
	if err != nil {
		return err
	}

	// Step 7: Confirm
	fmt.Printf("\n📋 Booking Summary:\n")
	fmt.Printf("  Location:    %s\n", location)
	fmt.Printf("  Room:        %s\n", room)
	fmt.Printf("  Title:       %s\n", title)
	fmt.Printf("  Start:       %s\n", startTime.Format("2006-01-02 15:04"))
	fmt.Printf("  End:         %s\n", endTime.Format("2006-01-02 15:04"))
	if description != "" {
		fmt.Printf("  Description: %s\n", description)
	}
	fmt.Println()

	prompt := promptui.Prompt{
		Label:     "Create this booking",
		IsConfirm: true,
	}
	_, err = prompt.Run()
	if err != nil {
		return fmt.Errorf("booking cancelled")
	}

	// Create booking
	return createBooking(client, room, startTime, endTime, title, description)
}

func createBooking(client *config.Client, roomID string, startTime, endTime time.Time, title, description string) error {
	req := generated.BookingInput{
		RoomId:      roomID,
		StartTime:   startTime,
		EndTime:     endTime,
		Title:       title,
		Description: &description,
	}

	booking, err := client.CreateBooking(req)
	if err != nil {
		return err
	}

	// Output result
	fmt.Printf("\n✓ Booking created successfully!\n\n")
	fmt.Printf("Room:        %s\n", roomID)
	fmt.Printf("Title:       %s\n", title)
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

// Interactive helper functions

func selectLocation(client *config.Client) (string, error) {
	locations, err := client.GetLocations()
	if err != nil {
		return "", fmt.Errorf("failed to fetch locations: %w", err)
	}

	if len(locations) == 0 {
		return "", fmt.Errorf("no locations available")
	}

	// Build list of location names
	items := make([]string, len(locations))
	locationMap := make(map[string]string) // name -> ID
	for i, loc := range locations {
		name := "Unknown"
		if loc.Name != nil {
			name = *loc.Name
		}
		id := ""
		if loc.Id != nil {
			id = *loc.Id
		}
		items[i] = name
		locationMap[name] = id
	}

	prompt := promptui.Select{
		Label: "Select location",
		Items: items,
		Size:  10,
	}

	_, result, err := prompt.Run()
	if err != nil {
		return "", fmt.Errorf("location selection cancelled")
	}

	return locationMap[result], nil
}

func selectRoom(client *config.Client, locationID string) (string, error) {
	rooms, err := client.GetRooms(locationID)
	if err != nil {
		return "", fmt.Errorf("failed to fetch rooms: %w", err)
	}

	if len(rooms) == 0 {
		return "", fmt.Errorf("no rooms available in this location")
	}

	// Build list of rooms with details
	type roomItem struct {
		Display string
		ID      string
	}
	items := make([]roomItem, len(rooms))
	for i, room := range rooms {
		name := "Unknown"
		if room.Name != nil {
			name = *room.Name
		}
		capacity := 0
		if room.Capacity != nil {
			capacity = *room.Capacity
		}
		id := ""
		if room.Id != nil {
			id = *room.Id
		}
		items[i] = roomItem{
			Display: fmt.Sprintf("%s (capacity: %d)", name, capacity),
			ID:      id,
		}
	}

	// Custom searcher for filtering
	searcher := func(input string, index int) bool {
		item := items[index]
		input = strings.ToLower(input)
		return strings.Contains(strings.ToLower(item.Display), input) ||
			strings.Contains(strings.ToLower(item.ID), input)
	}

	prompt := promptui.Select{
		Label: "Select room (type to search)",
		Items: items,
		Size:  10,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}",
			Active:   "▸ {{ .Display }}",
			Inactive: "  {{ .Display }}",
			Selected: "✓ {{ .Display }}",
		},
		Searcher: searcher,
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return "", fmt.Errorf("room selection cancelled")
	}

	return items[idx].ID, nil
}

func selectTime(label string) (time.Time, error) {
	now := time.Now()

	// Time suggestions
	suggestions := []struct {
		Label string
		Time  time.Time
	}{
		{
			Label: fmt.Sprintf("Next hour (%s)", now.Add(time.Hour).Truncate(time.Hour).Format("15:04")),
			Time:  now.Add(time.Hour).Truncate(time.Hour),
		},
		{
			Label: fmt.Sprintf("Tomorrow at 9 AM (%s)", now.AddDate(0, 0, 1).Format("2006-01-02")+" 09:00"),
			Time:  time.Date(now.Year(), now.Month(), now.Day()+1, 9, 0, 0, 0, time.Local),
		},
		{
			Label: fmt.Sprintf("Next Monday at 9 AM"),
			Time:  nextWeekday(now, time.Monday, 9, 0),
		},
		{
			Label: "Custom time (enter manually)",
			Time:  time.Time{}, // Zero value indicates custom
		},
	}

	// Build items
	items := make([]string, len(suggestions))
	for i, s := range suggestions {
		items[i] = s.Label
	}

	prompt := promptui.Select{
		Label: fmt.Sprintf("Select %s time", label),
		Items: items,
		Size:  len(items),
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return time.Time{}, fmt.Errorf("time selection cancelled")
	}

	// If custom time selected, prompt for input
	if suggestions[idx].Time.IsZero() {
		customTime, err := promptString(
			fmt.Sprintf("%s time", label),
			`Format: "2025-10-19 14:00" or "15:00"`,
			true,
		)
		if err != nil {
			return time.Time{}, err
		}
		return parseTime(customTime)
	}

	return suggestions[idx].Time, nil
}

func promptString(label, hint string, required bool) (string, error) {
	validate := func(input string) error {
		if required && strings.TrimSpace(input) == "" {
			return fmt.Errorf("this field is required")
		}
		return nil
	}

	templates := &promptui.PromptTemplates{
		Prompt:  "{{ . }} ",
		Valid:   "{{ . | green }} ",
		Invalid: "{{ . | red }} ",
		Success: "{{ . | bold }} ",
	}

	fullLabel := label
	if hint != "" {
		fullLabel = fmt.Sprintf("%s (%s)", label, hint)
	}

	prompt := promptui.Prompt{
		Label:     fullLabel,
		Validate:  validate,
		Templates: templates,
	}

	result, err := prompt.Run()
	if err != nil {
		return "", fmt.Errorf("input cancelled")
	}

	return strings.TrimSpace(result), nil
}

// nextWeekday returns the next occurrence of the specified weekday at the given time
func nextWeekday(from time.Time, weekday time.Weekday, hour, minute int) time.Time {
	daysUntil := int(weekday - from.Weekday())
	if daysUntil <= 0 {
		daysUntil += 7
	}
	next := from.AddDate(0, 0, daysUntil)
	return time.Date(next.Year(), next.Month(), next.Day(), hour, minute, 0, 0, time.Local)
}
