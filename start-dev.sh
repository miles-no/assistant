#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Miles Booking System - Development Startup${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to wait for a service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for $name to be ready...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

# Function to wait for PostgreSQL using Docker health check
wait_for_postgres() {
    local container_name=$1
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
    while [ $attempt -le $max_attempts ]; do
        local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null)
        if [ "$health_status" = "healthy" ]; then
            echo -e "${GREEN}✓ PostgreSQL is ready!${NC}"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ PostgreSQL failed to start${NC}"
    return 1
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Ollama is running
echo -e "${BLUE}1. Checking Ollama...${NC}"
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Ollama is not running.${NC}"
    echo -e "${YELLOW}   Please start Ollama: ollama serve${NC}"
    echo -e "${YELLOW}   Or skip chat-app for now.${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ Ollama is running${NC}"

    # Check if llama3.2 model is installed
    if ! ollama list 2>/dev/null | grep -q "llama3.2"; then
        echo -e "${YELLOW}⚠️  llama3.2 model not found.${NC}"
        echo -e "${YELLOW}   Pulling model... (this may take a few minutes)${NC}"
        ollama pull llama3.2
    else
        echo -e "${GREEN}✓ llama3.2 model is installed${NC}"
    fi
fi
echo ""

# Start PostgreSQL in Docker
echo -e "${BLUE}2. Starting PostgreSQL database...${NC}"
docker-compose up -d postgres
if ! wait_for_postgres "miles-booking-db"; then
    echo -e "${RED}Failed to start database${NC}"
    exit 1
fi

# Check if database needs to be seeded
echo -e "${BLUE}3. Checking database...${NC}"
cd api
if ! npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" > /dev/null 2>&1; then
    echo -e "${YELLOW}Database is empty. Running migrations and seed...${NC}"
    npx prisma migrate reset --force --skip-generate > /dev/null 2>&1
    echo -e "${GREEN}✓ Database migrated and seeded${NC}"
else
    echo -e "${GREEN}✓ Database is ready${NC}"
fi
cd ..
echo ""

# Check if API port is already in use
if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use.${NC}"
    echo -e "${YELLOW}   Stopping existing process...${NC}"
    lsof -ti :3000 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Check if chat-app port is already in use
if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use.${NC}"
    echo -e "${YELLOW}   Stopping existing process...${NC}"
    lsof -ti :3001 | xargs kill -9 2>/dev/null
    sleep 2
fi

# Start API
echo -e "${BLUE}4. Starting API server...${NC}"
cd api
npm run dev > ../logs/api.log 2>&1 &
API_PID=$!
echo $API_PID > ../logs/api.pid
cd ..

if ! wait_for_service "http://localhost:3000/health" "API"; then
    echo -e "${RED}Failed to start API${NC}"
    echo -e "${YELLOW}Check logs: tail -f logs/api.log${NC}"
    exit 1
fi
echo ""

# Start Chat App
echo -e "${BLUE}5. Starting Chat Assistant...${NC}"
cd chat-app
npm start > ../logs/chat-app.log 2>&1 &
CHAT_PID=$!
echo $CHAT_PID > ../logs/chat-app.pid
cd ..

if ! wait_for_service "http://localhost:3001/health" "Chat App"; then
    echo -e "${RED}Failed to start Chat App${NC}"
    echo -e "${YELLOW}Check logs: tail -f logs/chat-app.log${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo -e "  • PostgreSQL: ${GREEN}localhost:5433${NC}"
echo -e "  • API:        ${GREEN}http://localhost:3000${NC}"
echo -e "  • API Docs:   ${GREEN}http://localhost:3000/api-docs${NC}"
echo -e "  • Chat App:   ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "${BLUE}📝 Process IDs:${NC}"
echo -e "  • API:        ${YELLOW}$API_PID${NC}"
echo -e "  • Chat App:   ${YELLOW}$CHAT_PID${NC}"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo -e "  • View logs:  ${YELLOW}./logs.sh${NC}"
echo -e "  • Stop all:   ${YELLOW}./stop-dev.sh${NC}"
echo -e "  • Check status: ${YELLOW}./status.sh${NC}"
echo ""
echo -e "${BLUE}🎉 Ready to use! Open http://localhost:3001 in your browser${NC}"
echo ""
