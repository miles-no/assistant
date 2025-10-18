package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/miles/booking-tui/internal/api"
	"github.com/miles/booking-tui/internal/models"
	"github.com/miles/booking-tui/internal/styles"
)

// LoginModel represents the login view state
type LoginModel struct {
	styles *styles.Styles
	client *api.Client
	width  int
	height int

	// Form inputs
	emailInput    textinput.Model
	passwordInput textinput.Model
	focusIndex    int

	// State
	loading      bool
	error        string
	authenticated bool
	user         *models.User
	token        string
}

// LoginSuccessMsg is sent when login succeeds
type LoginSuccessMsg struct {
	User  *models.User
	Token string
}

// LoginErrorMsg is sent when login fails
type LoginErrorMsg struct {
	Error string
}

// NewLoginModel creates a new login view
func NewLoginModel(client *api.Client, styles *styles.Styles) *LoginModel {
	emailInput := textinput.New()
	emailInput.Placeholder = "your.email@miles.com"
	emailInput.Focus()
	emailInput.CharLimit = 156
	emailInput.Width = 40

	passwordInput := textinput.New()
	passwordInput.Placeholder = "password"
	passwordInput.EchoMode = textinput.EchoPassword
	passwordInput.EchoCharacter = '•'
	passwordInput.CharLimit = 156
	passwordInput.Width = 40

	return &LoginModel{
		styles:        styles,
		client:        client,
		emailInput:    emailInput,
		passwordInput: passwordInput,
		focusIndex:    0,
	}
}

// Init initializes the login model
func (m *LoginModel) Init() tea.Cmd {
	return textinput.Blink
}

// Update handles messages for the login view
func (m *LoginModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		if m.loading {
			return m, nil
		}

		switch msg.String() {
		case "ctrl+c", "esc":
			return m, tea.Quit

		case "tab", "shift+tab", "up", "down":
			s := msg.String()
			if s == "up" || s == "shift+tab" {
				m.focusIndex--
			} else {
				m.focusIndex++
			}

			if m.focusIndex > 2 {
				m.focusIndex = 0
			} else if m.focusIndex < 0 {
				m.focusIndex = 2
			}

			m.updateFocus()
			return m, nil

		case "enter":
			if m.focusIndex == 2 { // Login button
				return m, m.login()
			}
			// Move to next field
			m.focusIndex++
			if m.focusIndex > 2 {
				m.focusIndex = 0
			}
			m.updateFocus()
			return m, nil
		}

	case LoginSuccessMsg:
		m.authenticated = true
		m.user = msg.User
		m.token = msg.Token
		m.loading = false
		m.error = ""
		return m, nil

	case LoginErrorMsg:
		m.error = msg.Error
		m.loading = false
		return m, nil
	}

	// Update inputs
	if m.focusIndex == 0 {
		m.emailInput, cmd = m.emailInput.Update(msg)
		return m, cmd
	} else if m.focusIndex == 1 {
		m.passwordInput, cmd = m.passwordInput.Update(msg)
		return m, cmd
	}

	return m, nil
}

// View renders the login view
func (m *LoginModel) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	var b strings.Builder

	// Title
	title := m.styles.Title.Render("Miles Booking System")
	subtitle := m.styles.Subtitle.Render("Terminal User Interface")

	b.WriteString("\n")
	b.WriteString(lipgloss.Place(m.width, 1, lipgloss.Center, lipgloss.Top, title))
	b.WriteString("\n")
	b.WriteString(lipgloss.Place(m.width, 1, lipgloss.Center, lipgloss.Top, subtitle))
	b.WriteString("\n\n")

	// Login form
	formStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(m.styles.Colors.BorderFocus).
		Padding(2, 4).
		Width(52)

	var form strings.Builder
	form.WriteString(m.styles.Heading.Render("Login"))
	form.WriteString("\n\n")

	// Email field
	emailLabel := m.styles.Text.Render("Email")
	if m.focusIndex == 0 {
		emailLabel = m.styles.TextBold.Foreground(m.styles.Colors.Primary).Render("Email")
	}
	form.WriteString(emailLabel + "\n")
	form.WriteString(m.emailInput.View() + "\n\n")

	// Password field
	passwordLabel := m.styles.Text.Render("Password")
	if m.focusIndex == 1 {
		passwordLabel = m.styles.TextBold.Foreground(m.styles.Colors.Primary).Render("Password")
	}
	form.WriteString(passwordLabel + "\n")
	form.WriteString(m.passwordInput.View() + "\n\n")

	// Login button
	button := m.styles.Button.Render("[ Login ]")
	if m.focusIndex == 2 {
		button = m.styles.ButtonActive.Render("[ Login ]")
	}
	if m.loading {
		button = m.styles.Button.Render("[ Logging in... ]")
	}
	form.WriteString(lipgloss.Place(44, 1, lipgloss.Center, lipgloss.Top, button))
	form.WriteString("\n")

	// Error message
	if m.error != "" {
		form.WriteString("\n")
		errorMsg := m.styles.TextError.Render("✗ " + m.error)
		form.WriteString(lipgloss.Place(44, 1, lipgloss.Center, lipgloss.Top, errorMsg))
	}

	formBox := formStyle.Render(form.String())
	b.WriteString(lipgloss.Place(m.width, m.height-10, lipgloss.Center, lipgloss.Top, formBox))
	b.WriteString("\n\n")

	// Help
	help := m.styles.Help.Render("Tab: Next field • Enter: Login • Ctrl+C: Quit")
	b.WriteString(lipgloss.Place(m.width, 1, lipgloss.Center, lipgloss.Top, help))

	// Test account hint
	hint := m.styles.TextMuted.Render("Test account: admin@miles.com / password123")
	b.WriteString("\n")
	b.WriteString(lipgloss.Place(m.width, 1, lipgloss.Center, lipgloss.Top, hint))

	return b.String()
}

// updateFocus updates the focus state of inputs
func (m *LoginModel) updateFocus() {
	if m.focusIndex == 0 {
		m.emailInput.Focus()
		m.passwordInput.Blur()
	} else if m.focusIndex == 1 {
		m.emailInput.Blur()
		m.passwordInput.Focus()
	} else {
		m.emailInput.Blur()
		m.passwordInput.Blur()
	}
}

// login performs the login API call
func (m *LoginModel) login() tea.Cmd {
	return func() tea.Msg {
		m.loading = true
		m.error = ""

		email := strings.TrimSpace(m.emailInput.Value())
		password := m.passwordInput.Value()

		// Validation
		if email == "" {
			return LoginErrorMsg{Error: "Email is required"}
		}
		if password == "" {
			return LoginErrorMsg{Error: "Password is required"}
		}

		// Call API
		response, err := m.client.Login(email, password)
		if err != nil {
			return LoginErrorMsg{Error: fmt.Sprintf("Login failed: %v", err)}
		}

		// Set token in client
		m.client.SetToken(response.Token)

		return LoginSuccessMsg{
			User:  &response.User,
			Token: response.Token,
		}
	}
}

// IsAuthenticated returns whether the user is authenticated
func (m *LoginModel) IsAuthenticated() bool {
	return m.authenticated
}

// GetUser returns the authenticated user
func (m *LoginModel) GetUser() *models.User {
	return m.user
}

// GetToken returns the authentication token
func (m *LoginModel) GetToken() string {
	return m.token
}
