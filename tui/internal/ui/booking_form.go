package ui

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/miles/booking-tui/internal/api"
	"github.com/miles/booking-tui/internal/models"
	"github.com/miles/booking-tui/internal/styles"
)

// BookingFormModel represents the booking creation form
type BookingFormModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// Pre-selected room (optional)
	selectedRoom *models.Room

	// Form state
	step int // 0=room, 1=date, 2=time, 3=details

	// Room selection
	rooms        []models.Room
	roomCursor   int
	loadingRooms bool

	// Date selection
	selectedDate time.Time
	dateInput    textinput.Model

	// Time selection
	startHour   int
	startMinute int
	endHour     int
	endMinute   int
	timeFocus   int // 0=start hour, 1=start min, 2=end hour, 3=end min

	// Details
	titleInput       textinput.Model
	descriptionInput textinput.Model
	detailsFocus     int

	// Availability check
	checkingAvailability bool
	isAvailable          bool
	availabilityError    string

	// Submission
	submitting bool
	error      string
	success    bool
}

// BookingFormCompleteMsg is sent when booking is successfully created
type BookingFormCompleteMsg struct {
	Booking *models.Booking
}

// BookingFormCancelMsg is sent when form is cancelled
type BookingFormCancelMsg struct{}

// RoomsLoadedMsg contains loaded rooms
type RoomsLoadedMsg struct {
	Rooms []models.Room
}

// AvailabilityCheckedMsg contains availability check result
type AvailabilityCheckedMsg struct {
	Available bool
	Error     string
}

// NewBookingFormModel creates a new booking form
func NewBookingFormModel(client *api.Client, styles *styles.Styles, room *models.Room) *BookingFormModel {
	// Initialize inputs
	dateInput := textinput.New()
	dateInput.Placeholder = "YYYY-MM-DD"
	dateInput.CharLimit = 10
	dateInput.Width = 20

	titleInput := textinput.New()
	titleInput.Placeholder = "Meeting title"
	titleInput.CharLimit = 100
	titleInput.Width = 40

	descriptionInput := textinput.New()
	descriptionInput.Placeholder = "Optional description"
	descriptionInput.CharLimit = 200
	descriptionInput.Width = 40

	// Set default date to today
	today := time.Now()
	defaultDate := today.Format("2006-01-02")

	// Set default times (next hour, 1 hour duration)
	nextHour := (today.Hour() + 1) % 24
	startHour := nextHour
	endHour := (nextHour + 1) % 24

	model := &BookingFormModel{
		styles:       styles,
		client:       client,
		selectedRoom: room,
		selectedDate: today,
		dateInput:    dateInput,
		startHour:        startHour,
		startMinute:      0,
		endHour:          endHour,
		endMinute:        0,
		titleInput:       titleInput,
		descriptionInput: descriptionInput,
	}

	// Set initial value for date input
	model.dateInput.SetValue(defaultDate)

	// If room not provided, start at step 0 (room selection)
	// Otherwise start at step 1 (date selection)
	if room == nil {
		model.step = 0
		model.loadingRooms = true
	} else {
		model.step = 1
		model.dateInput.Focus()
	}

	return model
}

// Init initializes the form
func (m *BookingFormModel) Init() tea.Cmd {
	if m.selectedRoom == nil {
		return m.loadRooms()
	}
	return textinput.Blink
}

// Update handles messages
func (m *BookingFormModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case RoomsLoadedMsg:
		m.rooms = msg.Rooms
		m.loadingRooms = false
		return m, nil

	case AvailabilityCheckedMsg:
		m.checkingAvailability = false
		m.isAvailable = msg.Available
		m.availabilityError = msg.Error
		return m, nil

	case tea.KeyMsg:
		return m.handleKeyPress(msg)
	}

	// Update active input
	return m.updateActiveInput(msg)
}

// handleKeyPress handles keyboard input
func (m *BookingFormModel) handleKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		// Cancel form
		return m, func() tea.Msg {
			return BookingFormCancelMsg{}
		}

	case "tab", "shift+tab":
		// Navigate between fields
		return m.handleTabNavigation(msg.String() == "shift+tab")

	case "enter":
		// Progress to next step or submit
		return m.handleEnter()

	case "up", "k":
		if m.step == 0 {
			// Navigate rooms list
			if m.roomCursor > 0 {
				m.roomCursor--
			}
		} else if m.step == 2 {
			// Increment time values
			return m.incrementTime(), nil
		}
		return m, nil

	case "down", "j":
		if m.step == 0 {
			// Navigate rooms list
			if m.roomCursor < len(m.rooms)-1 {
				m.roomCursor++
			}
		} else if m.step == 2 {
			// Decrement time values
			return m.decrementTime(), nil
		}
		return m, nil

	case "left", "h":
		if m.step == 2 {
			// Move time focus left
			if m.timeFocus > 0 {
				m.timeFocus--
			}
		}
		return m, nil

	case "right", "l":
		if m.step == 2 {
			// Move time focus right
			if m.timeFocus < 3 {
				m.timeFocus++
			}
		}
		return m, nil
	}

	return m, nil
}

