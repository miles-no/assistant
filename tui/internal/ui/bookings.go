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

// BookingsViewMode represents the current mode of the bookings view
type BookingsViewMode int

const (
	BookingsListMode BookingsViewMode = iota
	BookingDetailsMode
	BookingCreateMode
)

// BookingsModel represents the bookings management view
type BookingsModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// Data
	bookings []models.Booking
	cursor   int
	loading  bool
	error    string

	// View mode
	mode              BookingsViewMode
	selectedBooking   *models.Booking
	showUpcoming      bool
	showPast          bool
	showCancelled     bool
	confirmingCancel  bool
	cancelling        bool
}

// BookingsDataMsg contains loaded bookings data
type BookingsDataMsg struct {
	Bookings []models.Booking
}

// BookingsErrorMsg contains error information
type BookingsErrorMsg struct {
	Error string
}

// BookingCancelledMsg is sent when a booking is cancelled
type BookingCancelledMsg struct {
	BookingID string
}

// NewBookingsModel creates a new bookings view
func NewBookingsModel(client *api.Client, styles *styles.Styles) *BookingsModel {
	return &BookingsModel{
		styles:       styles,
		client:       client,
		loading:      true,
		mode:         BookingsListMode,
		showUpcoming: true,
		showPast:     false,
		showCancelled: false,
	}
}

// Init initializes the bookings view
func (m *BookingsModel) Init() tea.Cmd {
	return m.loadData()
}

// Update handles messages for the bookings view
func (m *BookingsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case BookingsDataMsg:
		m.bookings = msg.Bookings
		m.loading = false
		return m, nil

	case BookingsErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case BookingCancelledMsg:
		m.cancelling = false
		m.confirmingCancel = false
		m.mode = BookingsListMode
		m.loading = true
		return m, m.loadData()

	case tea.KeyMsg:
		if m.loading || m.cancelling {
			return m, nil
		}

		// Handle different modes
		switch m.mode {
		case BookingsListMode:
			return m.handleListKeys(msg)
		case BookingDetailsMode:
			return m.handleDetailsKeys(msg)
		case BookingCreateMode:
			return m.handleCreateKeys(msg)
		}
	}

	return m, nil
}

// handleListKeys handles keys in list mode
func (m *BookingsModel) handleListKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "r", "f5":
		m.loading = true
		m.error = ""
		return m, m.loadData()

	case "u":
		m.showUpcoming = !m.showUpcoming
		return m, nil

	case "p":
		m.showPast = !m.showPast
		return m, nil

	case "c":
		m.showCancelled = !m.showCancelled
		return m, nil

	case "n":
		// Create new booking - switch to create mode
		m.mode = BookingCreateMode
		return m, nil

	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
		return m, nil

	case "down", "j":
		visibleBookings := m.getVisibleBookings()
		if m.cursor < len(visibleBookings)-1 {
			m.cursor++
		}
		return m, nil

	case "g":
		m.cursor = 0
		return m, nil

	case "G":
		visibleBookings := m.getVisibleBookings()
		m.cursor = len(visibleBookings) - 1
		return m, nil

	case "enter":
		visibleBookings := m.getVisibleBookings()
		if m.cursor < len(visibleBookings) {
			m.selectedBooking = &visibleBookings[m.cursor]
			m.mode = BookingDetailsMode
		}
		return m, nil
	}

	return m, nil
}

// handleDetailsKeys handles keys in details mode
func (m *BookingsModel) handleDetailsKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	if m.confirmingCancel {
		switch msg.String() {
		case "y", "Y":
			m.cancelling = true
			return m, m.cancelBooking()
		case "n", "N", "esc":
			m.confirmingCancel = false
			return m, nil
		}
		return m, nil
	}

	switch msg.String() {
	case "esc", "q":
		m.mode = BookingsListMode
		m.selectedBooking = nil
		return m, nil

	case "d":
		// Cancel booking - show confirmation
		if m.selectedBooking != nil && m.selectedBooking.Status != models.BookingStatusCancelled {
			m.confirmingCancel = true
		}
		return m, nil
	}

	return m, nil
}

// handleCreateKeys handles keys in create mode
func (m *BookingsModel) handleCreateKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.mode = BookingsListMode
		return m, nil
	}

	return m, nil
}

// View renders the bookings view
func (m *BookingsModel) View() string {
	if m.loading {
		return m.renderLoading()
	}

	if m.error != "" {
		return m.renderError()
	}

	switch m.mode {
	case BookingsListMode:
		return m.renderList()
	case BookingDetailsMode:
		return m.renderDetails()
	case BookingCreateMode:
		return m.renderCreate()
	default:
		return "Unknown mode"
	}
}

