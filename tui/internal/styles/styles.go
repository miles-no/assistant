package styles

import (
	"github.com/charmbracelet/lipgloss"
)

// Colors defines the color palette
type Colors struct {
	// Primary brand colors
	Primary   lipgloss.Color
	Secondary lipgloss.Color
	Accent    lipgloss.Color

	// Status colors
	Success lipgloss.Color
	Warning lipgloss.Color
	Error   lipgloss.Color
	Info    lipgloss.Color

	// Text colors
	Text       lipgloss.Color
	TextMuted  lipgloss.Color
	TextDim    lipgloss.Color
	TextBright lipgloss.Color

	// Background colors
	Background       lipgloss.Color
	BackgroundAlt    lipgloss.Color
	BackgroundActive lipgloss.Color

	// Border colors
	Border       lipgloss.Color
	BorderActive lipgloss.Color
	BorderFocus  lipgloss.Color
}

// Styles holds all application styles
type Styles struct {
	Colors *Colors

	// Typography
	Title       lipgloss.Style
	Subtitle    lipgloss.Style
	Heading     lipgloss.Style
	Text        lipgloss.Style
	TextMuted   lipgloss.Style
	TextDim     lipgloss.Style
	TextBold    lipgloss.Style
	TextSuccess lipgloss.Style
	TextWarning lipgloss.Style
	TextError   lipgloss.Style
	TextInfo    lipgloss.Style

	// Layout
	Container lipgloss.Style
	Box       lipgloss.Style
	Panel     lipgloss.Style
	Card      lipgloss.Style

	// Interactive
	Button       lipgloss.Style
	ButtonActive lipgloss.Style
	Input        lipgloss.Style
	InputFocused lipgloss.Style

	// Navigation
	Tab       lipgloss.Style
	TabActive lipgloss.Style
	MenuItem  lipgloss.Style
	MenuActive lipgloss.Style

	// Status
	Badge        lipgloss.Style
	BadgeSuccess lipgloss.Style
	BadgeWarning lipgloss.Style
	BadgeError   lipgloss.Style
	BadgeInfo    lipgloss.Style

	// Special
	Help      lipgloss.Style
	StatusBar lipgloss.Style
	Header    lipgloss.Style
	Footer    lipgloss.Style
}

// DefaultColors returns the default color palette
func DefaultColors() *Colors {
	return &Colors{
		// Primary colors - Miles brand-inspired
		Primary:   lipgloss.Color("#0066CC"), // Blue
		Secondary: lipgloss.Color("#6B7280"), // Gray
		Accent:    lipgloss.Color("#8B5CF6"), // Purple

		// Status colors
		Success: lipgloss.Color("#10B981"), // Green
		Warning: lipgloss.Color("#F59E0B"), // Amber
		Error:   lipgloss.Color("#EF4444"), // Red
		Info:    lipgloss.Color("#3B82F6"), // Light Blue

		// Text colors
		Text:       lipgloss.Color("#F3F4F6"), // Light gray
		TextMuted:  lipgloss.Color("#9CA3AF"), // Medium gray
		TextDim:    lipgloss.Color("#6B7280"), // Dark gray
		TextBright: lipgloss.Color("#FFFFFF"), // White

		// Background colors
		Background:       lipgloss.Color("#1F2937"), // Dark
		BackgroundAlt:    lipgloss.Color("#374151"), // Slightly lighter
		BackgroundActive: lipgloss.Color("#4B5563"), // Active state

		// Border colors
		Border:       lipgloss.Color("#4B5563"), // Gray
		BorderActive: lipgloss.Color("#6B7280"), // Lighter gray
		BorderFocus:  lipgloss.Color("#0066CC"), // Primary blue
	}
}