// handleTabNavigation handles tab/shift+tab navigation
func (m *BookingFormModel) handleTabNavigation(reverse bool) (tea.Model, tea.Cmd) {
	if m.step == 3 {
		// Navigate between detail fields
		if reverse {
			m.detailsFocus--
			if m.detailsFocus < 0 {
				m.detailsFocus = 2
			}
		} else {
			m.detailsFocus++
			if m.detailsFocus > 2 {
				m.detailsFocus = 0
			}
		}
		m.updateDetailsFocus()
	}
	return m, nil
}

// handleEnter progresses to next step or submits
func (m *BookingFormModel) handleEnter() (tea.Model, tea.Cmd) {
	switch m.step {
	case 0:
		// Room selected
		if m.roomCursor < len(m.rooms) {
			m.selectedRoom = &m.rooms[m.roomCursor]
			m.step = 1
			m.dateInput.Focus()
			return m, textinput.Blink
		}

	case 1:
		// Date entered, parse and validate
		dateStr := strings.TrimSpace(m.dateInput.Value())
		parsedDate, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			m.error = "Invalid date format (use YYYY-MM-DD)"
			return m, nil
		}
		if parsedDate.Before(time.Now().Truncate(24 * time.Hour)) {
			m.error = "Cannot book in the past"
			return m, nil
		}
		m.selectedDate = parsedDate
		m.error = ""
		m.step = 2
		return m, nil

	case 2:
		// Time selected, check availability
		m.step = 3
		m.titleInput.Focus()
		m.detailsFocus = 0
		return m, tea.Batch(textinput.Blink, m.checkAvailability())

	case 3:
		// Submit form
		return m, m.submitBooking()
	}

	return m, nil
}

// updateActiveInput updates the currently active text input
func (m *BookingFormModel) updateActiveInput(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch m.step {
	case 1:
		m.dateInput, cmd = m.dateInput.Update(msg)
	case 3:
		switch m.detailsFocus {
		case 0:
			m.titleInput, cmd = m.titleInput.Update(msg)
		case 1:
			m.descriptionInput, cmd = m.descriptionInput.Update(msg)
		}
	}

	return m, cmd
}

// updateDetailsFocus updates which details field has focus
func (m *BookingFormModel) updateDetailsFocus() {
	m.titleInput.Blur()
	m.descriptionInput.Blur()

	switch m.detailsFocus {
	case 0:
		m.titleInput.Focus()
	case 1:
		m.descriptionInput.Focus()
	}
}

// incrementTime increments the currently focused time value
func (m *BookingFormModel) incrementTime() tea.Model {
	switch m.timeFocus {
	case 0:
		m.startHour = (m.startHour + 1) % 24
	case 1:
		m.startMinute = (m.startMinute + 15) % 60
	case 2:
		m.endHour = (m.endHour + 1) % 24
	case 3:
		m.endMinute = (m.endMinute + 15) % 60
	}
	return m
}

// decrementTime decrements the currently focused time value
func (m *BookingFormModel) decrementTime() tea.Model {
	switch m.timeFocus {
	case 0:
		m.startHour = (m.startHour - 1 + 24) % 24
	case 1:
		m.startMinute = (m.startMinute - 15 + 60) % 60
	case 2:
		m.endHour = (m.endHour - 1 + 24) % 24
	case 3:
		m.endMinute = (m.endMinute - 15 + 60) % 60
	}
	return m
}

