package main

import (
	"os"

	"github.com/miles/booking-cli/internal/commands"
)

func main() {
	if err := commands.Execute(); err != nil {
		os.Exit(1)
	}
}
