package utils

import (
	"fmt"
	"strings"
	"time"
)

// FormatDate formats a date in a human-readable format
func FormatDate(t time.Time) string {
	return t.Format("Mon, Jan 2, 2006")
}

// FormatTime formats a time in a human-readable format
func FormatTime(t time.Time) string {
	return t.Format("15:04")
}

// FormatDateTime formats a date and time in a human-readable format
func FormatDateTime(t time.Time) string {
	return t.Format("Mon, Jan 2, 2006 at 15:04")
}

// FormatDuration formats a duration between two times
func FormatDuration(start, end time.Time) string {
	duration := end.Sub(start)
	hours := int(duration.Hours())
	minutes := int(duration.Minutes()) % 60

	if hours > 0 && minutes > 0 {
		return fmt.Sprintf("%dh %dm", hours, minutes)
	} else if hours > 0 {
		return fmt.Sprintf("%dh", hours)
	}
	return fmt.Sprintf("%dm", minutes)
}

// TruncateString truncates a string to a maximum length and adds ellipsis
func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return "..."
	}
	return s[:maxLen-3] + "..."
}

// PadRight pads a string to the right with spaces
func PadRight(s string, length int) string {
	if len(s) >= length {
		return s
	}
	return s + strings.Repeat(" ", length-len(s))
}

// PadLeft pads a string to the left with spaces
func PadLeft(s string, length int) string {
	if len(s) >= length {
		return s
	}
	return strings.Repeat(" ", length-len(s)) + s
}

// Center centers a string within a given width
func Center(s string, width int) string {
	if len(s) >= width {
		return s
	}
	leftPad := (width - len(s)) / 2
	rightPad := width - len(s) - leftPad
	return strings.Repeat(" ", leftPad) + s + strings.Repeat(" ", rightPad)
}

// IsToday checks if a given time is today
func IsToday(t time.Time) bool {
	now := time.Now()
	return t.Year() == now.Year() && t.YearDay() == now.YearDay()
}

// IsPast checks if a given time is in the past
func IsPast(t time.Time) bool {
	return t.Before(time.Now())
}

// IsFuture checks if a given time is in the future
func IsFuture(t time.Time) bool {
	return t.After(time.Now())
}

// DaysUntil calculates the number of days until a given time
func DaysUntil(t time.Time) int {
	now := time.Now()
	duration := t.Sub(now)
	return int(duration.Hours() / 24)
}

// HumanizeTime returns a human-readable relative time string
func HumanizeTime(t time.Time) string {
	now := time.Now()
	duration := t.Sub(now)

	if duration < 0 {
		duration = -duration
		if duration < time.Minute {
			return "just now"
		} else if duration < time.Hour {
			minutes := int(duration.Minutes())
			if minutes == 1 {
				return "1 minute ago"
			}
			return fmt.Sprintf("%d minutes ago", minutes)
		} else if duration < 24*time.Hour {
			hours := int(duration.Hours())
			if hours == 1 {
				return "1 hour ago"
			}
			return fmt.Sprintf("%d hours ago", hours)
		} else {
			days := int(duration.Hours() / 24)
			if days == 1 {
				return "yesterday"
			}
			return fmt.Sprintf("%d days ago", days)
		}
	}

	// Future times
	if duration < time.Minute {
		return "in a moment"
	} else if duration < time.Hour {
		minutes := int(duration.Minutes())
		if minutes == 1 {
			return "in 1 minute"
		}
		return fmt.Sprintf("in %d minutes", minutes)
	} else if duration < 24*time.Hour {
		hours := int(duration.Hours())
		if hours == 1 {
			return "in 1 hour"
		}
		return fmt.Sprintf("in %d hours", hours)
	} else {
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "tomorrow"
		}
		return fmt.Sprintf("in %d days", days)
	}
}

// Contains checks if a slice contains a string
func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// Filter filters a slice based on a predicate function
func Filter[T any](slice []T, predicate func(T) bool) []T {
	result := make([]T, 0)
	for _, item := range slice {
		if predicate(item) {
			result = append(result, item)
		}
	}
	return result
}

// Map applies a function to each element of a slice
func Map[T, U any](slice []T, fn func(T) U) []U {
	result := make([]U, len(slice))
	for i, item := range slice {
		result[i] = fn(item)
	}
	return result
}
