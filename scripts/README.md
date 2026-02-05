# Production Deployment Scripts

This directory contains scripts to help with production deployment and management.

## Available Scripts

### 1. Generate Secrets
```bash
node scripts/generate-secrets.js
```
Generates secure random secrets for JWT tokens and other sensitive configuration.

### 2. Database Migration
```bash
node scripts/migrate.js
```
Runs database schema migrations on production database.

### 3. Health Check
```bash
node scripts/health-check.js
```
Checks if all services are running correctly.

### 4. Backup Database
```bash
node scripts/backup-db.js
```
Creates a backup of the production database.

## Usage

### Before First Deployment
```bash
# Generate production secrets
node scripts/generate-secrets.js

# Copy output to your .env.production file
```

### After Deployment
```bash
# Initialize database
export DATABASE_URL="your-production-database-url"
node scripts/migrate.js

# Verify services are healthy
export API_URL="https://your-backend.com"
export FRONTEND_URL="https://your-frontend.com"
node scripts/health-check.js
```

### Regular Maintenance
```bash
# Daily database backup (set up as cron job)
0 2 * * * cd /path/to/nocram && node scripts/backup-db.js
```
