.PHONY: help api tui dev docker-up docker-down docker-logs clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

api: ## Start API development server
	@echo "Starting API server..."
	@cd api && npm run dev

tui: ## Build and run TUI
	@echo "Building TUI..."
	@cd tui && make run

dev: ## Start both API and TUI in separate terminals (requires tmux)
	@if command -v tmux >/dev/null 2>&1; then \
		tmux new-session -d -s miles 'cd api && npm run dev'; \
		tmux split-window -h -t miles 'sleep 3 && cd tui && make run'; \
		tmux attach -t miles; \
	else \
		echo "tmux not found. Please install tmux or run 'make api' and 'make tui' in separate terminals."; \
	fi

docker-up: ## Start all services with Docker Compose
	@echo "Starting services..."
	@docker-compose up -d
	@echo "Services started!"
	@echo "API: http://localhost:3000"
	@echo "API Docs: http://localhost:3000/api-docs"

docker-down: ## Stop all Docker services
	@echo "Stopping services..."
	@docker-compose down

docker-logs: ## View Docker logs
	@docker-compose logs -f

setup: ## Run initial setup
	@echo "Running setup..."
	@./setup.sh

clean: ## Clean build artifacts
	@echo "Cleaning..."
	@cd api && rm -rf node_modules dist
	@cd tui && make clean
	@echo "Clean complete!"

.DEFAULT_GOAL := help
