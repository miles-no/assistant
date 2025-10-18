package ui

import (
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/miles/booking-tui/internal/api"
	"github.com/miles/booking-tui/internal/models"
	"github.com/miles/booking-tui/internal/styles"
)

// ViewState represents the current view
type ViewState int

const (
	ViewLogin ViewState = iota
	ViewDashboard
	ViewLocations
	ViewRooms
	ViewCalendar
	ViewBookings
	ViewBookingForm
	ViewSearch
	ViewAdmin
	ViewHelp
)

// App is the main application model
type App struct {
	// State
	state        ViewState
	width        int
	height       int
	ready        bool
	authenticated bool

	// API Client
	client *api.Client

	// User
	user  *models.User
	token string

	// Views
	login       tea.Model
	dashboard   tea.Model
	locations   tea.Model
	rooms       tea.Model
	calendar    tea.Model
	bookings    tea.Model
	bookingForm tea.Model
	search      tea.Model
	admin       tea.Model

	// UI Components
	viewport viewport.Model
	styles   *styles.Styles
}

// NewApp creates a new application instance
func NewApp() *App {
	client := api.NewClient("http://localhost:3000/api")
	styles := styles.DefaultStyles()

	app := &App{
		state:         ViewLogin,
		client:        client,
		styles:        styles,
		authenticated: false,
	}

	// Initialize login view
	app.login = NewLoginModel(client, styles)

	return app
}

// Init initializes the application
func (a *App) Init() tea.Cmd {
	if a.login != nil {
		return a.login.Init()
	}
	return nil
}

// Update handles messages and updates the model
func (a *App) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		a.width = msg.Width
		a.height = msg.Height
		a.ready = true
		// Propagate window size to current view
		return a, a.updateCurrentView(msg)

	case LoginSuccessMsg:
		// User successfully logged in
		a.authenticated = true
		a.user = msg.User
		a.token = msg.Token
		a.state = ViewDashboard
		// Initialize dashboard
		a.dashboard = NewDashboardModel(a.client, a.user, a.styles)
		return a, a.dashboard.Init()

	case LocationSelectMsg:
		// User selected a location, navigate to rooms view
		a.state = ViewRooms
		a.rooms = NewRoomsModel(a.client, a.styles, &msg.Location)
		return a, a.rooms.Init()

	case RoomSelectMsg:
		// User selected a room, navigate to booking form
		a.state = ViewBookingForm
		a.bookingForm = NewBookingFormModel(a.client, a.styles, &msg.Room)
		return a, a.bookingForm.Init()

	case BookingFormCompleteMsg:
		// Booking created successfully, reload bookings and go back to list
		a.state = ViewBookings
		a.bookingForm = nil
		if a.bookings != nil {
			// Reload bookings
			return a, a.bookings.Init()
		}
		return a, nil

	case BookingFormCancelMsg:
		// Form cancelled, go back to previous view
		a.state = ViewBookings
		a.bookingForm = nil
		return a, nil

	case tea.KeyMsg:
		// Global shortcuts
		if a.authenticated {
			switch msg.String() {
			case "ctrl+c", "q":
				return a, tea.Quit
			case "1":
				a.state = ViewDashboard
				return a, nil
			case "2":
				a.state = ViewLocations
				// Initialize locations view if not already done
				if a.locations == nil {
					a.locations = NewLocationsModel(a.client, a.styles)
					return a, a.locations.Init()
				}
				return a, nil
			case "3":
				a.state = ViewRooms
				// Initialize rooms view if not already done (no location filter)
				if a.rooms == nil {
					a.rooms = NewRoomsModel(a.client, a.styles, nil)
					return a, a.rooms.Init()
				}
				return a, nil
			case "4":
				a.state = ViewCalendar
				// Initialize calendar view if not already done
				if a.calendar == nil {
					a.calendar = NewCalendarModel(a.client, a.styles)
					return a, a.calendar.Init()
				}
				return a, nil
			case "5":
				a.state = ViewBookings
				// Initialize bookings view if not already done
				if a.bookings == nil {
					a.bookings = NewBookingsModel(a.client, a.styles)
					return a, a.bookings.Init()
				}
				return a, nil
			case "6":
				a.state = ViewSearch
				return a, nil
			case "0":
				if a.user.Role == models.RoleAdmin || a.user.Role == models.RoleManager {
					a.state = ViewAdmin
					// Initialize admin view if not already done
					if a.admin == nil {
						a.admin = NewAdminModel(a.client, a.user, a.styles)
						return a, a.admin.Init()
					}
				}
				return a, nil
			case "?", "f1":
				a.state = ViewHelp
				return a, nil
			}
		}
	}

	// Delegate to current view
	cmd := a.updateCurrentView(msg)
	return a, cmd
}

