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

// DashboardModel represents the dashboard view
type DashboardModel struct {
	styles *styles.Styles
	client *api.Client
	user   *models.User
	width  int
	height int

	// Data
	bookings  []models.Booking
	locations []models.Location
	loading   bool
	error     string
}

// DashboardDataMsg contains loaded dashboard data
type DashboardDataMsg struct {
	Bookings  []models.Booking
	Locations []models.Location
}

// DashboardErrorMsg contains error information
type DashboardErrorMsg struct {
	Error string
}

// NewDashboardModel creates a new dashboard view
func NewDashboardModel(client *api.Client, user *models.User, styles *styles.Styles) *DashboardModel {
	return &DashboardModel{
		styles:  styles,
		client:  client,
		user:    user,
		loading: true,
	}
}

// Init initializes the dashboard
func (m *DashboardModel) Init() tea.Cmd {
	return m.loadData()
}

// Update handles messages for the dashboard
func (m *DashboardModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case DashboardDataMsg:
		m.bookings = msg.Bookings
		m.locations = msg.Locations
		m.loading = false
		return m, nil

	case DashboardErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "r", "f5":
			m.loading = true
			m.error = ""
			return m, m.loadData()
		}
	}

	return m, nil
}

// View renders the dashboard
func (m *DashboardModel) View() string {
	if m.loading {
		return m.renderLoading()
	}

	if m.error != "" {
		return m.renderError()
	}

	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Two-column layout
	leftColumn := m.renderStats()
	rightColumn := m.renderUpcomingBookings()

	columns := lipgloss.JoinHorizontal(
		lipgloss.Top,
		leftColumn,
		"  ",
		rightColumn,
	)

	b.WriteString(columns)
	b.WriteString("\n\n")

	// Quick actions
	b.WriteString(m.renderQuickActions())
	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderHeader renders the dashboard header
func (m *DashboardModel) renderHeader() string {
	var b strings.Builder

	title := m.styles.Title.Render("Dashboard")
	welcome := m.styles.Text.Render(fmt.Sprintf("Welcome back, %s!", m.user.Name))
	role := m.styles.Badge.Render(string(m.user.Role))

	b.WriteString(title)
	b.WriteString("\n")
	b.WriteString(lipgloss.JoinHorizontal(lipgloss.Left, welcome, "  ", role))

	return b.String()
}

// renderStats renders statistics cards
func (m *DashboardModel) renderStats() string {
	var b strings.Builder

	// Calculate stats
	upcomingCount := 0
	todayCount := 0
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	for _, booking := range m.bookings {
		if booking.Status == models.BookingStatusConfirmed && booking.StartTime.After(now) {
			upcomingCount++
			if booking.StartTime.After(today) && booking.StartTime.Before(today.Add(24*time.Hour)) {
				todayCount++
			}
		}
	}

	// Stats cards
	upcomingCard := m.renderStatCard("Upcoming Bookings", fmt.Sprintf("%d", upcomingCount), m.styles.Colors.Primary)
	todayCard := m.renderStatCard("Today", fmt.Sprintf("%d", todayCount), m.styles.Colors.Success)
	locationsCard := m.renderStatCard("Locations", fmt.Sprintf("%d", len(m.locations)), m.styles.Colors.Info)

	b.WriteString(m.styles.Heading.Render("Quick Stats"))
	b.WriteString("\n\n")
	b.WriteString(upcomingCard)
	b.WriteString("\n")
	b.WriteString(todayCard)
	b.WriteString("\n")
	b.WriteString(locationsCard)

	return m.styles.Panel.Width(40).Render(b.String())
}

// renderStatCard renders a single stat card
func (m *DashboardModel) renderStatCard(label, value string, color lipgloss.Color) string {
	valueStyle := lipgloss.NewStyle().
		Foreground(color).
		Bold(true).
		Width(8).
		Align(lipgloss.Right)

	labelStyle := m.styles.TextMuted.Width(20)

	return lipgloss.JoinHorizontal(
		lipgloss.Left,
		labelStyle.Render(label),
		valueStyle.Render(value),
	)
}

// renderUpcomingBookings renders the list of upcoming bookings
func (m *DashboardModel) renderUpcomingBookings() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Upcoming Bookings"))
	b.WriteString("\n\n")

	// Filter and sort upcoming bookings
	now := time.Now()
	upcoming := []models.Booking{}
	for _, booking := range m.bookings {
		if booking.Status == models.BookingStatusConfirmed && booking.StartTime.After(now) {
			upcoming = append(upcoming, booking)
		}
	}

	if len(upcoming) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No upcoming bookings"))
	} else {
		// Show up to 5 upcoming bookings
		count := len(upcoming)
		if count > 5 {
			count = 5
		}

		for i := 0; i < count; i++ {
			booking := upcoming[i]
			b.WriteString(m.renderBookingItem(booking))
			if i < count-1 {
				b.WriteString("\n")
			}
		}

		if len(upcoming) > 5 {
			b.WriteString("\n")
			b.WriteString(m.styles.TextMuted.Render(fmt.Sprintf("...and %d more", len(upcoming)-5)))
		}
	}

	return m.styles.Panel.Width(60).Render(b.String())
}

