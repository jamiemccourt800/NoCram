# Email Reminders Quick Reference

## User Story: US-015
**As a student, I want to get email reminders before assignments are due, so that I don't forget about upcoming deadlines.**

---

## All Acceptance Criteria Met

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| User receives email 7 days before due date | ✅ | Configurable via `default_reminder_days` |
| User receives email 2 days before due date | ✅ | Configurable via `default_reminder_days` |
| User receives email 1 day before due date | ✅ | Configurable via `default_reminder_days` |
| Email includes assignment title | ✅ | In email template |
| Email includes module name | ✅ | In email template |
| Email includes due date | ✅ | Formatted in email template |
| Email includes estimated hours | ✅ | In email template (if set) |
| Email has link to view assignment | ✅ | Button links to /assignments |
| Reminders NOT sent for completed assignments | ✅ | Query filters `status != 'done'` |
| User can opt out in settings | ✅ | Settings page with toggle |

---

## System Architecture

### Components
1. **Cron Scheduler** (`server/services/reminderService.js`)
   - Runs daily at 9:00 AM (configurable)
   - Checks for assignments needing reminders
   - Sends emails and logs to database

2. **Email Service** (`server/services/emailService.js`)
   - Uses Nodemailer
   - Supports development (console) and production (SMTP) modes
   - HTML email template with assignment details

3. **Database Tables**
   - `notification_preferences`: User email settings
   - `reminders`: Log of sent reminders

4. **Settings UI** (`client/src/pages/Settings.js`)
   - Toggle email on/off
   - Customize reminder days

5. **API Endpoints**
   - `GET /api/auth/notification-preferences`: Fetch settings
   - `PUT /api/auth/notification-preferences`: Update settings
   - `POST /api/reminders/trigger`: Manual trigger (testing)

---

## Configuration

### Environment Variables (.env)
```bash
# Email (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=NoCram <noreply@nocram.app>

# Client URL (for email links)
CLIENT_URL=http://localhost:3000

# Cron Schedule (optional, default: "0 9 * * *" = 9 AM daily)
REMINDER_CRON_SCHEDULE=0 9 * * *

# Mode
NODE_ENV=development  # or 'production'
```

### User Settings (via Settings page)
- **email_enabled**: `true` or `false` (default: `true`)
- **default_reminder_days**: Comma-separated days (default: `'7,2,1'`)

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Cron Job Triggers (9 AM daily)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Query Database for Eligible Assignments                  │
│    - Due within 7 days                                       │
│    - Status != 'done'                                        │
│    - User has email_enabled = true                           │
│    - No reminder sent in last 24 hours                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. For Each Assignment                                       │
│    Calculate: days_until_due                                 │
│    Check: is days_until_due in user's reminder_days?         │
│    If YES → continue, if NO → skip                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Send Email                                                │
│    Subject: depends on days (Today/Tomorrow/X days)          │
│    Body: HTML template with all assignment details           │
│    Link: CLIENT_URL/assignments                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Log Reminder                                              │
│    INSERT INTO reminders with sent=true, sent_at=NOW()      │
└─────────────────────────────────────────────────────────────┘
```

---

## Email Template

**Subject Line (dynamic):**
- Due today: `⚠️ Due Today: [Assignment Title]`
- Due tomorrow: `⏰ Due Tomorrow: [Assignment Title]`
- Due in X days: `📅 Reminder: [Assignment Title] due in X days`

**Body Content:**
- Assignment title (heading)
- Module name
- Due date (formatted: "Monday, 20 February 2026, 23:59")
- Estimated hours (if set)
- Weighting percentage (if set)
- Description (if provided)
- Current status
- **"View Assignment" button** → `CLIENT_URL/assignments`

---

## Testing Quick Start

### Fast Test (Development Mode)
```bash
# 1. Start server (auto-runs reminder check after 5 seconds)
cd server
npm run dev

# 2. Create test assignment in database
psql nocram_dev
INSERT INTO assignments (user_id, module_id, title, due_date, status, estimated_hours, weighting_percent)
VALUES (1, 1, 'Test Assignment', NOW() + INTERVAL '7 days', 'not_started', 5.0, 25.0);

# 3. Wait for console output:
# 🔍 Checking for upcoming deadlines...
# 📋 Found 1 assignment(s) requiring reminders
# ✅ Reminder sent to user@example.com for: Test Assignment
```

### Manual Trigger
```bash
# Trigger reminder check immediately (requires auth token)
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Database Schema

### notification_preferences
```sql
CREATE TABLE notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    default_reminder_days TEXT DEFAULT '7,2,1',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### reminders
```sql
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMP NOT NULL,
    type VARCHAR(20) DEFAULT 'email' CHECK (type IN ('email', 'push', 'in_app')),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Common Tasks

### Change Reminder Schedule
```bash
# Edit .env
REMINDER_CRON_SCHEDULE=0 8 * * *  # 8 AM instead of 9 AM

# Restart server
npm run dev
```

### Add More Reminder Days for a User
```sql
-- Example: Remind at 14, 7, 3, 1 days before
UPDATE notification_preferences 
SET default_reminder_days = '14,7,3,1'
WHERE user_id = 1;
```

### Disable Reminders for a User
```sql
UPDATE notification_preferences 
SET email_enabled = false
WHERE user_id = 1;
```

### View Reminder History
```sql
SELECT 
  r.sent_at,
  a.title as assignment,
  u.email,
  EXTRACT(day FROM (a.due_date - r.sent_at)) as days_before_due
FROM reminders r
JOIN assignments a ON r.assignment_id = a.id
JOIN users u ON r.user_id = u.id
ORDER BY r.sent_at DESC
LIMIT 10;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No emails sent | Check `email_enabled = true` in notification_preferences |
| Wrong timing | Verify `default_reminder_days` format (no spaces) |
| Actual emails not sending | Check SMTP credentials, use Gmail App Password |
| Duplicate emails | System prevents <24h duplicates automatically |
| Missing assignment details | Check query includes `estimated_hours`, `weighting_percent` |

---

## File Reference

| File | Purpose |
|------|---------|
| `server/services/reminderService.js` | Cron scheduler, reminder logic |
| `server/services/emailService.js` | Nodemailer, email templates |
| `server/routes/reminders.js` | Manual trigger endpoint |
| `server/routes/auth.js` | Notification preferences endpoints |
| `client/src/pages/Settings.js` | User settings UI |
| `database/schema.sql` | Table definitions |
| `server/.env.example` | Environment variables template |

---

## Dependencies

```json
{
  "node-cron": "^4.2.1",       // Cron scheduler
  "nodemailer": "^8.0.0"       // Email sending
}
```

---

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP credentials (Gmail, SendGrid, etc.)
- [ ] Set `CLIENT_URL` to production domain
- [ ] Verify `EMAIL_FROM` address
- [ ] Test with real email account
- [ ] Set cron schedule (default 9 AM is recommended)
- [ ] Monitor server logs for first 24-48 hours
- [ ] Check `reminders` table for logged emails

---

## Future Enhancements (Not in US-015)

- Push notifications (mobile)
- In-app notifications
- SMS reminders
- Custom reminder times (not just days)
- Digest emails (daily summary)
- Reminder snooze functionality
- Reminders for overdue assignments

---

## Support

For detailed testing instructions, see: `docs/REMINDER_TESTING.md`

For questions or issues:
1. Check server console logs
2. Verify database queries manually
3. Test SMTP connection
4. Check environment variables