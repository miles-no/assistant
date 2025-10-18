package ui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/miles/booking-tui/internal/api"
	"github.com/miles/booking-tui/internal/models"
	"github.com/miles/booking-tui/internal/styles"
)

// AdminViewMode represents the current admin view
type AdminViewMode int

const (
	AdminMenuMode AdminViewMode = iota
	AdminLocationsMode
	AdminAllBookingsMode
	AdminUsersMode
)

// AdminModel represents the admin panel
type AdminModel struct {
	styles *styles.Styles
	client *api.Client
	user   *models.User
	width  int
	height int

	// View mode
	mode   AdminViewMode
	cursor int

	// Data
	locations []models.Location
	bookings  []models.Booking
	loading   bool
	error     string

	// Menu items (role-dependent)
	menuItems []adminMenuItem
}

type adminMenuItem struct {
	label       string
	description string
	mode        AdminViewMode
	adminOnly   bool // true if only admins can access
}

// AdminLocationsDataMsg contains loaded locations data
type AdminLocationsDataMsg struct {
	Locations []models.Location
}

// AdminBookingsDataMsg contains loaded bookings data
type AdminBookingsDataMsg struct {
	Bookings []models.Booking
}

// AdminErrorMsg contains error information
type AdminErrorMsg struct {
	Error string
}

// NewAdminModel creates a new admin panel
func NewAdminModel(client *api.Client, user *models.User, styles *styles.Styles) *AdminModel {
	m := &AdminModel{
		styles: styles,
		client: client,
		user:   user,
		mode:   AdminMenuMode,
	}

	// Build menu based on user role
	m.buildMenu()

	return m
}

// buildMenu builds the admin menu based on user role
func (m *AdminModel) buildMenu() {
	var items []adminMenuItem

	if m.user.Role == models.RoleAdmin {
		// Admin gets all features
		items = []adminMenuItem{
			{
				label:       "Location Management",
				description: "View, create, and manage all locations",
				mode:        AdminLocationsMode,
				adminOnly:   false,
			},
			{
				label:       "All Bookings",
				description: "View and manage all bookings across the system",
				mode:        AdminAllBookingsMode,
				adminOnly:   false,
			},
			{
				label:       "User Management",
				description: "View and manage user accounts and roles",
				mode:        AdminUsersMode,
				adminOnly:   true,
			},
		}
	} else if m.user.Role == models.RoleManager {
		// Manager gets limited features
		items = []adminMenuItem{
			{
				label:       "Managed Locations",
				description: "View and manage your assigned locations",
				mode:        AdminLocationsMode,
				adminOnly:   false,
			},
			{
				label:       "Location Bookings",
				description: "View bookings for your managed locations",
				mode:        AdminAllBookingsMode,
				adminOnly:   false,
			},
		}
	}

	m.menuItems = items
}

// Init initializes the admin panel
func (m *AdminModel) Init() tea.Cmd {
	return nil
}

// Update handles messages for the admin panel
func (m *AdminModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case AdminLocationsDataMsg:
		m.locations = msg.Locations
		m.loading = false
		return m, nil

	case AdminBookingsDataMsg:
		m.bookings = msg.Bookings
		m.loading = false
		return m, nil

	case AdminErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case tea.KeyMsg:
		if m.loading {
			return m, nil
		}

		// Handle different modes
		switch m.mode {
		case AdminMenuMode:
			return m.handleMenuKeys(msg)
		case AdminLocationsMode:
			return m.handleLocationsKeys(msg)
		case AdminAllBookingsMode:
			return m.handleBookingsKeys(msg)
		case AdminUsersMode:
			return m.handleUsersKeys(msg)
		}
	}

	return m, nil
}

// handleMenuKeys handles keys in menu mode
func (m *AdminModel) handleMenuKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
		return m, nil

	case "down", "j":
		if m.cursor < len(m.menuItems)-1 {
			m.cursor++
		}
		return m, nil

	case "g":
		m.cursor = 0
		return m, nil

	case "G":
		m.cursor = len(m.menuItems) - 1
		return m, nil

	case "enter":
		if m.cursor < len(m.menuItems) {
			selectedItem := m.menuItems[m.cursor]
			m.mode = selectedItem.mode
			m.cursor = 0
			m.error = ""

			// Load data for the selected view
			switch selectedItem.mode {
			case AdminLocationsMode:
				m.loading = true
				return m, m.loadLocations()
			case AdminAllBookingsMode:
				m.loading = true
				return m, m.loadAllBookings()
			case AdminUsersMode:
				// User management not implemented yet
				m.error = "User management coming soon"
				return m, nil
			}
		}
		return m, nil
	}

	return m, nil
}