// renderList renders the bookings list
func (m *BookingsModel) renderList() string {
	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Filters
	b.WriteString(m.renderFilterButtons())
	b.WriteString("\n\n")

	// Bookings list
	visibleBookings := m.getVisibleBookings()
	if len(visibleBookings) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No bookings found."))
		b.WriteString("\n\n")
		b.WriteString(m.styles.Text.Render("Press 'n' to create a new booking, or press '3' to browse rooms."))
	} else {
		b.WriteString(m.renderBookingsList(visibleBookings))
	}

	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderListHelp())

	return b.String()
}

// renderHeader renders the header
func (m *BookingsModel) renderHeader() string {
	title := m.styles.Title.Render("My Bookings")
	subtitle := m.styles.Subtitle.Render(fmt.Sprintf("%d total bookings", len(m.bookings)))

	return title + "\n" + subtitle
}

// renderFilterButtons renders filter toggle buttons
func (m *BookingsModel) renderFilterButtons() string {
	var buttons []string

	upcomingStyle := m.styles.Button
	if m.showUpcoming {
		upcomingStyle = m.styles.ButtonActive
	}
	buttons = append(buttons, upcomingStyle.Render("[u] Upcoming"))

	pastStyle := m.styles.Button
	if m.showPast {
		pastStyle = m.styles.ButtonActive
	}
	buttons = append(buttons, pastStyle.Render("[p] Past"))

	cancelledStyle := m.styles.Button
	if m.showCancelled {
		cancelledStyle = m.styles.ButtonActive
	}
	buttons = append(buttons, cancelledStyle.Render("[c] Cancelled"))

	return strings.Join(buttons, "  ")
}

// renderBookingsList renders the list of bookings
func (m *BookingsModel) renderBookingsList(bookings []models.Booking) string {
	var b strings.Builder

	for i, booking := range bookings {
		if i == m.cursor {
			b.WriteString(m.renderBookingItem(booking, true))
		} else {
			b.WriteString(m.renderBookingItem(booking, false))
		}
		if i < len(bookings)-1 {
			b.WriteString("\n")
		}
	}

	return b.String()
}

// renderBookingItem renders a single booking item
func (m *BookingsModel) renderBookingItem(booking models.Booking, isSelected bool) string {
	nameStyle := m.styles.TextBold
	timeStyle := m.styles.Text
	statusStyle := m.styles.TextMuted
	cursorStyle := m.styles.Text

	if isSelected {
		nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		timeStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
		statusStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
		cursorStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
	}

	cursor := "  "
	if isSelected {
		cursor = cursorStyle.Render("> ")
	}

	// Room and location
	roomName := nameStyle.Render(booking.Room.Name)
	location := timeStyle.Render(booking.Room.Location.Name)

	// Time
	var timeStr string
	if utils.IsToday(booking.StartTime) {
		timeStr = m.styles.TextSuccess.Render("Today " + utils.FormatTime(booking.StartTime))
	} else if utils.IsPast(booking.StartTime) {
		timeStr = m.styles.TextMuted.Render(utils.FormatDateTime(booking.StartTime))
	} else {
		timeStr = timeStyle.Render(utils.FormatDateTime(booking.StartTime))
	}

	duration := statusStyle.Render(utils.FormatDuration(booking.StartTime, booking.EndTime))

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

	line1 := lipgloss.JoinHorizontal(lipgloss.Left, cursor, roomName, " • ", location, "  ", statusBadge)
	line2 := lipgloss.JoinHorizontal(lipgloss.Left, "  ", timeStr, " • ", duration)

	return line1 + "\n" + line2
}

