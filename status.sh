#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Miles Booking System - Status${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Check Database
echo -e "${BLUE}📊 Database (PostgreSQL):${NC}"
if docker ps | grep -q miles-booking-db; then
    if docker ps | grep miles-booking-db | grep -q "healthy"; then
        echo -e "  Status: ${GREEN}✓ Running (healthy)${NC}"
        echo -e "  Port:   ${GREEN}5433${NC}"
    else
        echo -e "  Status: ${YELLOW}⚠️  Running (not healthy)${NC}"
    fi
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
fi
echo ""

# Check API
echo -e "${BLUE}🔧 API Server:${NC}"
if lsof -ti :3000 > /dev/null 2>&1; then
    PID=$(lsof -ti :3000)
    echo -e "  Status: ${GREEN}✓ Running${NC}"
    echo -e "  PID:    ${GREEN}$PID${NC}"
    echo -e "  Port:   ${GREEN}3000${NC}"
    echo -e "  URL:    ${GREEN}http://localhost:3000${NC}"

    # Check if responding
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "  Health: ${GREEN}✓ Responding${NC}"
    else
        echo -e "  Health: ${RED}✗ Not responding${NC}"
    fi
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
fi
echo ""

# Check Chat App
echo -e "${BLUE}💬 Chat Assistant:${NC}"
if lsof -ti :3001 > /dev/null 2>&1; then
    PID=$(lsof -ti :3001)
    echo -e "  Status: ${GREEN}✓ Running${NC}"
    echo -e "  PID:    ${GREEN}$PID${NC}"
    echo -e "  Port:   ${GREEN}3001${NC}"
    echo -e "  URL:    ${GREEN}http://localhost:3001${NC}"

    # Check if responding
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "  Health: ${GREEN}✓ Responding${NC}"
    else
        echo -e "  Health: ${RED}✗ Not responding${NC}"
    fi
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
fi
echo ""

# Check Ollama
echo -e "${BLUE}🦙 Ollama:${NC}"
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "  Status: ${GREEN}✓ Running${NC}"
    echo -e "  Port:   ${GREEN}11434${NC}"

    # Check for llama3.2 model
    if ollama list 2>/dev/null | grep -q "llama3.2"; then
        echo -e "  Model:  ${GREEN}✓ llama3.2 installed${NC}"
    else
        echo -e "  Model:  ${YELLOW}⚠️  llama3.2 not installed${NC}"
        echo -e "          ${YELLOW}Run: ollama pull llama3.2${NC}"
    fi
else
    echo -e "  Status: ${RED}✗ Not running${NC}"
    echo -e "  ${YELLOW}Start with: ollama serve${NC}"
fi
echo ""

# Check MCP
echo -e "${BLUE}🔗 MCP Endpoints:${NC}"
if curl -s http://localhost:3000/api/mcp/info > /dev/null 2>&1; then
    echo -e "  Status: ${GREEN}✓ Accessible${NC}"
    echo -e "  URL:    ${GREEN}http://localhost:3000/api/mcp${NC}"
else
    echo -e "  Status: ${RED}✗ Not accessible${NC}"
fi
echo ""

# Log files
echo -e "${BLUE}📄 Log Files:${NC}"
if [ -d logs ]; then
    if [ -f logs/api.log ]; then
        SIZE=$(du -h logs/api.log | cut -f1)
        echo -e "  API:      ${GREEN}logs/api.log${NC} ($SIZE)"
    fi
    if [ -f logs/chat-app.log ]; then
        SIZE=$(du -h logs/chat-app.log | cut -f1)
        echo -e "  Chat App: ${GREEN}logs/chat-app.log${NC} ($SIZE)"
    fi
else
    echo -e "  ${YELLOW}No logs directory${NC}"
fi
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