// handleLocationsKeys handles keys in locations mode
func (m *AdminModel) handleLocationsKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.mode = AdminMenuMode
		m.cursor = 0
		m.error = ""
		return m, nil

	case "r", "f5":
		m.loading = true
		m.error = ""
		return m, m.loadLocations()

	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
		return m, nil

	case "down", "j":
		if m.cursor < len(m.locations)-1 {
			m.cursor++
		}
		return m, nil

	case "g":
		m.cursor = 0
		return m, nil

	case "G":
		m.cursor = len(m.locations) - 1
		return m, nil
	}

	return m, nil
}

// handleBookingsKeys handles keys in all bookings mode
func (m *AdminModel) handleBookingsKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.mode = AdminMenuMode
		m.cursor = 0
		m.error = ""
		return m, nil

	case "r", "f5":
		m.loading = true
		m.error = ""
		return m, m.loadAllBookings()

	case "up", "k":
		if m.cursor > 0 {
			m.cursor--
		}
		return m, nil

	case "down", "j":
		if m.cursor < len(m.bookings)-1 {
			m.cursor++
		}
		return m, nil

	case "g":
		m.cursor = 0
		return m, nil

	case "G":
		m.cursor = len(m.bookings) - 1
		return m, nil
	}

	return m, nil
}

// handleUsersKeys handles keys in user management mode
func (m *AdminModel) handleUsersKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "q":
		m.mode = AdminMenuMode
		m.cursor = 0
		m.error = ""
		return m, nil
	}

	return m, nil
}

// View renders the admin panel
func (m *AdminModel) View() string {
	if m.loading {
		return m.renderLoading()
	}

	if m.error != "" && m.mode != AdminMenuMode {
		return m.renderError()
	}

	switch m.mode {
	case AdminMenuMode:
		return m.renderMenu()
	case AdminLocationsMode:
		return m.renderLocations()
	case AdminAllBookingsMode:
		return m.renderAllBookings()
	case AdminUsersMode:
		return m.renderUsers()
	default:
		return "Unknown mode"
	}
}

// renderMenu renders the admin menu
func (m *AdminModel) renderMenu() string {
	var b strings.Builder

	// Header
	roleLabel := string(m.user.Role)
	if m.user.Role == models.RoleAdmin {
		b.WriteString(m.styles.Title.Render("Admin Panel"))
	} else {
		b.WriteString(m.styles.Title.Render("Manager Panel"))
	}
	b.WriteString("\n")
	b.WriteString(m.styles.Subtitle.Render(fmt.Sprintf("Logged in as %s (%s)", m.user.FullName(), roleLabel)))
	b.WriteString("\n\n")

	// Menu items
	for i, item := range m.menuItems {
		cursor := "  "
		nameStyle := m.styles.Text
		descStyle := m.styles.TextMuted

		if i == m.cursor {
			cursor = m.styles.Text.Foreground(m.styles.Colors.Primary).Render("> ")
			nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
			descStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
		}

		b.WriteString(cursor)
		b.WriteString(nameStyle.Render(item.label))
		b.WriteString("\n")
		b.WriteString("  ")
		b.WriteString(descStyle.Render(item.description))
		b.WriteString("\n")

		if i < len(m.menuItems)-1 {
			b.WriteString("\n")
		}
	}

	b.WriteString("\n\n")

	// Help
	b.WriteString(m.styles.Help.Render("j/k or ↑↓: Navigate • Enter: Select • 1: Back to Dashboard"))

	return b.String()
}

// renderLocations renders the locations management view
func (m *AdminModel) renderLocations() string {
	var b strings.Builder

	// Header
	if m.user.Role == models.RoleAdmin {
		b.WriteString(m.styles.Title.Render("Location Management"))
		b.WriteString("\n")
		b.WriteString(m.styles.Subtitle.Render(fmt.Sprintf("%d locations", len(m.locations))))
	} else {
		b.WriteString(m.styles.Title.Render("Managed Locations"))
		b.WriteString("\n")
		b.WriteString(m.styles.Subtitle.Render(fmt.Sprintf("%d managed locations", len(m.locations))))
	}
	b.WriteString("\n\n")

	// Locations list
	if len(m.locations) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No locations found."))
	} else {
		for i, location := range m.locations {
			b.WriteString(m.renderLocationItem(location, i == m.cursor))
			if i < len(m.locations)-1 {
				b.WriteString("\n\n")
			}
		}
	}

	b.WriteString("\n\n")

	// Help
	if m.user.Role == models.RoleAdmin {
		b.WriteString(m.styles.Help.Render("j/k or ↑↓: Navigate • r: Refresh • Esc: Back to menu"))
	} else {
		b.WriteString(m.styles.Help.Render("j/k or ↑↓: Navigate • r: Refresh • Esc: Back to menu"))
	}

	return b.String()
}

