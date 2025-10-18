#!/bin/bash

# Miles Booking API - Local Development Setup Script
# This script sets up the complete local development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup function
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Miles Room Booking API - Local Development Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # 1. Check prerequisites
    log_info "Checking prerequisites..."

    if ! command_exists docker; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    log_success "Docker is installed"

    if ! command_exists node; then
        log_error "Node.js is not installed. Please install Node.js 20+ first."
        exit 1
    fi
    log_success "Node.js is installed ($(node --version))"

    if ! command_exists npm; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    log_success "npm is installed ($(npm --version))"

    # 2. Check if Docker daemon is running
    log_info "Checking Docker daemon..."
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi
    log_success "Docker daemon is running"

    # 3. Install npm dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing npm dependencies..."
        npm install
        log_success "Dependencies installed"
    else
        log_success "Dependencies already installed"
    fi

    # 4. Setup environment variables
    log_info "Setting up environment variables..."
    if [ ! -f ".env" ]; then
        cp .env.example .env
        log_success ".env file created from .env.example"
    else
        log_warning ".env file already exists, skipping..."
    fi

    # Update DATABASE_URL in .env
    if [ -f ".env" ]; then
        # Check if DATABASE_URL needs updating
        if grep -q "DATABASE_URL.*localhost:5432/miles_booking" .env 2>/dev/null; then
            log_success "DATABASE_URL already configured"
        else
            # Backup existing .env
            cp .env .env.backup
            log_warning "Backed up existing .env to .env.backup"

            # Update or add DATABASE_URL
            if grep -q "^DATABASE_URL=" .env; then
                sed -i.tmp 's|^DATABASE_URL=.*|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/miles_booking?schema=public"|' .env
                rm -f .env.tmp
            else
                echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/miles_booking?schema=public"' >> .env
            fi
            log_success "DATABASE_URL configured"
        fi
    fi

    # 5. Start PostgreSQL with Docker Compose
    log_info "Starting PostgreSQL database..."

    # Check if container is already running
    if docker ps --format '{{.Names}}' | grep -q "^miles-booking-db$"; then
        log_warning "Database container is already running"
    else
        # Check if container exists but is stopped
        if docker ps -a --format '{{.Names}}' | grep -q "^miles-booking-db$"; then
            log_info "Starting existing database container..."
            docker start miles-booking-db
        else
            log_info "Creating and starting database container..."
            docker-compose up -d
        fi

        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        max_attempts=30
        attempt=0
        while [ $attempt -lt $max_attempts ]; do
            if docker exec miles-booking-db pg_isready -U postgres >/dev/null 2>&1; then
                break
            fi
            attempt=$((attempt + 1))
            sleep 1
            echo -n "."
        done
        echo ""

        if [ $attempt -eq $max_attempts ]; then
            log_error "Database failed to start within 30 seconds"
            exit 1
        fi

        log_success "Database is ready"
    fi

    # 6. Generate Prisma Client
    log_info "Generating Prisma Client..."
    npm run prisma:generate >/dev/null
    log_success "Prisma Client generated"

    # 7. Run database migrations
    log_info "Running database migrations..."

    # Check if migrations have been run
    if docker exec miles-booking-db psql -U postgres -d miles_booking -c "\dt" 2>/dev/null | grep -q "users"; then
        log_warning "Database tables already exist"

        # Ask if user wants to reset
        echo ""
        read -p "Do you want to reset the database? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Resetting database..."
            npx prisma migrate reset --force
            log_success "Database reset complete"
        else
            log_info "Skipping migrations..."
        fi
    else
        # Run migrations for the first time
        npx prisma migrate dev --name init
        log_success "Migrations applied"
    fi

    # 8. Seed the database
    log_info "Seeding database with sample data..."

    # Check if data already exists
    user_count=$(docker exec miles-booking-db psql -U postgres -d miles_booking -t -c "SELECT COUNT(*) FROM users" 2>/dev/null | tr -d ' ' || echo "0")

    if [ "$user_count" -gt "0" ]; then
        log_warning "Database already contains data ($user_count users)"

        echo ""
        read -p "Do you want to re-seed the database? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Re-seeding database..."
            npm run prisma:seed
            log_success "Database seeded"
        else
            log_info "Skipping seed..."
        fi
    else
        npm run prisma:seed
        log_success "Database seeded"
    fi

    # 9. Verify setup
    log_info "Verifying setup..."

    # Check database connection
    if docker exec miles-booking-db psql -U postgres -d miles_booking -c "SELECT 1" >/dev/null 2>&1; then
        log_success "Database connection verified"
    else
        log_error "Database connection failed"
        exit 1
    fi

    # Check tables exist
    table_count=$(docker exec miles-booking-db psql -U postgres -d miles_booking -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')
    if [ "$table_count" -gt "0" ]; then
        log_success "Database tables created ($table_count tables)"
    else
        log_error "No database tables found"
        exit 1
    fi

    # 10. Display summary
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📦 Database:         Running in Docker (port 5432)"
    echo "🗄️  Tables:          $table_count tables created"
    echo "👥 Sample users:     5 test accounts"
    echo "🏢 Sample data:      3 offices, 8 rooms, 2 bookings"
    echo ""
    echo "Test Accounts (password: password123):"
    echo "  • Admin:           admin@miles.com"
    echo "  • Manager (SF):    manager.sf@miles.com"
    echo "  • Manager (NY):    manager.ny@miles.com"
    echo "  • User:            john.doe@miles.com"
    echo "  • User:            jane.smith@miles.com"
    echo ""
    echo "Next Steps:"
    echo "  1. Start the development server:"
    echo "     ${BLUE}npm run dev${NC}"
    echo ""
    echo "  2. Test the API:"
    echo "     ${BLUE}curl http://localhost:3000/health${NC}"
    echo ""
    echo "  3. Open Prisma Studio (optional):"
    echo "     ${BLUE}npm run prisma:studio${NC}"
    echo ""
    echo "Useful Commands:"
    echo "  • Stop database:    ${BLUE}docker-compose stop${NC}"
    echo "  • Start database:   ${BLUE}docker-compose start${NC}"
    echo "  • View logs:        ${BLUE}docker-compose logs -f${NC}"
    echo "  • Reset database:   ${BLUE}npx prisma migrate reset${NC}"
    echo ""
}

# Run main function
main "$@"
