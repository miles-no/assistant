package commands

import (
	"fmt"
	"os"
	"syscall"

	"github.com/miles/booking-cli/internal/config"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"golang.org/x/term"
)

var loginCmd = &cobra.Command{
	Use:   "login [email]",
	Short: "Authenticate with the Miles booking system",
	Long: `Login to the Miles booking system and save your authentication token.
The token will be stored in your config file (~/.miles-cli.yaml) for future use.

Examples:
  miles login user@example.com
  miles login --email user@example.com`,
	Args: cobra.MaximumNArgs(1),
	RunE: runLogin,
}

var loginEmail string

func init() {
	loginCmd.Flags().StringVar(&loginEmail, "email", "", "email address")
}

func runLogin(cmd *cobra.Command, args []string) error {
	// Get email from args or flag
	email := loginEmail
	if len(args) > 0 {
		email = args[0]
	}

	// Prompt for email if not provided
	if email == "" {
		fmt.Print("Email: ")
		fmt.Scanln(&email)
	}

	// Prompt for password (hidden input)
	fmt.Print("Password: ")
	passwordBytes, err := term.ReadPassword(int(syscall.Stdin))
	fmt.Println() // New line after password input
	if err != nil {
		return fmt.Errorf("failed to read password: %w", err)
	}
	password := string(passwordBytes)

	// Create API client
	client := config.NewClient(getAPIURL(), "")

	// Attempt login
	result, err := client.Login(email, password)
	if err != nil {
		return fmt.Errorf("login failed: %w", err)
	}

	// Save token to config
	viper.Set("token", result.Token)

	// Get or create config file
	configFile := viper.ConfigFileUsed()
	if configFile == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("failed to get home directory: %w", err)
		}
		configFile = home + "/.miles-cli.yaml"
	}

	if err := viper.WriteConfigAs(configFile); err != nil {
		return fmt.Errorf("failed to save token: %w", err)
	}

	fmt.Printf("✓ Login successful!\n")
	fmt.Printf("✓ Token saved to %s\n", configFile)
	if result.User != nil {
		name := ""
		if result.User.FirstName != nil {
			name = *result.User.FirstName
		}
		if name != "" {
			fmt.Printf("✓ Welcome, %s\n", name)
		}
	}

	return nil
}
