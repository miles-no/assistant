package commands

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile string
	apiURL  string
	token   string
	output  string
)

var rootCmd = &cobra.Command{
	Use:   "miles",
	Short: "Miles Booking CLI - Manage meeting room bookings from the terminal",
	Long: `Miles Booking CLI is a command-line interface for the Miles booking system.
It provides fast, scriptable access to locations, rooms, and bookings.

Features:
  - List and search meeting rooms
  - Create and cancel bookings
  - View booking calendars
  - Export data in multiple formats (table, JSON, CSV)
  - Scriptable for automation`,
	Version: "1.0.0",
}

// Execute runs the root command
func Execute() error {
	return rootCmd.Execute()
}

func init() {
	cobra.OnInitialize(initConfig)

	// Global flags
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.miles-cli.yaml)")
	rootCmd.PersistentFlags().StringVar(&apiURL, "api-url", "", "API base URL (env: API_URL)")
	rootCmd.PersistentFlags().StringVar(&token, "token", "", "authentication token (env: MILES_TOKEN)")
	rootCmd.PersistentFlags().StringVarP(&output, "output", "o", "table", "output format: table, json, csv")

	// Bind flags to viper
	viper.BindPFlag("api_url", rootCmd.PersistentFlags().Lookup("api-url"))
	viper.BindPFlag("token", rootCmd.PersistentFlags().Lookup("token"))

	// Add subcommands
	rootCmd.AddCommand(loginCmd)
	rootCmd.AddCommand(roomsCmd)
	rootCmd.AddCommand(bookCmd)
	rootCmd.AddCommand(bookingsCmd)
	rootCmd.AddCommand(cancelCmd)
}

func initConfig() {
	if cfgFile != "" {
		// Use config file from the flag
		viper.SetConfigFile(cfgFile)
	} else {
		// Find home directory
		home, err := os.UserHomeDir()
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

		// Search config in home directory with name ".miles-cli" (without extension)
		viper.AddConfigPath(home)
		viper.SetConfigType("yaml")
		viper.SetConfigName(".miles-cli")
	}

	// Environment variables override config file
	viper.SetEnvPrefix("MILES")
	viper.AutomaticEnv()

	// Read in config file if it exists
	if err := viper.ReadInConfig(); err == nil {
		fmt.Fprintln(os.Stderr, "Using config file:", viper.ConfigFileUsed())
	}

	// Set defaults
	viper.SetDefault("api_url", "http://localhost:3000")
}

// Helper function to get API URL
func getAPIURL() string {
	url := viper.GetString("api_url")
	if url == "" {
		url = "http://localhost:3000"
	}
	return url
}

// Helper function to get auth token
func getAuthToken() string {
	return viper.GetString("token")
}
