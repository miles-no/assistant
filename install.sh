#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default install location
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Miles Booking System - CLI & TUI Installer${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}✗ Go is not installed${NC}"
    echo -e "${YELLOW}  Please install Go 1.24.3 or later from https://go.dev/dl/${NC}"
    exit 1
fi

GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
echo -e "${GREEN}✓ Go ${GO_VERSION} found${NC}"

# Check if oapi-codegen is installed
if ! command -v oapi-codegen &> /dev/null; then
    echo -e "${YELLOW}⚠ oapi-codegen not found, installing...${NC}"
    go install github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@latest
    echo -e "${GREEN}✓ oapi-codegen installed${NC}"
else
    echo -e "${GREEN}✓ oapi-codegen found${NC}"
fi

echo ""

# Create install directory if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Creating install directory: ${INSTALL_DIR}${NC}"
    mkdir -p "$INSTALL_DIR"
fi

# Function to build and install a component
install_component() {
    local name=$1
    local dir=$2
    local binary=$3
    local make_target=$4

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Installing ${name}...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    cd "$dir"

    # Generate types from OpenAPI
    echo -e "${YELLOW}→ Generating type-safe code from OpenAPI spec...${NC}"
    make generate

    # Build
    echo -e "${YELLOW}→ Building ${name}...${NC}"
    make build

    # Install
    echo -e "${YELLOW}→ Installing to ${INSTALL_DIR}/${binary}${NC}"
    cp "bin/${binary}" "${INSTALL_DIR}/${binary}"
    chmod +x "${INSTALL_DIR}/${binary}"

    echo -e "${GREEN}✓ ${name} installed successfully${NC}"
    echo ""

    cd - > /dev/null
}

# Install TUI
install_component "TUI" "tui" "miles-booking" "build"

# Install CLI
install_component "CLI" "cli" "miles" "build"

# Check if install directory is in PATH
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Installed to: ${GREEN}${INSTALL_DIR}${NC}"
echo ""
echo -e "Binaries:"
echo -e "  • ${GREEN}miles-booking${NC} - Terminal UI"
echo -e "  • ${GREEN}miles${NC}         - Command-line interface"
echo ""

if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo -e "${YELLOW}⚠ Warning: ${INSTALL_DIR} is not in your PATH${NC}"
    echo ""
    echo -e "Add it to your PATH by running:"
    echo ""

    # Detect shell and provide appropriate instructions
    if [ -n "$BASH_VERSION" ]; then
        echo -e "  ${BLUE}echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.bashrc${NC}"
        echo -e "  ${BLUE}source ~/.bashrc${NC}"
    elif [ -n "$ZSH_VERSION" ]; then
        echo -e "  ${BLUE}echo 'export PATH=\"\$PATH:${INSTALL_DIR}\"' >> ~/.zshrc${NC}"
        echo -e "  ${BLUE}source ~/.zshrc${NC}"
    else
        echo -e "  ${BLUE}export PATH=\"\$PATH:${INSTALL_DIR}\"${NC}"
    fi
    echo ""
    echo -e "Or run directly: ${BLUE}${INSTALL_DIR}/miles --help${NC}"
else
    echo -e "${GREEN}✓ Install directory is in your PATH${NC}"
    echo ""
    echo -e "You can now run:"
    echo -e "  ${BLUE}miles-booking${NC}     # Start the TUI"
    echo -e "  ${BLUE}miles --help${NC}      # View CLI help"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Quick Start:"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "1. Start the API server:"
echo -e "   ${BLUE}cd api && npm run dev${NC}"
echo ""
echo -e "2. Use the TUI (interactive):"
echo -e "   ${BLUE}miles-booking${NC}"
echo ""
echo -e "3. Or use the CLI (scriptable):"
echo -e "   ${BLUE}miles login user@example.com${NC}"
echo -e "   ${BLUE}miles rooms${NC}"
echo -e "   ${BLUE}miles book -r ROOM123 -s \"2025-10-19 14:00\" -e \"15:00\" -t \"Meeting\"${NC}"
echo ""
echo -e "${GREEN}Happy booking! 🎉${NC}"
echo ""
