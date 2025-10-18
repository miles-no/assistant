package ui

import (
	"fmt"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/miles/booking-tui/internal/api"
	"github.com/miles/booking-tui/internal/models"
	"github.com/miles/booking-tui/internal/styles"
	"github.com/miles/booking-tui/internal/utils"
)

// CalendarViewMode represents the current calendar view
type CalendarViewMode int

const (
	CalendarMonthMode CalendarViewMode = iota
	CalendarWeekMode
	CalendarDayMode
)

// CalendarModel represents the calendar view
type CalendarModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// View mode
	mode CalendarViewMode

	// Current date context
	selectedDate time.Time // The date we're viewing
	today        time.Time

	// Data
	bookings []models.Booking
	loading  bool
	error    string

	// Filters
	locationID *string
	roomID     *string

	// Cursor for day view
	cursor int
}

// CalendarDataMsg contains loaded calendar data
type CalendarDataMsg struct {
	Bookings []models.Booking
}

// CalendarErrorMsg contains error information
type CalendarErrorMsg struct {
	Error string
}

// NewCalendarModel creates a new calendar view
func NewCalendarModel(client *api.Client, styles *styles.Styles) *CalendarModel {
	now := time.Now()
	return &CalendarModel{
		styles:       styles,
		client:       client,
		mode:         CalendarMonthMode,
		selectedDate: now,
		today:        now,
		loading:      true,
	}
}

// Init initializes the calendar view
func (m *CalendarModel) Init() tea.Cmd {
	return m.loadData()
}

// Update handles messages for the calendar view
func (m *CalendarModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case CalendarDataMsg:
		m.bookings = msg.Bookings
		m.loading = false
		return m, nil

	case CalendarErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case tea.KeyMsg:
		if m.loading {
			return m, nil
		}

		// Global calendar keys
		switch msg.String() {
		case "r", "f5":
			m.loading = true
			m.error = ""
			return m, m.loadData()

		case "m":
			// Switch to month view
			m.mode = CalendarMonthMode
			return m, nil

		case "w":
			// Switch to week view
			m.mode = CalendarWeekMode
			return m, nil

		case "d":
			// Switch to day view
			m.mode = CalendarDayMode
			m.cursor = 0
			return m, nil

		case "t":
			// Jump to today
			m.selectedDate = m.today
			m.loading = true
			return m, m.loadData()

		case "left", "h":
			return m.navigatePrevious()

		case "right", "l":
			return m.navigateNext()
		}

		// Mode-specific keys
		switch m.mode {
		case CalendarMonthMode:
			return m.handleMonthKeys(msg)
		case CalendarWeekMode:
			return m.handleWeekKeys(msg)
		case CalendarDayMode:
			return m.handleDayKeys(msg)
		}
	}

	return m, nil
}

// handleMonthKeys handles keys in month mode
func (m *CalendarModel) handleMonthKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Navigation is handled by global keys
	return m, nil
}

// handleWeekKeys handles keys in week mode
func (m *CalendarModel) handleWeekKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Navigation is handled by global keys
	return m, nil
}

// handleDayKeys handles keys in day mode
func (m *CalendarModel) handleDayKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	dayBookings := m.getBookingsForDate(m.selectedDate)

	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
		return m, nil

	case "down", "j":
		if m.cursor < len(dayBookings)-1 {
			m.cursor++
		}
		return m, nil

	case "g":
		m.cursor = 0
		return m, nil

	case "G":
		m.cursor = len(dayBookings) - 1
		return m, nil
	}

	return m, nil
}

// navigatePrevious navigates to the previous time period
func (m *CalendarModel) navigatePrevious() (tea.Model, tea.Cmd) {
	switch m.mode {
	case CalendarMonthMode:
		m.selectedDate = m.selectedDate.AddDate(0, -1, 0)
	case CalendarWeekMode:
		m.selectedDate = m.selectedDate.AddDate(0, 0, -7)
	case CalendarDayMode:
		m.selectedDate = m.selectedDate.AddDate(0, 0, -1)
		m.cursor = 0
	}

	m.loading = true
	return m, m.loadData()
}

// navigateNext navigates to the next time period
func (m *CalendarModel) navigateNext() (tea.Model, tea.Cmd) {
	switch m.mode {
	case CalendarMonthMode:
		m.selectedDate = m.selectedDate.AddDate(0, 1, 0)
	case CalendarWeekMode:
		m.selectedDate = m.selectedDate.AddDate(0, 0, 7)
	case CalendarDayMode:
		m.selectedDate = m.selectedDate.AddDate(0, 0, 1)
		m.cursor = 0
	}

	m.loading = true
	return m, m.loadData()
}

