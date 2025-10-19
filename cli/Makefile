.PHONY: build run install clean test generate help

# Generate type-safe Go code from OpenAPI spec
generate:
	@echo "Generating type-safe Go code from OpenAPI spec..."
	@oapi-codegen -config .oapi-codegen.yaml -o internal/generated/types.gen.go ../api/openapi.yaml
	@echo "✓ Generated internal/generated/types.gen.go"

# Build the application
build:
	@echo "Building CLI..."
	@go build -o bin/miles ./cmd/miles
	@echo "✓ Built bin/miles"

# Install to system
install:
	@echo "Installing miles CLI..."
	@go install ./cmd/miles
	@echo "✓ Installed 'miles' to $(shell go env GOPATH)/bin"

# Run the application
run:
	@go run ./cmd/miles/main.go

# Run tests
test:
	@go test -v ./...

# Clean build artifacts
clean:
	@rm -rf bin/
	@echo "✓ Cleaned build artifacts"

# Run with tidy
tidy:
	@go mod tidy
	@echo "✓ Tidied go.mod"

# Generate shell completions
completions:
	@mkdir -p completions
	@go run ./cmd/miles completion bash > completions/miles.bash
	@go run ./cmd/miles completion zsh > completions/miles.zsh
	@go run ./cmd/miles completion fish > completions/miles.fish
	@echo "✓ Generated shell completions in completions/"

# Help
help:
	@echo "Available targets:"
	@echo "  build       - Build the CLI binary"
	@echo "  install     - Install CLI to system"
	@echo "  run         - Run the CLI"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean build artifacts"
	@echo "  tidy        - Tidy go.mod"
	@echo "  completions - Generate shell completions"
