.PHONY: generate build run test clean

# Generate type-safe Go code from OpenAPI spec
generate:
	@echo "Generating type-safe Go code from OpenAPI spec..."
	@oapi-codegen -config .oapi-codegen.yaml -o internal/generated/types.gen.go ../api/openapi.yaml
	@echo "✓ Generated internal/generated/types.gen.go"

# Build the application
build:
	@echo "Building..."
	@go build -o bin/miles-booking ./cmd/miles-booking
	@echo "✓ Built bin/miles-booking"

# Run the application
run:
	@go run ./cmd/miles-booking/main.go

# Run tests
test:
	@go test -v ./...

# Clean build artifacts
clean:
	@rm -rf bin/
	@echo "✓ Cleaned build artifacts"

# Install required tools
install-tools:
	@echo "Installing oapi-codegen..."
	@go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
	@echo "✓ Installed oapi-codegen"

# Help
help:
	@echo "Available targets:"
	@echo "  generate      - Generate type-safe Go code from OpenAPI spec"
	@echo "  build         - Build the application"
	@echo "  run           - Run the application"
	@echo "  test          - Run tests"
	@echo "  clean         - Clean build artifacts"
	@echo "  install-tools - Install required code generation tools"
