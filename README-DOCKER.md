# Miles Booking Platform - Docker Setup

Complete Docker setup for running all Miles Booking services with a unified nginx reverse proxy.

## Architecture

```
                    ┌─────────────────┐
                    │  Nginx Proxy    │
                    │   (Port 80)     │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
       ┌────▼────┐      ┌───▼────┐      ┌───▼────┐
       │   Web   │      │  Chat  │      │  IRIS  │
       │  :3003  │      │  :3001 │      │  :3002 │
       └─────────┘      └────┬───┘      └────┬───┘
                             │                │
                        ┌────▼────────────────▼────┐
                        │      API Backend         │
                        │        :3000             │
                        └────────────┬─────────────┘
                                     │
                        ┌────────────▼─────────────┐
                        │   PostgreSQL Database    │
                        │        :5432             │
                        └──────────────────────────┘
```

## Services

| Service   | Internal Port | External Port | URL                        |
|-----------|--------------|---------------|----------------------------|
| Nginx     | 80           | 80            | http://localhost           |
| Web       | 80           | 3003          | http://localhost:3003      |
| API       | 3000         | 3000          | http://localhost:3000/api  |
| Chat      | 3001         | 3001          | http://localhost:3001      |
| IRIS      | 3002         | 3002          | http://localhost:3002      |
| Postgres  | 5432         | 5433          | localhost:5433             |

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- For LLM features (Chat/IRIS): Ollama running locally or API keys set

### 1. Environment Setup

Create a `.env` file in the root directory (optional, has defaults):

```bash
# JWT Secret for API authentication
JWT_SECRET=your-super-secret-jwt-key-change-this

# LLM Provider (ollama, openai, or anthropic)
LLM_PROVIDER=ollama

# Ollama Configuration (if using local Ollama)
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini

# Anthropic Configuration (if using Claude)
ANTHROPIC_API_KEY=your-anthropic-key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### 2. Build and Start All Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api
docker-compose logs -f web
```

### 3. Access the Platform

**Via Nginx Reverse Proxy (recommended):**
- Web Frontend: http://localhost/
- API Documentation: http://localhost/api/docs
- Chat Interface: http://localhost/chat/
- IRIS Terminal: http://localhost/iris/

**Direct Service Access:**
- Web: http://localhost:3003
- API: http://localhost:3000/api
- Chat: http://localhost:3001
- IRIS: http://localhost:3002
- Database: postgresql://postgres:postgres@localhost:5433/miles_booking

## Management Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes database data)
docker-compose down -v

# Restart a specific service
docker-compose restart api
docker-compose restart web
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f nginx

# Last 100 lines
docker-compose logs --tail=100 api
```

### Rebuild Services

```bash
# Rebuild all services
docker-compose build

# Rebuild specific service
docker-compose build api
docker-compose build web

# Rebuild and restart
docker-compose up -d --build
```

### Database Management

```bash
# Access PostgreSQL CLI
docker exec -it miles-assistant-db psql -U postgres -d miles_booking

# Run migrations manually
docker exec -it miles-assistant-api npx prisma migrate deploy

# Seed database
docker exec -it miles-assistant-api npm run prisma:seed

# Backup database
docker exec miles-assistant-db pg_dump -U postgres miles_booking > backup.sql

# Restore database
docker exec -i miles-assistant-db psql -U postgres miles_booking < backup.sql
```

## Development Workflow

### Option 1: Development with Hot-Reload (Recommended)

Use `docker-compose.dev.yml` for volume mounts that enable live code reloading without rebuilding containers.

```bash
# Start all services with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f api
docker-compose logs -f web
```

**What this does:**
- Mounts source code directories into containers
- API runs with `npm run dev` (nodemon with hot-reload)
- Web runs with `npm run dev` (Vite HMR)
- Chat and IRIS run with `node --watch` for auto-restart
- Changes to your code are immediately reflected
- No need to rebuild containers for code changes

**Development workflow:**
1. Edit code in your local editor
2. Save the file
3. Service automatically reloads (check logs to confirm)
4. Refresh browser or test the API

**Per-Service Development:**

**API Backend:**
```bash
# API uses nodemon for hot-reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up api postgres

# Watch logs to see reload messages
docker-compose logs -f api

# Access at http://localhost:3000/api
```

**Web Frontend:**
```bash
# Web uses Vite HMR (Hot Module Replacement)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up web api postgres

# Access at http://localhost:3003
# Changes appear instantly in browser
```

**Chat Application:**
```bash
# Chat uses node --watch for auto-restart
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up chat-app api postgres

# Access at http://localhost:3001
```

**IRIS Terminal:**
```bash
# IRIS uses node --watch for auto-restart
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up iris api postgres

# Access at http://localhost:3002
```

**Installing Dependencies:**

When you add new npm packages, you need to rebuild the container:

```bash
# Add package locally
cd api
npm install express-rate-limit

