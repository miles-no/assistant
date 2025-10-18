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

// RoomsModel represents the rooms browser view
type RoomsModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// Filters
	selectedLocation *models.Location
	minCapacity      *int
	equipment        []string

	// Data
	rooms   []models.Room
	cursor  int
	loading bool
	error   string

	// Filter mode
	filterMode bool
}

// RoomsDataMsg contains loaded rooms data
type RoomsDataMsg struct {
	Rooms []models.Room
}

// RoomsErrorMsg contains error information
type RoomsErrorMsg struct {
	Error string
}

// RoomSelectMsg is sent when a room is selected
type RoomSelectMsg struct {
	Room models.Room
}

// NewRoomsModel creates a new rooms browser view
func NewRoomsModel(client *api.Client, styles *styles.Styles, location *models.Location) *RoomsModel {
	return &RoomsModel{
		styles:           styles,
		client:           client,
		selectedLocation: location,
		loading:          true,
	}
}

// Init initializes the rooms view
func (m *RoomsModel) Init() tea.Cmd {
	return m.loadData()
}

// Update handles messages for the rooms view
func (m *RoomsModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case RoomsDataMsg:
		m.rooms = msg.Rooms
		m.loading = false
		return m, nil

	case RoomsErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil

	case tea.KeyMsg:
		if m.loading {
			return m, nil
		}

		if m.filterMode {
			return m.handleFilterKeys(msg)
		}

		switch msg.String() {
		case "r", "f5":
			m.loading = true
			m.error = ""
			return m, m.loadData()

		case "f":
			m.filterMode = true
			return m, nil

		case "c":
			// Clear filters
			m.selectedLocation = nil
			m.minCapacity = nil
			m.equipment = []string{}
			m.loading = true
			return m, m.loadData()

		case "up", "k":
			if m.cursor > 0 {
				m.cursor--
			}
			return m, nil

		case "down", "j":
			if m.cursor < len(m.rooms)-1 {
				m.cursor++
			}
			return m, nil

		case "g":
			m.cursor = 0
			return m, nil

		case "G":
			m.cursor = len(m.rooms) - 1
			return m, nil

		case "enter":
			if m.cursor < len(m.rooms) {
				return m, func() tea.Msg {
					return RoomSelectMsg{Room: m.rooms[m.cursor]}
				}
			}
			return m, nil
		}
	}

	return m, nil
}

// handleFilterKeys handles key presses in filter mode
func (m *RoomsModel) handleFilterKeys(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc":
		m.filterMode = false
		return m, nil

	case "1", "2", "3", "4":
		// Set minimum capacity
		capacity := map[string]int{
			"1": 2,
			"2": 4,
			"3": 6,
			"4": 10,
		}[msg.String()]
		m.minCapacity = &capacity
		m.loading = true
		m.filterMode = false
		return m, m.loadData()
	}

	return m, nil
}

// View renders the rooms view
func (m *RoomsModel) View() string {
	if m.loading {
		return m.renderLoading()
	}

	if m.error != "" {
		return m.renderError()
	}

	if m.filterMode {
		return m.renderFilterMenu()
	}

	var b strings.Builder

	// Header
	b.WriteString(m.renderHeader())
	b.WriteString("\n\n")

	// Active filters
	if m.hasFilters() {
		b.WriteString(m.renderActiveFilters())
		b.WriteString("\n\n")
	}

	// Rooms list
	b.WriteString(m.renderRoomsList())
	b.WriteString("\n\n")

	// Help
	b.WriteString(m.renderHelp())

	return b.String()
}

// renderHeader renders the header
func (m *RoomsModel) renderHeader() string {
	title := m.styles.Title.Render("Meeting Rooms")
	var subtitle string

	if m.selectedLocation != nil {
		subtitle = m.styles.Subtitle.Render(fmt.Sprintf("%s • %d rooms", m.selectedLocation.Name, len(m.rooms)))
	} else {
		subtitle = m.styles.Subtitle.Render(fmt.Sprintf("%d rooms", len(m.rooms)))
	}

	return title + "\n" + subtitle
}

// renderActiveFilters renders the active filters
func (m *RoomsModel) renderActiveFilters() string {
	var filters []string

	if m.selectedLocation != nil {
		filters = append(filters, m.styles.BadgeInfo.Render("Location: "+m.selectedLocation.Name))
	}
	if m.minCapacity != nil {
		filters = append(filters, m.styles.BadgeInfo.Render(fmt.Sprintf("Min capacity: %d", *m.minCapacity)))
	}
	if len(m.equipment) > 0 {
		filters = append(filters, m.styles.BadgeInfo.Render(fmt.Sprintf("Equipment: %s", strings.Join(m.equipment, ", "))))
	}

	if len(filters) == 0 {
		return ""
	}

	return m.styles.TextMuted.Render("Active filters: ") + strings.Join(filters, " ")
}