// View renders the form
func (m *BookingFormModel) View() string {
	if m.loadingRooms {
		return m.styles.Title.Render("Create Booking") + "\n\n" +
			m.styles.TextMuted.Render("Loading rooms...")
	}

	if m.success {
		return m.renderSuccess()
	}

	var b strings.Builder

	// Title and progress
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Current step
	switch m.step {
	case 0:
		b.WriteString(m.renderRoomSelection())
	case 1:
		b.WriteString(m.renderDateSelection())
	case 2:
		b.WriteString(m.renderTimeSelection())
	case 3:
		b.WriteString(m.renderDetailsForm())
	}

	// Error message
	if m.error != "" {
		b.WriteString("\n\n")
		b.WriteString(m.styles.TextError.Render("✗ " + m.error))
	}

	b.WriteString("\n\n")
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderHeader renders the form header with progress
func (m *BookingFormModel) renderHeader() string {
	title := m.styles.Title.Render("Create Booking")

	stepNames := []string{"Room", "Date", "Time", "Details"}
	var steps []string
	for i, name := range stepNames {
		if i < m.step {
			steps = append(steps, m.styles.TextSuccess.Render("✓ "+name))
		} else if i == m.step {
			steps = append(steps, m.styles.TextBold.Foreground(m.styles.Colors.Primary).Render("▶ "+name))
		} else {
			steps = append(steps, m.styles.TextMuted.Render("  "+name))
		}
	}

	progress := strings.Join(steps, " ")

	return title + "\n" + progress
}

// renderRoomSelection renders step 0
func (m *BookingFormModel) renderRoomSelection() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Select a Room"))
	b.WriteString("\n\n")

	if len(m.rooms) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No rooms available"))
		return b.String()
	}

	// Show rooms list
	for i, room := range m.rooms {
		cursor := "  "
		nameStyle := m.styles.Text
		if i == m.roomCursor {
			cursor = m.styles.Text.Foreground(m.styles.Colors.Primary).Render("> ")
			nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		}

		name := nameStyle.Render(room.Name)
		location := m.styles.TextMuted.Render(room.Location.Name)
		capacity := m.styles.TextMuted.Render(fmt.Sprintf("Capacity: %d", room.Capacity))

		b.WriteString(cursor + name + " • " + location + " • " + capacity)
		b.WriteString("\n")
	}

	return b.String()
}

// renderDateSelection renders step 1
func (m *BookingFormModel) renderDateSelection() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Select Date"))
	b.WriteString("\n\n")

	if m.selectedRoom != nil {
		b.WriteString(m.styles.Text.Render("Room: "))
		b.WriteString(m.styles.TextBold.Render(m.selectedRoom.Name))
		b.WriteString("\n\n")
	}

	b.WriteString(m.styles.Text.Render("Date (YYYY-MM-DD):"))
	b.WriteString("\n")
	b.WriteString(m.dateInput.View())

	return b.String()
}

// renderTimeSelection renders step 2
func (m *BookingFormModel) renderTimeSelection() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Select Time"))
	b.WriteString("\n\n")

	dateStr := m.selectedDate.Format("Mon, Jan 2, 2006")
	b.WriteString(m.styles.Text.Render("Date: "))
	b.WriteString(m.styles.TextBold.Render(dateStr))
	b.WriteString("\n\n")

	// Start time
	b.WriteString(m.styles.Text.Render("Start Time:"))
	b.WriteString("\n")
	b.WriteString(m.renderTimePicker(0, 1))
	b.WriteString("\n\n")

	// End time
	b.WriteString(m.styles.Text.Render("End Time:"))
	b.WriteString("\n")
	b.WriteString(m.renderTimePicker(2, 3))

	return b.String()
}

// renderTimePicker renders a time picker (hour and minute)
func (m *BookingFormModel) renderTimePicker(hourFocus, minuteFocus int) string {
	var hour, minute int
	if hourFocus == 0 {
		hour = m.startHour
		minute = m.startMinute
	} else {
		hour = m.endHour
		minute = m.endMinute
	}

	hourStyle := m.styles.Box
	minuteStyle := m.styles.Box

	if m.timeFocus == hourFocus {
		hourStyle = m.styles.Box.BorderForeground(m.styles.Colors.Primary)
	}
	if m.timeFocus == minuteFocus {
		minuteStyle = m.styles.Box.BorderForeground(m.styles.Colors.Primary)
	}

	hourBox := hourStyle.Render(fmt.Sprintf(" %02d ", hour))
	minuteBox := minuteStyle.Render(fmt.Sprintf(" %02d ", minute))

	return lipgloss.JoinHorizontal(lipgloss.Left, hourBox, " : ", minuteBox)
}

// renderDetailsForm renders step 3
func (m *BookingFormModel) renderDetailsForm() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Booking Details"))
	b.WriteString("\n\n")

	// Show summary
	dateStr := m.selectedDate.Format("Mon, Jan 2, 2006")
	startTime := fmt.Sprintf("%02d:%02d", m.startHour, m.startMinute)
	endTime := fmt.Sprintf("%02d:%02d", m.endHour, m.endMinute)

	b.WriteString(m.styles.Text.Render("Room: "))
	b.WriteString(m.styles.TextBold.Render(m.selectedRoom.Name))
	b.WriteString("\n")
	b.WriteString(m.styles.Text.Render("When: "))
	b.WriteString(m.styles.TextBold.Render(fmt.Sprintf("%s from %s to %s", dateStr, startTime, endTime)))
	b.WriteString("\n\n")

	// Availability status
	if m.checkingAvailability {
		b.WriteString(m.styles.TextMuted.Render("Checking availability..."))
		b.WriteString("\n\n")
	} else if m.availabilityError != "" {
		b.WriteString(m.styles.TextError.Render("✗ " + m.availabilityError))
		b.WriteString("\n\n")
	} else if !m.isAvailable {
		b.WriteString(m.styles.TextError.Render("✗ Room not available for this time slot"))
		b.WriteString("\n\n")
	} else {
		b.WriteString(m.styles.TextSuccess.Render("✓ Room is available"))
		b.WriteString("\n\n")
	}

	// Title field
	titleLabel := "Title:"
	if m.detailsFocus == 0 {
		titleLabel = m.styles.TextBold.Foreground(m.styles.Colors.Primary).Render("Title:")
	}
	b.WriteString(titleLabel)
	b.WriteString("\n")
	b.WriteString(m.titleInput.View())
	b.WriteString("\n\n")

	// Description field
	descriptionLabel := "Description (optional):"
	if m.detailsFocus == 1 {
		descriptionLabel = m.styles.TextBold.Foreground(m.styles.Colors.Primary).Render("Description (optional):")
	}
	b.WriteString(descriptionLabel)
	b.WriteString("\n")
	b.WriteString(m.descriptionInput.View())

	return b.String()
}

