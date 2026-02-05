# Deployment Guide - NoCram

This guide covers deploying NoCram to production environments using various cloud platforms.

## Table of Contents
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Platform Guides](#platform-guides)
  - [Railway (Recommended)](#railway-recommended)
  - [Render](#render)
  - [Vercel + Railway](#vercel--railway)
  - [AWS (Advanced)](#aws-advanced)
- [Database Deployment](#database-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)

---

## Pre-Deployment Checklist

### Security
- [ ] Generate new JWT secrets (use `openssl rand -hex 64`)
- [ ] Set `NODE_ENV=production` in all environments
- [ ] Configure production database with strong password
- [ ] Enable SSL/HTTPS for all services
- [ ] Review CORS origins - restrict to production domains only
- [ ] Set up proper SMTP credentials for email service

### Configuration
- [ ] Update `CLIENT_URL` to production frontend URL
- [ ] Update API URLs in frontend `.env.production`
- [ ] Configure production database connection string
- [ ] Set up environment variables on hosting platform
- [ ] Test email delivery with production SMTP settings

### Code
- [ ] Remove console.logs from production code (optional)
- [ ] Ensure all database migrations are up to date
- [ ] Test Docker builds locally: `docker-compose build`
- [ ] Run production build locally: `npm run build`
- [ ] Verify service worker and PWA manifest are correct

### Monitoring
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up database backups
- [ ] Configure log aggregation

---

## Platform Guides

### Railway (Recommended)

**Why Railway:** Simple deployment, automatic HTTPS, PostgreSQL support, affordable pricing.

#### 1. Deploy Database
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Add PostgreSQL service
railway add --database postgresql
```

#### 2. Deploy Backend
```bash
# From project root
cd server

# Deploy backend
railway up

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=4000
railway variables set JWT_SECRET=your-generated-secret-here
railway variables set REFRESH_TOKEN_SECRET=your-generated-secret-here
railway variables set CLIENT_URL=https://your-frontend.vercel.app
railway variables set CORS_ORIGIN=https://your-frontend.vercel.app
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=your-email@gmail.com
railway variables set SMTP_PASS=your-app-password
railway variables set EMAIL_FROM="NoCram <noreply@nocram.app>"

# DATABASE_URL is automatically set by Railway PostgreSQL
```

#### 3. Deploy Frontend (Railway)
```bash
cd ../client

railway up

# Set environment variables
railway variables set REACT_APP_API_URL=https://your-backend.railway.app/api
```

**Alternative:** Deploy frontend to Vercel (see below)

#### 4. Initialize Database
```bash
# Get Railway PostgreSQL connection string
railway variables get DATABASE_URL

# Connect and run schema
psql $DATABASE_URL -f ../database/schema.sql
```

---

### Render

**Why Render:** Free tier available, automatic HTTPS, simple UI.

#### 1. Create PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "PostgreSQL"
3. Name: `nocram-db`
4. Select free or paid plan
5. Create database
6. Copy **Internal Database URL** for backend

#### 2. Deploy Backend
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Settings:
   - **Name:** `nocram-backend`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free or Starter

4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=[paste Internal Database URL]
   JWT_SECRET=[generate with: openssl rand -hex 64]
   JWT_EXPIRES_IN=15m
   REFRESH_TOKEN_SECRET=[generate with: openssl rand -hex 64]
   REFRESH_TOKEN_EXPIRES_IN=7d
   CLIENT_URL=https://nocram-frontend.onrender.com
   CORS_ORIGIN=https://nocram-frontend.onrender.com
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=NoCram <noreply@nocram.app>
   REMINDER_CRON_SCHEDULE=0 9 * * *
   ```

5. Click "Create Web Service"

#### 3. Deploy Frontend
1. Click "New +" → "Static Site"
2. Connect your GitHub repository
3. Settings:
   - **Name:** `nocram-frontend`
   - **Root Directory:** `client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`

4. Environment Variables:
   ```
   REACT_APP_API_URL=https://nocram-backend.onrender.com/api
   ```

5. Click "Create Static Site"

#### 4. Initialize Database
```bash
# Run schema via Render Shell
# In Render Dashboard → PostgreSQL → Shell
\i schema.sql
```

---

### Vercel + Railway

**Why This Combo:** Vercel excels at frontend hosting with CDN, Railway for backend/database.

#### 1. Deploy Backend & Database to Railway
Follow Railway backend steps above.

#### 2. Deploy Frontend to Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# From client directory
cd client

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add REACT_APP_API_URL production
# Enter: https://your-backend.railway.app/api
```

**Via Vercel Dashboard:**
1. Import Git Repository
2. Root Directory: `client`
3. Framework Preset: Create React App
4. Environment Variables:
   - `REACT_APP_API_URL`: `https://your-backend.railway.app/api`
5. Deploy

---

### AWS (Advanced)

For AWS deployment, use:
- **RDS PostgreSQL** for database
- **ECS Fargate** or **EC2** for backend
- **S3 + CloudFront** for frontend
- **Route 53** for DNS

See [AWS Deployment Guide](./AWS_DEPLOYMENT.md) for detailed instructions.

---

## Database Deployment

### Managed Database Providers

**Railway PostgreSQL:**
- Included in Railway project
- Automatic backups
- Connection pooling

**Render PostgreSQL:**
- Free tier: 90 days, then $7/month
- Automatic backups on paid plans

**Supabase (PostgreSQL):**
- Free tier available
- Built-in auth (optional)
- Real-time subscriptions

**AWS RDS:**
- Production-grade reliability
- Multi-AZ deployments
- Automated backups

### Initialize Production Database
```bash
# Connect to your production database
psql $DATABASE_URL

# Run schema
\i database/schema.sql

# Optional: Load sample data (NOT recommended for production)
# \i database/seeds/sample_data.sql

# Create first user via API
curl -X POST https://your-backend.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secure-password","name":"Admin"}'
```

---

## Environment Variables

### Backend (.env.production)
```bash
# Server
NODE_ENV=production
PORT=4000
CLIENT_URL=https://your-frontend-domain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT (generate with: openssl rand -hex 64)
JWT_SECRET=your-64-character-hex-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-different-64-character-hex-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=NoCram <noreply@nocram.app>

# Scheduler
REMINDER_CRON_SCHEDULE=0 9 * * *

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env.production)
```bash
REACT_APP_API_URL=https://your-backend-domain.com/api
```

### Generating Secure Secrets
```bash
# JWT Secret
openssl rand -hex 64

# Alternative with Node
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Post-Deployment

### Verify Deployment
```bash
# Test backend health
curl https://your-backend.com/health

# Test API endpoints
curl https://your-backend.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test frontend
curl https://your-frontend.com

# Test PWA manifest
curl https://your-frontend.com/manifest.json
```

### Set Up Monitoring

**Uptime Monitoring:**
- [UptimeRobot](https://uptimerobot.com) (free tier available)
- [Pingdom](https://www.pingdom.com)
- Monitor both `/health` endpoint and frontend

**Error Tracking:**
```bash
# Install Sentry (optional)
npm install @sentry/node @sentry/react

# Configure in server.js and App.js
```

**Database Backups:**
```bash
# Railway: Automatic backups included
# Render: Enable in dashboard (paid plans)
# Manual backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Performance Optimization

**Enable CDN:**
- Vercel/Netlify include CDN automatically
- Railway: Consider Cloudflare in front

**Database Optimization:**
```sql
-- Add indexes for frequent queries
CREATE INDEX idx_assignments_user_id ON assignments(user_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_modules_user_id ON modules(user_id);
```

**Caching:**
- Service worker already caches static assets
- Consider Redis for API caching (advanced)

---

## Troubleshooting

### Backend Issues
```bash
# Check logs (Railway)
railway logs

# Check logs (Render)
# View in Render dashboard → Logs tab

# Database connection issues
# Verify DATABASE_URL format: postgresql://user:password@host:port/database
```

### Frontend Issues
```bash
# Clear browser cache
# Verify REACT_APP_API_URL in production build

# Check network tab for CORS errors
# Ensure CORS_ORIGIN matches frontend URL exactly
```

### Email Not Sending
```bash
# Gmail: Enable 2FA and create App Password
# Test SMTP connection
telnet smtp.gmail.com 587

# Check server logs for email errors
railway logs | grep "Email"
```

---

## Cost Estimates

### Railway (Recommended)
- **Free:** $5 credit/month (~500 hours)
- **Developer:** $20/month (unlimited)
- **Database:** Included

### Render
- **Free:** Limited hours (spins down after inactivity)
- **Starter:** $7/month per service
- **Database:** Free for 90 days, then $7/month

### Vercel
- **Free:** Generous limits for personal projects
- **Pro:** $20/month (team features)

### AWS
- **RDS PostgreSQL:** ~$15-50/month
- **ECS/EC2:** ~$10-30/month
- **S3 + CloudFront:** ~$1-5/month

---

## Security Best Practices

- ✅ Use HTTPS everywhere (automatic with Railway/Render/Vercel)
- ✅ Rotate secrets regularly
- ✅ Enable database SSL connections
- ✅ Set rate limiting on API endpoints
- ✅ Monitor for suspicious activity
- ✅ Keep dependencies updated: `npm audit fix`
- ✅ Use environment variables, never commit secrets
- ✅ Enable CORS only for your frontend domain
- ✅ Set secure cookie options in production
- ✅ Implement CSP headers (already in nginx.conf)

---

## Next Steps

1. Choose deployment platform (Railway recommended for simplicity)
2. Follow platform-specific guide above
3. Complete pre-deployment checklist
4. Deploy database, backend, then frontend
5. Initialize database with schema
6. Test all functionality
7. Set up monitoring and backups
8. Share with users! 🚀

For questions or issues, refer to platform documentation or create an issue in the GitHub repository.
