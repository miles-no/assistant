# Multi-stage build for IRIS
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript with Vite
RUN npm run build

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (need tsx to run TypeScript server, better-sqlite3 needs to compile)
RUN npm ci

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy TypeScript server files and config
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/llm-providers.ts ./
COPY --from=builder /app/database.ts ./
COPY --from=builder /app/fuzzy-match.ts ./
COPY --from=builder /app/session-context.ts ./
COPY --from=builder /app/tsconfig.json ./

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server with tsx (TypeScript executor)
CMD ["npx", "tsx", "server.ts"]