// renderSuccess renders success message
func (m *BookingFormModel) renderSuccess() string {
	return m.styles.Title.Render("Booking Created!") + "\n\n" +
		m.styles.TextSuccess.Render("✓ Your booking has been created successfully") + "\n\n" +
		m.styles.Help.Render("Press any key to return to bookings...")
}

// renderHelp renders help text
func (m *BookingFormModel) renderHelp() string {
	var help []string

	switch m.step {
	case 0:
		help = []string{"j/k or ↑↓: Navigate", "Enter: Select", "Esc: Cancel"}
	case 1:
		help = []string{"Type date", "Enter: Continue", "Esc: Cancel"}
	case 2:
		help = []string{"h/l: Switch field", "j/k or ↑↓: Adjust time", "Enter: Continue", "Esc: Cancel"}
	case 3:
		help = []string{"Tab: Next field", "Enter: Create booking", "Esc: Cancel"}
	}

	return m.styles.Help.Render(strings.Join(help, " • "))
}

// loadRooms loads available rooms
func (m *BookingFormModel) loadRooms() tea.Cmd {
	return func() tea.Msg {
		rooms, err := m.client.GetRooms(nil, nil, nil)
		if err != nil {
			return RoomsLoadedMsg{Rooms: []models.Room{}}
		}
		return RoomsLoadedMsg{Rooms: rooms}
	}
}

// checkAvailability checks if selected time slot is available
func (m *BookingFormModel) checkAvailability() tea.Cmd {
	m.checkingAvailability = true

	return func() tea.Msg {
		// Build start and end times
		startTime := time.Date(
			m.selectedDate.Year(), m.selectedDate.Month(), m.selectedDate.Day(),
			m.startHour, m.startMinute, 0, 0, m.selectedDate.Location(),
		)
		endTime := time.Date(
			m.selectedDate.Year(), m.selectedDate.Month(), m.selectedDate.Day(),
			m.endHour, m.endMinute, 0, 0, m.selectedDate.Location(),
		)

		if startTime.After(endTime) || startTime.Equal(endTime) {
			return AvailabilityCheckedMsg{
				Available: false,
				Error:     "End time must be after start time",
			}
		}

		available, err := m.client.CheckRoomAvailability(m.selectedRoom.ID, startTime, endTime)
		if err != nil {
			return AvailabilityCheckedMsg{
				Available: false,
				Error:     err.Error(),
			}
		}

		return AvailabilityCheckedMsg{
			Available: available,
			Error:     "",
		}
	}
}

// submitBooking submits the booking to the API
func (m *BookingFormModel) submitBooking() tea.Cmd {
	m.submitting = true

	return func() tea.Msg {
		title := strings.TrimSpace(m.titleInput.Value())
		if title == "" {
			m.error = "Title is required"
			m.submitting = false
			return nil
		}

		// Build start and end times
		startTime := time.Date(
			m.selectedDate.Year(), m.selectedDate.Month(), m.selectedDate.Day(),
			m.startHour, m.startMinute, 0, 0, m.selectedDate.Location(),
		)
		endTime := time.Date(
			m.selectedDate.Year(), m.selectedDate.Month(), m.selectedDate.Day(),
			m.endHour, m.endMinute, 0, 0, m.selectedDate.Location(),
		)

		// Get description (optional)
		description := strings.TrimSpace(m.descriptionInput.Value())

		// Create booking request
		req := models.CreateBookingRequest{
			RoomID:      m.selectedRoom.ID,
			StartTime:   startTime,
			EndTime:     endTime,
			Title:       title,
			Description: description,
		}

		booking, err := m.client.CreateBooking(req)
		if err != nil {
			m.error = fmt.Sprintf("Failed to create booking: %v", err)
			m.submitting = false
			return nil
		}

		m.success = true
		m.submitting = false

		return BookingFormCompleteMsg{Booking: booking}
	}
}
