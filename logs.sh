#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p logs

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Miles Booking System - Logs${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Select which logs to view:${NC}"
echo -e "  ${GREEN}1)${NC} API logs"
echo -e "  ${GREEN}2)${NC} Chat App logs"
echo -e "  ${GREEN}3)${NC} Both (split screen)"
echo -e "  ${GREEN}4)${NC} Docker logs"
echo ""
read -p "Choice (1-4): " choice

case $choice in
    1)
        echo -e "${BLUE}Showing API logs (Ctrl+C to exit)...${NC}"
        echo ""
        tail -f logs/api.log
        ;;
    2)
        echo -e "${BLUE}Showing Chat App logs (Ctrl+C to exit)...${NC}"
        echo ""
        tail -f logs/chat-app.log
        ;;
    3)
        echo -e "${BLUE}Showing both logs (Ctrl+C to exit)...${NC}"
        echo ""
        # Use multitail if available, otherwise fall back to simple tail
        if command -v multitail > /dev/null 2>&1; then
            multitail logs/api.log logs/chat-app.log
        else
            # Simple split view
            tail -f logs/api.log logs/chat-app.log
        fi
        ;;
    4)
        echo -e "${BLUE}Showing Docker logs (Ctrl+C to exit)...${NC}"
        echo ""
        docker-compose logs -f
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
