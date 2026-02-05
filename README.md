# NoCram - Student Deadline & Workload Planner

> Stop cramming. Start planning.

A Progressive Web App (PWA) that helps students manage deadlines, assignments, and workload across all modules.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- Docker Desktop (recommended for easy setup)

### Local Development

**With Docker (Recommended):**
```bash
# Start all services
docker-compose up
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Database: localhost:5432

**Without Docker:**
```bash
# Terminal 1 - Database
# Install PostgreSQL locally and create database
psql -U postgres
CREATE DATABASE nocram_dev;
\q

# Terminal 2 - Backend
cd server
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev

# Terminal 3 - Frontend
cd client
npm install
cp .env.example .env
npm start
```

## Documentation
- [Architecture](./docs/architecture.md) (coming soon)
- [API Documentation](./docs/api.md) (coming soon)
- [Database Schema](./database/schema.sql)
- [Docker Deployment Guide](./docs/DOCKER.md)
- [Production Deployment Guide](./docs/DEPLOYMENT.md)

## Tech Stack
- **Frontend:** React, React Router, Bootstrap, PWA
- **Backend:** Node.js, Express, JWT Authentication
- **Database:** PostgreSQL
- **DevOps:** Docker, Docker Compose, GitHub Actions

## Features
- ✅ User authentication (signup/login with JWT)
- ✅ Module management
- ✅ Assignment tracking with deadlines
- ✅ Dashboard with upcoming & overdue assignments
- ✅ Workload visualization
- ✅ PWA support with offline caching
- ✅ Installable as native app on desktop/mobile
- ✅ Service worker for background sync
- ✅ Automated email reminders with node-cron
- ✅ Notification preferences customization
- ✅ Production-ready Docker deployment
- ✅ CI/CD pipeline with GitHub Actions
- 🔜 Calendar view (future enhancement)
- 🔜 Push notifications (future enhancement)
- 🔜 Mobile app (React Native)

## PWA Testing

### Test PWA Installation
1. Open the app in Chrome: http://localhost:3000
2. Open DevTools (F12) > Application tab
3. Check "Manifest" section - should show NoCram details
4. Check "Service Workers" - should show registered worker
5. Click the install button in address bar (+ icon)
6. App should install and open in standalone window

### Test Offline Functionality
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Reload the page - cached content should still load
4. Try navigating to dashboard - should work with cached data
5. Deselect offline mode to restore connection

### Lighthouse PWA Audit
1. Open DevTools > Lighthouse tab
2. Select "Progressive Web App" category
3. Click "Generate report"
4. Should score 90+ for installability and PWA features

## Development Status

### Phase 0: Pre-Development Setup (Completed)
- [x] Environment setup
- [x] Project initialization
- [x] Git repository
- [x] Folder structure

### Phase 1: Database Setup (Completed)
- [x] Create database schema
- [x] Create seed data
- [x] Set up Docker Compose

### Phase 2: Backend API Setup (Completed)
- [x] Initialize backend with Express
- [x] Authentication (JWT)
- [x] Module routes
- [x] Assignment routes
- [x] Dashboard endpoint

### Phase 3: Frontend Setup (Completed)
- [x] Create React app
- [x] Authentication UI
- [x] Dashboard page
- [x] Module management
- [x] Assignment management

### Phase 4: PWA Features (Completed)
- [x] Service worker with Workbox
- [x] Offline support with caching strategies
- [x] App manifest configuration
- [x] PWA meta tags

### Phase 5: Background Jobs (Completed)
- [x] Email service with Nodemailer
- [x] Reminder scheduler with node-cron
- [x] Deadline checking logic
- [x] Notification preferences UI
- [x] Manual reminder trigger endpoint

### Phase 6: DevOps (Completed)
- [x] Docker containerization for all services
- [x] Docker Compose orchestration
- [x] GitHub Actions CI/CD pipeline
- [x] Production environment templates
- [x] Docker deployment documentation

### Phase 7: Deployment (Completed)
- [x] Production deployment guides (Railway, Render, Vercel, AWS)
- [x] Database deployment strategies
- [x] Environment configuration templates
- [x] Deployment scripts and automation
- [x] Security best practices
- [x] Monitoring and backup guides

## License
MIT

## Author
Jamie - NoCram Student Planner

## Contributing
This is a personal project, but suggestions are welcome!