// renderLocationItem renders a single location item
func (m *AdminModel) renderLocationItem(location models.Location, isSelected bool) string {
	cursor := "  "
	nameStyle := m.styles.TextBold
	textStyle := m.styles.Text
	mutedStyle := m.styles.TextMuted

	if isSelected {
		cursor = m.styles.Text.Foreground(m.styles.Colors.Primary).Render("> ")
		nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		textStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
		mutedStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
	}

	// Build location card
	line1 := lipgloss.JoinHorizontal(lipgloss.Left,
		cursor,
		nameStyle.Render(location.Name),
		" • ",
		textStyle.Render(location.City+", "+location.Country),
	)

	line2 := lipgloss.JoinHorizontal(lipgloss.Left,
		"  ",
		mutedStyle.Render(location.Address),
	)

	line3 := ""
	if location.Description != "" {
		line3 = lipgloss.JoinHorizontal(lipgloss.Left,
			"  ",
			mutedStyle.Render(location.Description),
		)
	}

	if line3 != "" {
		return line1 + "\n" + line2 + "\n" + line3
	}
	return line1 + "\n" + line2
}

// renderAllBookings renders all bookings view
func (m *AdminModel) renderAllBookings() string {
	var b strings.Builder

	// Header
	if m.user.Role == models.RoleAdmin {
		b.WriteString(m.styles.Title.Render("All Bookings"))
		b.WriteString("\n")
		b.WriteString(m.styles.Subtitle.Render(fmt.Sprintf("%d bookings across all locations", len(m.bookings))))
	} else {
		b.WriteString(m.styles.Title.Render("Location Bookings"))
		b.WriteString("\n")
		b.WriteString(m.styles.Subtitle.Render(fmt.Sprintf("%d bookings in managed locations", len(m.bookings))))
	}
	b.WriteString("\n\n")

	// Bookings list
	if len(m.bookings) == 0 {
		b.WriteString(m.styles.TextMuted.Render("No bookings found."))
	} else {
		for i, booking := range m.bookings {
			b.WriteString(m.renderBookingItem(booking, i == m.cursor))
			if i < len(m.bookings)-1 {
				b.WriteString("\n\n")
			}
		}
	}

	b.WriteString("\n\n")

	// Help
	b.WriteString(m.styles.Help.Render("j/k or ↑↓: Navigate • r: Refresh • Esc: Back to menu"))

	return b.String()
}

// renderBookingItem renders a single booking item
func (m *AdminModel) renderBookingItem(booking models.Booking, isSelected bool) string {
	cursor := "  "
	nameStyle := m.styles.TextBold
	textStyle := m.styles.Text
	mutedStyle := m.styles.TextMuted

	if isSelected {
		cursor = m.styles.Text.Foreground(m.styles.Colors.Primary).Render("> ")
		nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
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

	// Build booking card
	line1 := lipgloss.JoinHorizontal(lipgloss.Left,
		cursor,
		nameStyle.Render(booking.Title),
		" • ",
		textStyle.Render(booking.User.FullName()),
		"  ",
		statusBadge,
	)

	line2 := lipgloss.JoinHorizontal(lipgloss.Left,
		"  ",
		mutedStyle.Render(booking.Room.Name+" • "+booking.Room.Location.Name),
	)

	line3 := lipgloss.JoinHorizontal(lipgloss.Left,
		"  ",
		textStyle.Render(booking.StartTime.Format("Jan 2, 2006 3:04 PM")+" - "+booking.EndTime.Format("3:04 PM")),
	)

	return line1 + "\n" + line2 + "\n" + line3
}

// renderUsers renders the user management view
func (m *AdminModel) renderUsers() string {
	var b strings.Builder

	b.WriteString(m.styles.Title.Render("User Management"))
	b.WriteString("\n\n")

	b.WriteString(m.styles.TextMuted.Render("Coming soon..."))
	b.WriteString("\n\n")

	b.WriteString(m.styles.Help.Render("Esc: Back to menu"))

	return b.String()
}

// renderLoading renders the loading state
func (m *AdminModel) renderLoading() string {
	title := "Admin Panel"
	if m.user.Role == models.RoleManager {
		title = "Manager Panel"
	}

	return m.styles.Title.Render(title) + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *AdminModel) renderError() string {
	title := "Admin Panel"
	if m.user.Role == models.RoleManager {
		title = "Manager Panel"
	}

	return m.styles.Title.Render(title) + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("r: Retry • Esc: Back to menu")
}

// loadLocations loads all locations
func (m *AdminModel) loadLocations() tea.Cmd {
	return func() tea.Msg {
		locations, err := m.client.GetLocations()
		if err != nil {
			return AdminErrorMsg{Error: err.Error()}
		}

		return AdminLocationsDataMsg{Locations: locations}
	}
}

// loadAllBookings loads all bookings
func (m *AdminModel) loadAllBookings() tea.Cmd {
	return func() tea.Msg {
		// GetBookings without filters returns all bookings
		// The API automatically filters based on user role
		bookings, err := m.client.GetBookings(nil, nil, nil, nil)
		if err != nil {
			return AdminErrorMsg{Error: err.Error()}
		}

		return AdminBookingsDataMsg{Bookings: bookings}
	}
}
