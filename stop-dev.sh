#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Stopping Miles Booking System${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Stop API
if [ -f logs/api.pid ]; then
    API_PID=$(cat logs/api.pid)
    echo -e "${YELLOW}Stopping API (PID: $API_PID)...${NC}"
    kill $API_PID 2>/dev/null
    rm logs/api.pid
    echo -e "${GREEN}✓ API stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No API PID file found${NC}"
    # Try to kill any process on port 3000
    if lsof -ti :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping process on port 3000...${NC}"
        lsof -ti :3000 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Port 3000 cleared${NC}"
    fi
fi

# Stop Chat App
if [ -f logs/chat-app.pid ]; then
    CHAT_PID=$(cat logs/chat-app.pid)
    echo -e "${YELLOW}Stopping Chat App (PID: $CHAT_PID)...${NC}"
    kill $CHAT_PID 2>/dev/null
    rm logs/chat-app.pid
    echo -e "${GREEN}✓ Chat App stopped${NC}"
else
    echo -e "${YELLOW}⚠️  No Chat App PID file found${NC}"
    # Try to kill any process on port 3001
    if lsof -ti :3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping process on port 3001...${NC}"
        lsof -ti :3001 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Port 3001 cleared${NC}"
    fi
fi

# Stop Docker containers
echo -e "${YELLOW}Stopping Docker containers...${NC}"
docker-compose stop > /dev/null 2>&1
echo -e "${GREEN}✓ Docker containers stopped${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All services stopped${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