# Rebuild and restart the container
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build api
```

### Option 2: Hybrid (Database in Docker, Services Local)

Best for development when you want full control over service processes.

```bash
# Start only the database
docker-compose up -d postgres

# Run services locally with hot-reload
cd api && npm run dev          # Nodemon hot-reload on :3000
cd web && npm run dev          # Vite HMR on :5173
cd chat-app && npm run dev     # Node watch on :3001
cd iris && npm run dev         # Node watch on :3002
```

**Benefits:**
- Faster startup and restart times
- Direct access to debugger
- No Docker overhead
- Full IDE integration

**Requirements:**
- Node.js 20+ installed locally
- Update DATABASE_URL in api/.env:
  ```
  DATABASE_URL="postgresql://postgres:postgres@localhost:5433/miles_booking"
  ```

### Option 3: Production Build Testing

Test production builds locally before deployment:

```bash
# Build and run production containers
docker-compose up -d

# Make code changes, then rebuild
docker-compose build api
docker-compose restart api

# View logs
docker-compose logs -f api
```

### Common Development Tasks

**Database Operations:**

```bash
# Run migrations in development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate dev

# Open Prisma Studio (database GUI)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma studio
# Access at http://localhost:5555

# Seed database
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm run prisma:seed

# Reset database (⚠️ deletes all data)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npx prisma migrate reset
```

**Type Generation:**

```bash
# Regenerate API client for web frontend
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec web npm run generate

# Or locally if using hybrid approach
cd web && npm run generate
```

**Running Tests:**

```bash
# Run API tests
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec api npm test

# Run web tests
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec web npm test

# Or locally
cd api && npm test
cd web && npm test
```

**Debugging Tips:**

```bash
# Check service status
docker-compose ps

# Follow logs for all services
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f api

# See last 100 lines
docker-compose logs --tail=100 api

# Check inside a container
docker-compose exec api sh
ls -la
ps aux
```

## Troubleshooting

### Service Won't Start

```bash
# Check service status
docker-compose ps

# Check service logs
docker-compose logs api

# Restart service
docker-compose restart api
```

### Port Conflicts

If you get port conflict errors:

```bash
# Check what's using the port
lsof -i :80
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port mapping in docker-compose.yml
# "8080:80" instead of "80:80"
```

### Database Connection Issues

```bash
# Check database is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up -d postgres
```

### Nginx Proxy Issues

```bash
# Check nginx config syntax
docker exec miles-assistant-nginx nginx -t

# Reload nginx config
docker exec miles-assistant-nginx nginx -s reload

# View nginx logs
docker-compose logs nginx

# Test direct service access (bypass nginx)
curl http://localhost:3000/api/health
curl http://localhost:3003
```

### Build Failures

```bash
# Clear build cache
docker-compose build --no-cache api

# Check available disk space
docker system df

# Clean up old images/containers
docker system prune -a
```

## Health Checks

All services have health checks configured:

```bash
# View service health
docker-compose ps

# Check API health
curl http://localhost/api/health
curl http://localhost:3000/api/health

# Check nginx health
curl http://localhost/health
```

## Production Deployment

### Security Considerations

1. **Change default passwords:**
   ```bash
   # Update docker-compose.yml postgres section
   POSTGRES_PASSWORD: <strong-password>
   ```

2. **Set strong JWT secret:**
   ```bash
   # In .env file
   JWT_SECRET=<generate-strong-random-secret>
   ```

3. **Use Docker secrets** for sensitive data:
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

4. **Enable HTTPS** with Let's Encrypt or similar

5. **Set resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

### Environment-Specific Configs

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  api:
    environment:
      NODE_ENV: production
      LOG_LEVEL: warn
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Monitoring

### View Resource Usage

```bash
# All containers
docker stats

# Specific container
docker stats miles-assistant-api
```

### Disk Usage

```bash
# Check Docker disk usage
docker system df

# View volume sizes
docker volume ls
docker volume inspect miles-assistant-postgres-data
```

## Backup and Recovery

### Backup All Data

```bash
# Backup script
./scripts/backup.sh
```

Create `scripts/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup database
docker exec miles-assistant-db pg_dump -U postgres miles_booking > $BACKUP_DIR/database.sql

# Backup IRIS data
docker cp miles-assistant-iris:/app/data $BACKUP_DIR/iris-data

echo "Backup completed: $BACKUP_DIR"
```

### Restore Data

```bash
# Restore database
docker exec -i miles-assistant-db psql -U postgres miles_booking < backups/20250121_120000/database.sql

# Restore IRIS data
docker cp backups/20250121_120000/iris-data miles-assistant-iris:/app/
```

## Support

For issues, check:
- Service logs: `docker-compose logs -f <service>`
- Health status: `docker-compose ps`
- GitHub Issues: [Miles Booking Issues](https://github.com/your-org/miles-booking/issues)

## License

MIT License - see LICENSE file for details