// renderBookingItem renders a single booking item
func (m *DashboardModel) renderBookingItem(booking models.Booking) string {
	// Room name
	roomName := m.styles.TextBold.Render(booking.Room.Name)

	// Time
	timeStr := utils.FormatDateTime(booking.StartTime)
	if utils.IsToday(booking.StartTime) {
		timeStr = m.styles.TextSuccess.Render("Today at " + utils.FormatTime(booking.StartTime))
	} else {
		timeStr = m.styles.TextMuted.Render(timeStr)
	}

	// Duration
	duration := utils.FormatDuration(booking.StartTime, booking.EndTime)

	// Location
	location := m.styles.TextDim.Render(booking.Room.Location.Name)

	line1 := lipgloss.JoinHorizontal(lipgloss.Left, roomName, " • ", location)
	line2 := lipgloss.JoinHorizontal(lipgloss.Left, timeStr, " • ", m.styles.TextMuted.Render(duration))

	return line1 + "\n" + line2
}

// renderQuickActions renders quick action buttons
func (m *DashboardModel) renderQuickActions() string {
	var b strings.Builder

	b.WriteString(m.styles.Heading.Render("Quick Actions"))
	b.WriteString("\n\n")

	actions := []struct {
		key   string
		label string
	}{
		{"2", "Browse Locations"},
		{"3", "Browse Rooms"},
		{"4", "View Calendar"},
		{"5", "My Bookings"},
		{"6", "Search Rooms"},
	}

	for i, action := range actions {
		button := fmt.Sprintf("[%s] %s", action.key, action.label)
		b.WriteString(m.styles.Button.Render(button))
		if i < len(actions)-1 {
			b.WriteString("  ")
		}
	}

	return b.String()
}

// renderHelp renders help text
func (m *DashboardModel) renderHelp() string {
	help := []string{
		"r/F5: Refresh",
		"?: Help",
		"q: Quit",
	}
	return m.styles.Help.Render(strings.Join(help, " • "))
}

// renderLoading renders the loading state
func (m *DashboardModel) renderLoading() string {
	return m.styles.Title.Render("Dashboard") + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *DashboardModel) renderError() string {
	return m.styles.Title.Render("Dashboard") + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("Press r to retry")
}

// loadData loads dashboard data from the API
func (m *DashboardModel) loadData() tea.Cmd {
	return func() tea.Msg {
		// Load bookings and locations in parallel
		bookingsChan := make(chan []models.Booking)
		locationsChan := make(chan []models.Location)
		errChan := make(chan error, 2)

		// Load bookings
		go func() {
			bookings, err := m.client.GetMyBookings()
			if err != nil {
				errChan <- err
				return
			}
			bookingsChan <- bookings
		}()

		// Load locations
		go func() {
			locations, err := m.client.GetLocations()
			if err != nil {
				errChan <- err
				return
			}
			locationsChan <- locations
		}()

		// Wait for results
		var bookings []models.Booking
		var locations []models.Location
		var errors []error

		for i := 0; i < 2; i++ {
			select {
			case b := <-bookingsChan:
				bookings = b
			case l := <-locationsChan:
				locations = l
			case err := <-errChan:
				errors = append(errors, err)
			}
		}

		if len(errors) > 0 {
			return DashboardErrorMsg{Error: errors[0].Error()}
		}

		return DashboardDataMsg{
			Bookings:  bookings,
			Locations: locations,
		}
	}
}