// renderRoomsList renders the list of rooms
func (m *RoomsModel) renderRoomsList() string {
	if len(m.rooms) == 0 {
		return m.styles.TextMuted.Render("No rooms found. Try adjusting your filters.")
	}

	var b strings.Builder

	for i, room := range m.rooms {
		if i == m.cursor {
			b.WriteString(m.renderRoomItem(room, true))
		} else {
			b.WriteString(m.renderRoomItem(room, false))
		}
		if i < len(m.rooms)-1 {
			b.WriteString("\n\n")
		}
	}

	return b.String()
}

// renderRoomItem renders a single room item
func (m *RoomsModel) renderRoomItem(room models.Room, isSelected bool) string {
	nameStyle := m.styles.TextBold
	locationStyle := m.styles.Text
	capacityStyle := m.styles.TextMuted
	cursorStyle := m.styles.Text

	if isSelected {
		nameStyle = m.styles.TextBold.Foreground(m.styles.Colors.Primary)
		locationStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
		capacityStyle = m.styles.TextMuted.Foreground(m.styles.Colors.Primary)
		cursorStyle = m.styles.Text.Foreground(m.styles.Colors.Primary)
	}

	cursor := "  "
	if isSelected {
		cursor = cursorStyle.Render("> ")
	}

	name := nameStyle.Render(room.Name)
	location := locationStyle.Render(room.Location.Name)
	capacity := capacityStyle.Render(fmt.Sprintf("Capacity: %d", room.Capacity))

	line1 := lipgloss.JoinHorizontal(lipgloss.Left, cursor, name, " • ", location)
	line2 := lipgloss.JoinHorizontal(lipgloss.Left, "  ", capacity)

	result := line1 + "\n" + line2

	// Amenities
	if len(room.Amenities) > 0 {
		amenityBadges := []string{}
		for _, amenity := range room.Amenities {
			badge := m.styles.Badge.Render(amenity)
			amenityBadges = append(amenityBadges, badge)
		}
		line3 := "  " + strings.Join(amenityBadges, " ")
		result += "\n" + line3
	}

	// Description
	if room.Description != "" && isSelected {
		desc := m.styles.TextDim.Render(room.Description)
		result += "\n  " + desc
	}

	return result
}

// renderFilterMenu renders the filter selection menu
func (m *RoomsModel) renderFilterMenu() string {
	var b strings.Builder

	b.WriteString(m.styles.Title.Render("Filter Rooms"))
	b.WriteString("\n\n")

	b.WriteString(m.styles.Heading.Render("Filter by Capacity"))
	b.WriteString("\n\n")

	options := []struct {
		key   string
		label string
	}{
		{"1", "At least 2 people"},
		{"2", "At least 4 people"},
		{"3", "At least 6 people"},
		{"4", "At least 10 people"},
	}

	for _, opt := range options {
		button := fmt.Sprintf("[%s] %s", opt.key, opt.label)
		b.WriteString(m.styles.Button.Render(button))
		b.WriteString("\n")
	}

	b.WriteString("\n")
	b.WriteString(m.styles.Help.Render("Press a number to filter • Esc to cancel"))

	return b.String()
}

// renderHelp renders help text
func (m *RoomsModel) renderHelp() string {
	help := []string{
		"j/k or ↑↓: Navigate",
		"Enter: Select room",
		"f: Filter",
		"c: Clear filters",
		"r: Refresh",
		"2: Back to locations",
	}
	return m.styles.Help.Render(strings.Join(help, " • "))
}

// renderLoading renders the loading state
func (m *RoomsModel) renderLoading() string {
	title := "Meeting Rooms"
	if m.selectedLocation != nil {
		title = fmt.Sprintf("Meeting Rooms - %s", m.selectedLocation.Name)
	}
	return m.styles.Title.Render(title) + "\n\n" +
		m.styles.TextMuted.Render("Loading...")
}

// renderError renders the error state
func (m *RoomsModel) renderError() string {
	return m.styles.Title.Render("Meeting Rooms") + "\n\n" +
		m.styles.TextError.Render("Error: "+m.error) + "\n\n" +
		m.styles.Help.Render("Press r to retry")
}

// loadData loads rooms data from the API
func (m *RoomsModel) loadData() tea.Cmd {
	return func() tea.Msg {
		var locationID *string
		if m.selectedLocation != nil {
			locationID = &m.selectedLocation.ID
		}

		rooms, err := m.client.GetRooms(locationID, m.minCapacity, m.equipment)
		if err != nil {
			return RoomsErrorMsg{Error: err.Error()}
		}

		return RoomsDataMsg{Rooms: rooms}
	}
}

// hasFilters returns whether any filters are active
func (m *RoomsModel) hasFilters() bool {
	return m.selectedLocation != nil || m.minCapacity != nil || len(m.equipment) > 0
}
