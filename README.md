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

## Tech Stack
- **Frontend:** React, React Router, Bootstrap, PWA
- **Backend:** Node.js, Express, JWT Authentication
- **Database:** PostgreSQL
- **DevOps:** Docker, Docker Compose, GitHub Actions

## Features
- User authentication (signup/login)
- Module management
- Assignment tracking with deadlines
- Dashboard with upcoming & overdue assignments
- Workload visualization
- Automatic reminders (email/push notifications) - In Progress
- Calendar view - In Progress
- PWA offline support - In Progress
- Mobile-responsive design - In Progress

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

### Phase 4: PWA Features (Not Started)
- [ ] Service worker
- [ ] Offline support
- [ ] App manifest

### Phase 5: Background Jobs (Not Started)
- [ ] Email reminders
- [ ] Push notifications

### Phase 6: DevOps (Not Started)
- [ ] Docker containerization
- [ ] CI/CD pipeline

### Phase 7: Deployment (Not Started)
- [ ] Production deployment

## License
MIT

## Author
Jamie - NoCram Student Planner

## Contributing
This is a personal project, but suggestions are welcome!
