# Docker Deployment Guide

## Prerequisites
- Docker Desktop installed and running
- Docker Compose v2+

## Quick Start

### Development Mode (All Services)
```bash
# Stop any running local servers first
# Then start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- PostgreSQL: localhost:5432

## Individual Service Commands

### Build Images
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build server
docker-compose build client
```

### Start/Stop Services
```bash
# Start specific service
docker-compose up -d postgres
docker-compose up -d server
docker-compose up -d client

# Stop specific service
docker-compose stop server

# Restart service
docker-compose restart server
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f postgres
```

### Execute Commands in Containers
```bash
# Access backend container shell
docker-compose exec server sh

# Access database
docker-compose exec postgres psql -U nocram -d nocram_dev

# Run database migrations
docker-compose exec server node migrate.js
```

## Database Management

### Reset Database
```bash
# Remove database volume (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d postgres

# The schema and seed data will be automatically loaded
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U nocram nocram_dev > backup.sql
```

### Restore Database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U nocram -d nocram_dev
```

## Troubleshooting

### Container won't start
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs server

# Rebuild container
docker-compose build --no-cache server
docker-compose up -d server
```

### Database connection issues
```bash
# Check postgres health
docker-compose exec postgres pg_isready -U nocram -d nocram_dev

# Verify environment variables
docker-compose exec server env | grep DATABASE
```

### Port conflicts
If ports 3000, 4000, or 5432 are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Change frontend to port 3001
  - "4001:4000"  # Change backend to port 4001
```

## Production Deployment

### Build Production Images
```bash
# Build optimized production images
docker build -t nocram-server:prod ./server
docker build -t nocram-client:prod ./client
```

### Environment Variables
1. Copy `.env.production.example` files
2. Fill in production values
3. Never commit real `.env.production` files to Git

### Deploy to Cloud Platforms

**Railway/Render:**
- Connect GitHub repository
- Set environment variables in dashboard
- Deploy automatically on push to main

**AWS ECS/Docker Swarm:**
```bash
# Tag images for registry
docker tag nocram-server:prod your-registry/nocram-server:latest
docker tag nocram-client:prod your-registry/nocram-client:latest

# Push to registry
docker push your-registry/nocram-server:latest
docker push your-registry/nocram-client:latest
```

## Health Checks

All services include health checks:

```bash
# Backend API
curl http://localhost:4000/health

# Frontend (in container)
docker-compose exec client wget -O- http://localhost/health

# Database
docker-compose exec postgres pg_isready -U nocram -d nocram_dev
```

## Cleanup

### Remove stopped containers
```bash
docker-compose down
```

### Remove containers and volumes (WARNING: deletes data)
```bash
docker-compose down -v
```

### Remove images
```bash
docker rmi nocram-server:latest
docker rmi nocram-client:latest
```

### Full cleanup
```bash
docker-compose down -v --rmi all
```