// DefaultStyles returns the default application styles
func DefaultStyles() *Styles {
	colors := DefaultColors()

	return &Styles{
		Colors: colors,

		// Typography
		Title: lipgloss.NewStyle().
			Foreground(colors.Primary).
			Bold(true).
			Padding(1, 2),

		Subtitle: lipgloss.NewStyle().
			Foreground(colors.TextMuted).
			Padding(0, 2),

		Heading: lipgloss.NewStyle().
			Foreground(colors.Text).
			Bold(true).
			MarginTop(1).
			MarginBottom(1),

		Text: lipgloss.NewStyle().
			Foreground(colors.Text),

		TextMuted: lipgloss.NewStyle().
			Foreground(colors.TextMuted),

		TextDim: lipgloss.NewStyle().
			Foreground(colors.TextDim),

		TextBold: lipgloss.NewStyle().
			Foreground(colors.Text).
			Bold(true),

		TextSuccess: lipgloss.NewStyle().
			Foreground(colors.Success),

		TextWarning: lipgloss.NewStyle().
			Foreground(colors.Warning),

		TextError: lipgloss.NewStyle().
			Foreground(colors.Error),

		TextInfo: lipgloss.NewStyle().
			Foreground(colors.Info),

		// Layout
		Container: lipgloss.NewStyle().
			Padding(1, 2),

		Box: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colors.Border).
			Padding(1, 2),

		Panel: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colors.Border).
			Padding(1, 2).
			MarginBottom(1),

		Card: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colors.Border).
			Padding(1, 2).
			Width(40),

		// Interactive
		Button: lipgloss.NewStyle().
			Foreground(colors.Text).
			Background(colors.BackgroundAlt).
			Padding(0, 3).
			Margin(0, 1),

		ButtonActive: lipgloss.NewStyle().
			Foreground(colors.TextBright).
			Background(colors.Primary).
			Bold(true).
			Padding(0, 3).
			Margin(0, 1),

		Input: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colors.Border).
			Padding(0, 1).
			Width(40),

		InputFocused: lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colors.BorderFocus).
			Padding(0, 1).
			Width(40),

		// Navigation
		Tab: lipgloss.NewStyle().
			Foreground(colors.TextMuted).
			Padding(0, 2),

		TabActive: lipgloss.NewStyle().
			Foreground(colors.Primary).
			Bold(true).
			Padding(0, 2).
			BorderBottom(true).
			BorderForeground(colors.Primary),

		MenuItem: lipgloss.NewStyle().
			Foreground(colors.Text).
			Padding(0, 2),

		MenuActive: lipgloss.NewStyle().
			Foreground(colors.Primary).
			Background(colors.BackgroundActive).
			Bold(true).
			Padding(0, 2),

		// Status badges
		Badge: lipgloss.NewStyle().
			Foreground(colors.Text).
			Background(colors.BackgroundAlt).
			Padding(0, 1).
			Margin(0, 1),

		BadgeSuccess: lipgloss.NewStyle().
			Foreground(colors.TextBright).
			Background(colors.Success).
			Bold(true).
			Padding(0, 1).
			Margin(0, 1),

		BadgeWarning: lipgloss.NewStyle().
			Foreground(colors.TextBright).
			Background(colors.Warning).
			Bold(true).
			Padding(0, 1).
			Margin(0, 1),

		BadgeError: lipgloss.NewStyle().
			Foreground(colors.TextBright).
			Background(colors.Error).
			Bold(true).
			Padding(0, 1).
			Margin(0, 1),

		BadgeInfo: lipgloss.NewStyle().
			Foreground(colors.TextBright).
			Background(colors.Info).
			Bold(true).
			Padding(0, 1).
			Margin(0, 1),

		// Special
		Help: lipgloss.NewStyle().
			Foreground(colors.TextDim).
			Padding(1, 0),

		StatusBar: lipgloss.NewStyle().
			Foreground(colors.TextMuted).
			Background(colors.BackgroundAlt).
			Padding(0, 1),

		Header: lipgloss.NewStyle().
			Foreground(colors.Text).
			BorderBottom(true).
			BorderForeground(colors.Border).
			Padding(1, 2).
			MarginBottom(1),

		Footer: lipgloss.NewStyle().
			Foreground(colors.TextMuted).
			BorderTop(true).
			BorderForeground(colors.Border).
			Padding(1, 2).
			MarginTop(1),
	}
}