// View renders the application
func (a *App) View() string {
	if !a.ready {
		return "Initializing Miles Booking System..."
	}

	// Render current view
	switch a.state {
	case ViewLogin:
		return a.renderLogin()
	case ViewDashboard:
		return a.renderDashboard()
	case ViewLocations:
		return a.renderLocations()
	case ViewRooms:
		return a.renderRooms()
	case ViewCalendar:
		return a.renderCalendar()
	case ViewBookings:
		return a.renderBookings()
	case ViewBookingForm:
		return a.renderBookingForm()
	case ViewSearch:
		return a.renderSearch()
	case ViewAdmin:
		return a.renderAdmin()
	case ViewHelp:
		return a.renderHelp()
	default:
		return "Unknown view"
	}
}

// updateCurrentView delegates updates to the current view
func (a *App) updateCurrentView(msg tea.Msg) tea.Cmd {
	var cmd tea.Cmd

	switch a.state {
	case ViewLogin:
		if a.login != nil {
			a.login, cmd = a.login.Update(msg)
		}
	case ViewDashboard:
		if a.dashboard != nil {
			a.dashboard, cmd = a.dashboard.Update(msg)
		}
	case ViewLocations:
		if a.locations != nil {
			a.locations, cmd = a.locations.Update(msg)
		}
	case ViewRooms:
		if a.rooms != nil {
			a.rooms, cmd = a.rooms.Update(msg)
		}
	case ViewCalendar:
		if a.calendar != nil {
			a.calendar, cmd = a.calendar.Update(msg)
		}
	case ViewBookings:
		if a.bookings != nil {
			a.bookings, cmd = a.bookings.Update(msg)
		}
	case ViewBookingForm:
		if a.bookingForm != nil {
			a.bookingForm, cmd = a.bookingForm.Update(msg)
		}
	case ViewSearch:
		if a.search != nil {
			a.search, cmd = a.search.Update(msg)
		}
	case ViewAdmin:
		if a.admin != nil {
			a.admin, cmd = a.admin.Update(msg)
		}
	}

	return cmd
}

// View rendering methods
func (a *App) renderLogin() string {
	if a.login != nil {
		return a.login.View()
	}
	return "Loading login..."
}

func (a *App) renderDashboard() string {
	if a.dashboard != nil {
		return a.dashboard.View()
	}
	// Placeholder dashboard
	return a.styles.Title.Render("Dashboard") + "\n\n" +
		a.styles.Text.Render("Welcome to Miles Booking System, "+a.user.FullName()+"!") + "\n\n" +
		a.styles.Help.Render("Press 2-6 to navigate views • ? for help • q to quit")
}

func (a *App) renderLocations() string {
	if a.locations != nil {
		return a.locations.View()
	}
	return a.styles.Title.Render("Locations") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderRooms() string {
	if a.rooms != nil {
		return a.rooms.View()
	}
	return a.styles.Title.Render("Rooms") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderCalendar() string {
	if a.calendar != nil {
		return a.calendar.View()
	}
	return a.styles.Title.Render("Calendar") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderBookings() string {
	if a.bookings != nil {
		return a.bookings.View()
	}
	return a.styles.Title.Render("My Bookings") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderBookingForm() string {
	if a.bookingForm != nil {
		return a.bookingForm.View()
	}
	return a.styles.Title.Render("Create Booking") + "\n\n" +
		a.styles.TextMuted.Render("Loading form...")
}

func (a *App) renderSearch() string {
	if a.search != nil {
		return a.search.View()
	}
	return a.styles.Title.Render("Search") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderAdmin() string {
	if a.admin != nil {
		return a.admin.View()
	}
	return a.styles.Title.Render("Admin Panel") + "\n\n" +
		a.styles.TextMuted.Render("Coming soon...") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}

func (a *App) renderHelp() string {
	return a.styles.Title.Render("Help & Keyboard Shortcuts") + "\n\n" +
		a.styles.Heading.Render("Navigation") + "\n" +
		a.styles.Text.Render("  1 - Dashboard") + "\n" +
		a.styles.Text.Render("  2 - Locations") + "\n" +
		a.styles.Text.Render("  3 - Rooms") + "\n" +
		a.styles.Text.Render("  4 - Calendar") + "\n" +
		a.styles.Text.Render("  5 - My Bookings") + "\n" +
		a.styles.Text.Render("  6 - Search") + "\n" +
		a.styles.Text.Render("  0 - Admin Panel (Admin/Manager only)") + "\n\n" +
		a.styles.Heading.Render("Global Shortcuts") + "\n" +
		a.styles.Text.Render("  ? - Show this help") + "\n" +
		a.styles.Text.Render("  q - Quit application") + "\n" +
		a.styles.Text.Render("  Ctrl+C - Quit application") + "\n\n" +
		a.styles.Help.Render("Press 1 to go back to dashboard")
}