// View renders the calendar view
func (m *CalendarModel) View() string {
	if m.loading {
		return m.renderLoading()
	}

	if m.error != "" {
		return m.renderError()
	}

	switch m.mode {
	case CalendarMonthMode:
		return m.renderMonthView()
	case CalendarWeekMode:
		return m.renderWeekView()
	case CalendarDayMode:
		return m.renderDayView()
	default:
		return "Unknown mode"
	}
}

// renderMonthView renders the month calendar view
func (m *CalendarModel) renderMonthView() string {
	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Month grid
	b.WriteString(m.renderMonthGrid())
	b.WriteString("\n\n")

	// Bookings summary
	monthBookings := m.getBookingsForMonth(m.selectedDate)
	b.WriteString(m.styles.Heading.Render(fmt.Sprintf("Bookings this month: %d", len(monthBookings))))
	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderWeekView renders the week calendar view
func (m *CalendarModel) renderWeekView() string {
	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Week grid
	b.WriteString(m.renderWeekGrid())
	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderDayView renders the day list view
func (m *CalendarModel) renderDayView() string {
	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Day's bookings
	dayBookings := m.getBookingsForDate(m.selectedDate)

	if len(dayBookings) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No bookings for this day."))
	} else {
		b.WriteString(m.styles.Heading.Render(fmt.Sprintf("%d bookings:", len(dayBookings))))
		b.WriteString("\n\n")

		for i, booking := range dayBookings {
			b.WriteString(m.renderDayBookingItem(booking, i == m.cursor))
			if i < len(dayBookings)-1 {
				b.WriteString("\n\n")
			}
		}
	}

	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderHeader renders the calendar header
func (m *CalendarModel) renderHeader() string {
	var title string

	switch m.mode {
	case CalendarMonthMode:
		title = m.selectedDate.Format("January 2006")
	case CalendarWeekMode:
		weekStart := m.getWeekStart(m.selectedDate)
		weekEnd := weekStart.AddDate(0, 0, 6)
		title = fmt.Sprintf("Week of %s - %s", weekStart.Format("Jan 2"), weekEnd.Format("Jan 2, 2006"))
	case CalendarDayMode:
		title = m.selectedDate.Format("Monday, January 2, 2006")
	}

	viewMode := ""
	switch m.mode {
	case CalendarMonthMode:
		viewMode = "[Month]"
	case CalendarWeekMode:
		viewMode = "[Week]"
	case CalendarDayMode:
		viewMode = "[Day]"
	}

	return m.styles.Title.Render("Calendar") + " " + m.styles.Badge.Render(viewMode) + "\n" +
		m.styles.Subtitle.Render(title)
}

// renderMonthGrid renders an ASCII calendar grid for the month
func (m *CalendarModel) renderMonthGrid() string {
	// Get first day of month
	firstDay := time.Date(m.selectedDate.Year(), m.selectedDate.Month(), 1, 0, 0, 0, 0, m.selectedDate.Location())

	// Get last day of month
	lastDay := firstDay.AddDate(0, 1, -1)

	// Build calendar grid
	var b strings.Builder

	// Day headers
	dayHeaders := []string{"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"}
	for i, day := range dayHeaders {
		if i > 0 {
			b.WriteString(" ")
		}
		b.WriteString(m.styles.TextBold.Width(4).Align(lipgloss.Center).Render(day))
	}
	b.WriteString("\n")

	// Separator
	b.WriteString(strings.Repeat("─", 35))
	b.WriteString("\n")

	// Calculate starting position (0 = Sunday, 6 = Saturday)
	startWeekday := int(firstDay.Weekday())

	// Render empty cells for days before the month starts
	currentDay := 1 - startWeekday

	for week := 0; week < 6; week++ {
		for day := 0; day < 7; day++ {
			if day > 0 {
				b.WriteString(" ")
			}

			date := firstDay.AddDate(0, 0, currentDay-1)

			// Check if this date is in the current month
			if date.Month() == m.selectedDate.Month() {
				dayNum := date.Day()
				dayStr := fmt.Sprintf("%2d", dayNum)

				// Check if this day has bookings
				hasBookings := m.hasBookingsOnDate(date)
				isToday := m.isSameDay(date, m.today)
				isSelected := m.isSameDay(date, m.selectedDate)

				// Style the day
				style := m.styles.Text
				if isToday {
					style = m.styles.TextSuccess.Bold(true)
				}
				if isSelected {
					style = style.Background(m.styles.Colors.Primary).Foreground(lipgloss.Color("#000000"))
				}
				if hasBookings {
					dayStr = dayStr + "•"
				} else {
					dayStr = dayStr + " "
				}

				b.WriteString(style.Width(4).Align(lipgloss.Center).Render(dayStr))
			} else {
				// Empty cell for days outside current month
				b.WriteString(m.styles.TextMuted.Width(4).Align(lipgloss.Center).Render("  "))
			}

			currentDay++
		}
		b.WriteString("\n")

		// Stop if we've passed the end of the month
		if currentDay > lastDay.Day() {
			break
		}
	}

	return m.styles.Panel.Render(b.String())
}

// renderWeekGrid renders an ASCII calendar grid for the week
func (m *CalendarModel) renderWeekGrid() string {
	weekStart := m.getWeekStart(m.selectedDate)

	var b strings.Builder

	// Time slots (from 8 AM to 6 PM)
	startHour := 8
	endHour := 18

	// Day headers
	b.WriteString(m.styles.Text.Width(6).Render("Time"))
	for i := 0; i < 7; i++ {
		date := weekStart.AddDate(0, 0, i)
		dayStr := date.Format("Mon 2")

		isToday := m.isSameDay(date, m.today)
		style := m.styles.TextBold
		if isToday {
			style = style.Foreground(m.styles.Colors.Success)
		}

		b.WriteString(" ")
		b.WriteString(style.Width(10).Align(lipgloss.Center).Render(dayStr))
	}
	b.WriteString("\n")

	// Separator
	b.WriteString(strings.Repeat("─", 83))
	b.WriteString("\n")

	// Time slots
	for hour := startHour; hour <= endHour; hour++ {
		timeStr := fmt.Sprintf("%2d:00", hour)
		b.WriteString(m.styles.Text.Width(6).Render(timeStr))

		for i := 0; i < 7; i++ {
			date := weekStart.AddDate(0, 0, i)
			slotStart := time.Date(date.Year(), date.Month(), date.Day(), hour, 0, 0, 0, date.Location())
			slotEnd := slotStart.Add(time.Hour)

			// Check if there's a booking in this slot
			booking := m.getBookingInSlot(slotStart, slotEnd)

			b.WriteString(" ")
			if booking != nil {
				// Show booking indicator
				b.WriteString(m.styles.TextSuccess.Width(10).Align(lipgloss.Center).Render("●"))
			} else {
				b.WriteString(m.styles.TextMuted.Width(10).Align(lipgloss.Center).Render("·"))
			}
		}
		b.WriteString("\n")
	}

	// Bookings legend
	b.WriteString("\n")
	weekBookings := m.getBookingsForWeek(weekStart)
	b.WriteString(m.styles.Heading.Render(fmt.Sprintf("Bookings this week: %d", len(weekBookings))))

	return m.styles.Panel.Render(b.String())
}

// renderDayBookingItem renders a single booking item for day view
func (m *CalendarModel) renderDayBookingItem(booking models.Booking, isSelected bool) string {
	cursor := "  "
	titleStyle := m.styles.TextBold
	textStyle := m.styles.Text
	mutedStyle := m.styles.TextMuted

	if isSelected {
		cursor = m.styles.Text.Foreground(m.styles.Colors.Primary).Render("> ")
		titleStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		textStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
		mutedStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
	}

	// Status badge
	var statusBadge string
	switch booking.Status {
	case models.BookingStatusConfirmed:
		statusBadge = m.styles.BadgeSuccess.Render("CONFIRMED")
	case models.BookingStatusPending:
		statusBadge = m.styles.BadgeWarning.Render("PENDING")
	case models.BookingStatusCancelled:
		statusBadge = m.styles.BadgeError.Render("CANCELLED")
	}

	// Time range
	timeStr := utils.FormatTime(booking.StartTime) + " - " + utils.FormatTime(booking.EndTime)

	line1 := lipgloss.JoinHorizontal(lipgloss.Left,
		cursor,
		titleStyle.Render(booking.Title),
		"  ",
		statusBadge,
	)

	line2 := lipgloss.JoinHorizontal(lipgloss.Left,
		"  ",
		textStyle.Render(timeStr),
		" • ",
		mutedStyle.Render(booking.Room.Name),
	)

	return line1 + "\n" + line2
}

// renderHelp renders help text
func (m *CalendarModel) renderHelp() string {
	help := []string{
		"h/l or ←→: Prev/Next",
		"m/w/d: Month/Week/Day view",
		"t: Today",
		"r: Refresh",
	}

	if m.mode == CalendarDayMode {
		help = append([]string{"j/k or ↑↓: Navigate bookings"}, help...)
	}

	return m.styles.Help.Render(strings.Join(help, " • "))
}

// renderLoading renders the loading state
func (m *CalendarModel) renderLoading() string {
	return m.styles.Title.Render("Calendar") + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *CalendarModel) renderError() string {
	return m.styles.Title.Render("Calendar") + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("Press r to retry")
}

// loadData loads calendar data for the current view
func (m *CalendarModel) loadData() tea.Cmd {
	return func() tea.Msg {
		var startDate, endDate time.Time

		switch m.mode {
		case CalendarMonthMode:
			// Get first and last day of month
			firstDay := time.Date(m.selectedDate.Year(), m.selectedDate.Month(), 1, 0, 0, 0, 0, m.selectedDate.Location())
			lastDay := firstDay.AddDate(0, 1, -1)
			startDate = firstDay
			endDate = lastDay
		case CalendarWeekMode:
			// Get week boundaries
			weekStart := m.getWeekStart(m.selectedDate)
			weekEnd := weekStart.AddDate(0, 0, 6)
			startDate = weekStart
			endDate = weekEnd
		case CalendarDayMode:
			// Get day boundaries
			startDate = time.Date(m.selectedDate.Year(), m.selectedDate.Month(), m.selectedDate.Day(), 0, 0, 0, 0, m.selectedDate.Location())
			endDate = startDate.AddDate(0, 0, 1)
		}

		bookings, err := m.client.GetBookings(m.roomID, m.locationID, &startDate, &endDate)
		if err != nil {
			return CalendarErrorMsg{Error: err.Error()}
		}

		return CalendarDataMsg{Bookings: bookings}
	}
}

// Helper functions

// getWeekStart returns the start of the week (Sunday) for the given date
func (m *CalendarModel) getWeekStart(date time.Time) time.Time {
	weekday := int(date.Weekday())
	return date.AddDate(0, 0, -weekday)
}

// isSameDay checks if two dates are the same day
func (m *CalendarModel) isSameDay(date1, date2 time.Time) bool {
	return date1.Year() == date2.Year() &&
		date1.Month() == date2.Month() &&
		date1.Day() == date2.Day()
}

// hasBookingsOnDate checks if there are any bookings on the given date
func (m *CalendarModel) hasBookingsOnDate(date time.Time) bool {
	for _, booking := range m.bookings {
		if m.isSameDay(booking.StartTime, date) {
			return true
		}
	}
	return false
}

// getBookingsForDate returns all bookings for the given date
func (m *CalendarModel) getBookingsForDate(date time.Time) []models.Booking {
	var result []models.Booking
	for _, booking := range m.bookings {
		if m.isSameDay(booking.StartTime, date) {
			result = append(result, booking)
		}
	}
	return result
}

// getBookingsForMonth returns all bookings for the month
func (m *CalendarModel) getBookingsForMonth(date time.Time) []models.Booking {
	var result []models.Booking
	for _, booking := range m.bookings {
		if booking.StartTime.Year() == date.Year() &&
			booking.StartTime.Month() == date.Month() {
			result = append(result, booking)
		}
	}
	return result
}

// getBookingsForWeek returns all bookings for the week
func (m *CalendarModel) getBookingsForWeek(weekStart time.Time) []models.Booking {
	weekEnd := weekStart.AddDate(0, 0, 7)
	var result []models.Booking
	for _, booking := range m.bookings {
		if booking.StartTime.After(weekStart) && booking.StartTime.Before(weekEnd) {
			result = append(result, booking)
		}
	}
	return result
}

// getBookingInSlot returns a booking that overlaps with the given time slot
func (m *CalendarModel) getBookingInSlot(slotStart, slotEnd time.Time) *models.Booking {
	for _, booking := range m.bookings {
		// Check if booking overlaps with slot
		if booking.StartTime.Before(slotEnd) && booking.EndTime.After(slotStart) {
			return &booking
		}
	}
	return nil
}
