FROM node:20-alpine

# Install build dependencies for native modules and OpenSSL for Prisma
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev \
    openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (will compile native modules for Alpine Linux)
RUN npm ci --verbose

# Generate Prisma Client
RUN npx prisma generate

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