// renderDetails renders booking details
func (m *BookingsModel) renderDetails() string {
	if m.selectedBooking == nil {
		return "No booking selected"
	}

	var b strings.Builder
	booking := m.selectedBooking

	// Header
	b.WriteString(m.styles.Title.Render("Booking Details"))
	b.WriteString("\n\n")

	// Booking info in a card
	var card strings.Builder

	// Room and location
	card.WriteString(m.styles.Heading.Render(booking.Room.Name))
	card.WriteString("\n")
	card.WriteString(m.styles.Text.Render(booking.Room.Location.Name))
	card.WriteString("\n\n")

	// Time details
	card.WriteString(m.styles.TextBold.Render("When"))
	card.WriteString("\n")
	card.WriteString(m.styles.Text.Render(utils.FormatDateTime(booking.StartTime)))
	card.WriteString("\n")
	card.WriteString(m.styles.Text.Render(utils.FormatDateTime(booking.EndTime)))
	card.WriteString("\n")
	card.WriteString(m.styles.TextMuted.Render(fmt.Sprintf("Duration: %s", utils.FormatDuration(booking.StartTime, booking.EndTime))))
	card.WriteString("\n\n")

	// Title and Description
	card.WriteString(m.styles.TextBold.Render("Title"))
	card.WriteString("\n")
	card.WriteString(m.styles.Text.Render(booking.Title))
	card.WriteString("\n\n")

	if booking.Description != "" {
		card.WriteString(m.styles.TextBold.Render("Description"))
		card.WriteString("\n")
		card.WriteString(m.styles.Text.Render(booking.Description))
		card.WriteString("\n\n")
	}

	// Status
	card.WriteString(m.styles.TextBold.Render("Status"))
	card.WriteString("\n")
	switch booking.Status {
	case models.BookingStatusConfirmed:
		card.WriteString(m.styles.BadgeSuccess.Render("CONFIRMED"))
	case models.BookingStatusPending:
		card.WriteString(m.styles.BadgeWarning.Render("PENDING"))
	case models.BookingStatusCancelled:
		card.WriteString(m.styles.BadgeError.Render("CANCELLED"))
	}

	b.WriteString(m.styles.Panel.Render(card.String()))
	b.WriteString("\n\n")

	// Confirmation dialog for cancellation
	if m.confirmingCancel {
		b.WriteString(m.styles.TextWarning.Render("⚠ Are you sure you want to cancel this booking?"))
		b.WriteString("\n")
		b.WriteString(m.styles.Help.Render("Press 'y' to confirm, 'n' to cancel"))
	} else if m.cancelling {
		b.WriteString(m.styles.TextMuted.Render("Cancelling booking..."))
	} else {
		// Help
		if booking.Status != models.BookingStatusCancelled {
			b.WriteString(m.styles.Help.Render("d: Cancel booking • Esc: Back to list"))
		} else {
			b.WriteString(m.styles.Help.Render("Esc: Back to list"))
		}
	}

	return b.String()
}

// renderCreate renders the create booking form redirect
func (m *BookingsModel) renderCreate() string {
	// Note: This is a placeholder - the actual form is now in booking_form.go
	// The app will redirect to a separate BookingFormModel
	return m.styles.Title.Render("Create Booking") + "\n\n" +
		m.styles.Text.Render("Opening booking form...") + "\n\n" +
		m.styles.Help.Render("Press 3 to browse rooms, or Esc to cancel")
}

// renderListHelp renders help for list mode
func (m *BookingsModel) renderListHelp() string {
	help := []string{
		"j/k or ↑↓: Navigate",
		"Enter: View details",
		"u/p/c: Toggle filters",
		"n: New booking",
		"r: Refresh",
	}
	return m.styles.Help.Render(strings.Join(help, " • "))
}

// renderLoading renders the loading state
func (m *BookingsModel) renderLoading() string {
	return m.styles.Title.Render("My Bookings") + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *BookingsModel) renderError() string {
	return m.styles.Title.Render("My Bookings") + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("Press r to retry")
}

// loadData loads bookings from the API
func (m *BookingsModel) loadData() tea.Cmd {
	return func() tea.Msg {
		bookings, err := m.client.GetMyBookings()
		if err != nil {
			return BookingsErrorMsg{Error: err.Error()}
		}

		return BookingsDataMsg{Bookings: bookings}
	}
}

// cancelBooking cancels the selected booking
func (m *BookingsModel) cancelBooking() tea.Cmd {
	return func() tea.Msg {
		if m.selectedBooking == nil {
			return BookingsErrorMsg{Error: "No booking selected"}
		}

		err := m.client.CancelBooking(m.selectedBooking.ID)
		if err != nil {
			return BookingsErrorMsg{Error: err.Error()}
		}

		return BookingCancelledMsg{BookingID: m.selectedBooking.ID}
	}
}

// getVisibleBookings returns bookings filtered by current settings
func (m *BookingsModel) getVisibleBookings() []models.Booking {
	var visible []models.Booking
	now := time.Now()

	for _, booking := range m.bookings {
		// Filter by status
		if booking.Status == models.BookingStatusCancelled && !m.showCancelled {
			continue
		}

		// Filter by time
		isUpcoming := booking.StartTime.After(now) && booking.Status == models.BookingStatusConfirmed
		isPast := booking.StartTime.Before(now)

		if isUpcoming && m.showUpcoming {
			visible = append(visible, booking)
		} else if isPast && m.showPast {
			visible = append(visible, booking)
		} else if booking.Status == models.BookingStatusCancelled && m.showCancelled {
			visible = append(visible, booking)
		}
	}

	return visible
}
