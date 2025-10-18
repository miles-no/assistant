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

// LocationsModel represents the locations browser view
type LocationsModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// Data
	locations []models.Location
	roomCounts map[string]int
	cursor    int
	loading   bool
	error     string
}

// LocationsDataMsg contains loaded locations data
type LocationsDataMsg struct {
	Locations  []models.Location
	RoomCounts map[string]int
}

// LocationsErrorMsg contains error information
type LocationsErrorMsg struct {
	Error string
}

// LocationSelectMsg is sent when a location is selected
type LocationSelectMsg struct {
	Location models.Location
}

// NewLocationsModel creates a new locations browser view
func NewLocationsModel(client *api.Client, styles *styles.Styles) *LocationsModel {
	return &LocationsModel{
		styles:     styles,
		client:     client,
		loading:    true,
		roomCounts: make(map[string]int),
	}
}

// Init initializes the locations view
func (m *LocationsModel) Init() tea.Cmd {
	return m.loadData()
}

// Update handles messages for the locations view
func (m *LocationsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case LocationsDataMsg:
		m.locations = msg.Locations
		m.roomCounts = msg.RoomCounts
		m.loading = false
		return m, nil

	case LocationsErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case tea.KeyMsg:
		if m.loading {
			return m, nil
		}

		switch msg.String() {
		case "r", "f5":
			m.loading = true
			m.error = ""
			return m, m.loadData()

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

		case "enter":
			if m.cursor < len(m.locations) {
				// Return message to view rooms for this location
				return m, func() tea.Msg {
					return LocationSelectMsg{Location: m.locations[m.cursor]}
				}
			}
			return m, nil
		}
	}

	return m, nil
}

// View renders the locations view
func (m *LocationsModel) View() string {
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

	// Locations list
	b.WriteString(m.renderLocationsList())
	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderHeader renders the header
func (m *LocationsModel) renderHeader() string {
	title := m.styles.Title.Render("Office Locations")
	subtitle := m.styles.Subtitle.Render(fmt.Sprintf("%d locations", len(m.locations)))

	return title + "\n" + subtitle
}

// renderLocationsList renders the list of locations
func (m *LocationsModel) renderLocationsList() string {
	if len(m.locations) == 0 {
		return m.styles.TextMuted.Render("No locations found")
	}

	var b strings.Builder

	// Group by country
	norway := []models.Location{}
	international := []models.Location{}

	for _, loc := range m.locations {
		if loc.Country == "Norway" {
			norway = append(norway, loc)
		} else {
			international = append(international, loc)
		}
	}

	// Render Norway locations
	if len(norway) > 0 {
		b.WriteString(m.styles.Heading.Render("Norway"))
		b.WriteString("\n\n")
		for _, loc := range norway {
			b.WriteString(m.renderLocationItem(loc))
			b.WriteString("\n")
		}
		b.WriteString("\n")
	}

	// Render International locations
	if len(international) > 0 {
		b.WriteString(m.styles.Heading.Render("International"))
		b.WriteString("\n\n")
		for _, loc := range international {
			b.WriteString(m.renderLocationItem(loc))
			b.WriteString("\n")
		}
	}

	return b.String()
}

// renderLocationItem renders a single location item
func (m *LocationsModel) renderLocationItem(location models.Location) string {
	// Find if this is the cursor position
	isCursor := false
	for i, loc := range m.locations {
		if loc.ID == location.ID && i == m.cursor {
			isCursor = true
			break
		}
	}

	// Room count
	roomCount := m.roomCounts[location.ID]
	roomsText := fmt.Sprintf("%d rooms", roomCount)
	if roomCount == 1 {
		roomsText = "1 room"
	}

	// Location details
	nameStyle := m.styles.TextBold
	cityStyle := m.styles.Text
	roomsStyle := m.styles.TextMuted
	cursorStyle := m.styles.Text

	if isCursor {
		nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		cityStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
		roomsStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
		cursorStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
	}

	cursor := "  "
	if isCursor {
		cursor = cursorStyle.Render("> ")
	}

	name := nameStyle.Render(location.Name)
	city := cityStyle.Render(location.City)
	rooms := roomsStyle.Render(roomsText)

	line1 := lipgloss.JoinHorizontal(lipgloss.Left, cursor, name, " • ", city)
	line2 := lipgloss.JoinHorizontal(lipgloss.Left, "  ", rooms)

	if location.Description != "" {
		desc := m.styles.TextDim.Render(location.Description)
		return line1 + "\n" + line2 + "\n  " + desc
	}

	return line1 + "\n" + line2
}

// renderHelp renders help text
func (m *LocationsModel) renderHelp() string {
	help := []string{
		"j/k or ↑↓: Navigate",
		"Enter: View rooms",
		"r: Refresh",
		"1: Back to dashboard",
	}
	return m.styles.Help.Render(strings.Join(help, " • "))
}

// renderLoading renders the loading state
func (m *LocationsModel) renderLoading() string {
	return m.styles.Title.Render("Office Locations") + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *LocationsModel) renderError() string {
	return m.styles.Title.Render("Office Locations") + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("Press r to retry")
}

// loadData loads locations data from the API
func (m *LocationsModel) loadData() tea.Cmd {
	return func() tea.Msg {
		// Load locations
		locations, err := m.client.GetLocations()
		if err != nil {
			return LocationsErrorMsg{Error: err.Error()}
		}

		// Load rooms to count per location
		rooms, err := m.client.GetRooms(nil, nil, nil)
		if err != nil {
			return LocationsErrorMsg{Error: err.Error()}
		}

		// Count rooms per location
		roomCounts := make(map[string]int)
		for _, room := range rooms {
			roomCounts[room.LocationID]++
		}

		return LocationsDataMsg{
			Locations:  locations,
			RoomCounts: roomCounts,
		}
	}
}
