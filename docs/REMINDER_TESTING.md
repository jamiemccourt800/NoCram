# Email Reminders Testing Guide

## Overview
This guide explains how to test the email reminder system (US-015) in NoCram.

## Acceptance Criteria Verification

### AC1: User receives email 7 days before due date
**Status:** Implemented  
**Implementation:** Controlled by `default_reminder_days` in notification_preferences table (default: '7,2,1')

### AC2: User receives email 2 days before due date
**Status:** Implemented  
**Implementation:** Controlled by `default_reminder_days` in notification_preferences table

### AC3: User receives email 1 day before due date
**Status:** Implemented  
**Implementation:** Controlled by `default_reminder_days` in notification_preferences table

### AC4: Email includes assignment details
**Status:** Implemented  
**Email Contents:**
- Assignment title
- Module name
- Due date (formatted with day, date, time)
- Estimated hours (if set)
- Weighting percentage (if set)
- Description (if provided)
- Current status

### AC5: Email has link to view assignment
**Status:** Implemented  
**Implementation:** Email contains "View Assignment" button linking to `/assignments` page

### AC6: Reminders NOT sent for completed assignments
**Status:** Implemented  
**Implementation:** Reminder query filters `WHERE a.status != 'done'`

### AC7: User can opt out of reminders in settings
**Status:** Implemented  
**Implementation:** Settings page allows toggling `email_enabled` preference

---

## How the System Works

### Scheduler Configuration
- **Default Schedule:** Daily at 9:00 AM (server time)
- **Cron Expression:** `0 9 * * *` (configurable via `REMINDER_CRON_SCHEDULE` env var)
- **Development Mode:** Auto-runs 5 seconds after server startup for testing

### Reminder Logic
1. Cron job triggers daily
2. Query finds assignments:
   - Due within next 7 days
   - Status is NOT 'done'
   - User has `email_enabled = true`
   - No reminder sent in last 24 hours
3. For each assignment, calculate days until due
4. Check if days match user's `default_reminder_days` setting
5. If match, send email and log to `reminders` table
6. Skip if no match

### Database Tables

**reminders:**
- `assignment_id` - Foreign key to assignments
- `user_id` - Foreign key to users
- `remind_at` - Timestamp when reminder was due
- `type` - Always 'email' for now
- `sent` - Boolean (always true when inserted)
- `sent_at` - Actual send timestamp

**notification_preferences:**
- `user_id` - Foreign key to users (primary key)
- `email_enabled` - Boolean to enable/disable emails
- `default_reminder_days` - Comma-separated list (e.g., '7,2,1')

---

## Testing Instructions

### Prerequisites
1. Server and database must be running
2. Email service configured (see Environment Setup below)
3. At least one user account created
4. At least one module created
5. PostgreSQL client (psql, pgAdmin, or DBeaver)

### Environment Setup

**For Development Testing (Console Logs Only):**
```bash
# .env file
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**For Production Testing (Actual Emails):**
```bash
# .env file
NODE_ENV=production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=NoCram <noreply@nocram.app>
CLIENT_URL=http://localhost:3000
```

**Note:** For Gmail, you need an [App Password](https://support.google.com/accounts/answer/185833):
1. Enable 2FA on your Google account
2. Go to Google Account > Security > 2-Step Verification > App passwords
3. Generate app password for "Mail"
4. Use this password in `SMTP_PASS`

---

## Test Scenarios

### Test 1: Basic Reminder Flow (7 days before)

**Setup:**
```sql
-- 1. Create assignment due in exactly 7 days
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  due_date, 
  status, 
  estimated_hours, 
  weighting_percent
) VALUES (
  1,  -- Replace with your user_id
  1,  -- Replace with your module_id
  'Test Assignment - 7 Days',
  NOW() + INTERVAL '7 days',
  'not_started',
  5.0,
  25.0
);

-- 2. Verify notification preferences
SELECT * FROM notification_preferences WHERE user_id = 1;
-- Should show: email_enabled = true, default_reminder_days = '7,2,1'

-- 3. Check for existing reminders (should be none)
SELECT * FROM reminders WHERE user_id = 1;
```

**Execute:**
```bash
# Method 1: Manual trigger via API
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Method 2: Wait for cron (9 AM daily, or 5 seconds after server start in dev mode)
npm run dev  # In server directory
```

**Verify:**
```sql
-- Check reminder was logged
SELECT 
  r.sent_at,
  a.title,
  a.due_date,
  u.email
FROM reminders r
JOIN assignments a ON r.assignment_id = a.id
JOIN users u ON r.user_id = u.id
WHERE r.user_id = 1
ORDER BY r.sent_at DESC;
```

**Expected Results:**
- Console shows: "✅ Reminder sent to [email] for: Test Assignment - 7 Days"
- Email received with all assignment details
- Email includes "5.0 hours" and "25%" weighting
- Email link points to http://localhost:3000/assignments
- Reminder logged in database with `sent = true`

---

### Test 2: Custom Reminder Days

**Setup:**
```sql
-- 1. Update user preferences to remind at 5, 3, 1 days before
UPDATE notification_preferences 
SET default_reminder_days = '5,3,1'
WHERE user_id = 1;

-- 2. Create assignment due in 5 days
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  due_date, 
  status
) VALUES (
  1,
  1,
  'Test Assignment - 5 Days Custom',
  NOW() + INTERVAL '5 days',
  'not_started'
);
```

**Execute:**
```bash
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results:**
- Reminder sent for assignment due in 5 days
- No reminder for assignments due in 7 days (not in user's list)

---

### Test 3: Completed Assignment (No Reminder)

**Setup:**
```sql
-- 1. Create completed assignment due in 2 days
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  due_date, 
  status,
  completed_at
) VALUES (
  1,
  1,
  'Completed Assignment - Should NOT Remind',
  NOW() + INTERVAL '2 days',
  'done',
  NOW()
);
```

**Execute:**
```bash
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results:**
- Console shows: "📋 Found 0 assignment(s) requiring reminders" (or excludes this one)
- NO email sent for completed assignment
- No reminder logged in database for this assignment

---

### Test 4: Email Disabled (Opt-Out)

**Setup:**
```sql
-- Disable email notifications
UPDATE notification_preferences 
SET email_enabled = false
WHERE user_id = 1;

-- Create assignment due in 2 days
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  due_date, 
  status
) VALUES (
  1,
  1,
  'Test Assignment - Email Disabled',
  NOW() + INTERVAL '2 days',
  'not_started'
);
```

**Execute:**
```bash
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results:**
- Console shows: "📋 Found 0 assignment(s) requiring reminders"
- NO email sent
- No reminder logged in database

**Cleanup:**
```sql
-- Re-enable for other tests
UPDATE notification_preferences 
SET email_enabled = true
WHERE user_id = 1;
```

---

### Test 5: Duplicate Prevention (24-hour cooldown)

**Setup:**
```sql
-- Create assignment due in 7 days
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  due_date, 
  status
) VALUES (
  1,
  1,
  'Test Assignment - Duplicate Check',
  NOW() + INTERVAL '7 days',
  'not_started'
);
```

**Execute:**
```bash
# Run trigger twice in a row
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Immediately run again
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Results:**
- First trigger: Email sent, reminder logged
- Second trigger: NO email sent (assignment excluded due to recent reminder)
- Console shows: "📋 Found 0 assignment(s)" on second run

---

### Test 6: UI Settings Update

**Browser Steps:**
1. Login to NoCram (http://localhost:3000)
2. Click Settings in navigation
3. Toggle "Enable Email Reminders" OFF
4. Click "Save Preferences"
5. Check database:
   ```sql
   SELECT email_enabled FROM notification_preferences WHERE user_id = 1;
   -- Should show: false
   ```
6. Toggle back ON and change reminder days to "14,7,3,1"
7. Save preferences
8. Verify in database:
   ```sql
   SELECT email_enabled, default_reminder_days 
   FROM notification_preferences 
   WHERE user_id = 1;
   -- Should show: email_enabled = true, default_reminder_days = '14,7,3,1'
   ```

**Expected Results:**
- Settings page loads successfully
- Toggle switch works
- Reminder days field updates
- Success message displays on save
- Database updates correctly
- Future reminders respect new settings

---

### Test 7: Email Content Verification

**Setup:**
```sql
-- Create assignment with ALL fields populated
INSERT INTO assignments (
  user_id, 
  module_id, 
  title, 
  description,
  due_date, 
  status,
  estimated_hours,
  weighting_percent
) VALUES (
  1,
  1,
  'Comprehensive Test Assignment',
  'This is a detailed description of the assignment requirements.',
  NOW() + INTERVAL '2 days',
  'in_progress',
  8.5,
  35.0
);
```

**Execute:**
```bash
curl -X POST http://localhost:4000/api/reminders/trigger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Email Content:**
```
Subject: ⏰ Due Tomorrow: Comprehensive Test Assignment (or 📅 Reminder: ... due in 2 days)

Body contains:
- Title: "Comprehensive Test Assignment"
- Module: [Your module name]
- Due Date: [Formatted date with time]
- Estimated Hours: "8.5 hours"
- Weighting: "35%"
- Description: "This is a detailed description..."
- Status: "in_progress"
- Button: "View Assignment" → http://localhost:3000/assignments
```

---

## Troubleshooting

### Issue: No reminders sent

**Check 1: Server logs**
```bash
# Look for these messages:
🔍 Checking for upcoming deadlines...
📋 Found X assignment(s) requiring reminders
✅ Reminder sent to [email] for: [assignment]
```

**Check 2: Database query**
```sql
-- Manually run the reminder query
SELECT 
  a.id,
  a.title,
  a.due_date,
  a.status,
  u.email,
  np.email_enabled,
  np.default_reminder_days,
  EXTRACT(day FROM (a.due_date - NOW())) as days_until_due
FROM assignments a
JOIN modules m ON a.module_id = m.id
JOIN users u ON m.user_id = u.id
JOIN notification_preferences np ON u.id = np.user_id
WHERE 
  a.status != 'done'
  AND np.email_enabled = true
  AND a.due_date > NOW()
  AND a.due_date <= NOW() + INTERVAL '7 day';
```

**Check 3: Notification preferences**
```sql
SELECT * FROM notification_preferences WHERE user_id = 1;
-- Verify email_enabled = true
```

**Check 4: Assignment timing**
```sql
SELECT 
  title,
  due_date,
  EXTRACT(day FROM (due_date - NOW())) as days_until_due
FROM assignments
WHERE user_id = 1 AND status != 'done';
-- Verify days_until_due matches your default_reminder_days
```

---

### Issue: Emails not actually sending (production mode)

**Check 1: SMTP credentials**
```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});
transporter.verify((error, success) => {
  if (error) console.log('Error:', error);
  else console.log('✅ SMTP ready');
});
"
```

**Check 2: Gmail settings**
- Enable 2FA
- Generate App Password (not your regular password)
- Check "Less secure app access" is OFF (use App Password instead)

**Check 3: Environment variables**
```bash
echo $SMTP_HOST
echo $SMTP_USER
# Should show your actual values, not "your-email@gmail.com"
```

---

### Issue: Wrong reminder timing

**Problem:** Reminders sent at wrong days before deadline

**Solution:** Verify `default_reminder_days` format
```sql
-- Should be comma-separated, no spaces
UPDATE notification_preferences 
SET default_reminder_days = '7,2,1'  -- ✅ Correct
WHERE user_id = 1;

-- NOT:
-- '7, 2, 1'  ❌ (spaces will break parsing)
-- '7-2-1'    ❌ (wrong delimiter)
```

---

## Manual Testing Checklist

Use this checklist to verify all acceptance criteria:

- [ ] Create assignment due in 7 days → Reminder received
- [ ] Create assignment due in 2 days → Reminder received
- [ ] Create assignment due in 1 day → Reminder received
- [ ] Email shows assignment title
- [ ] Email shows module name
- [ ] Email shows due date
- [ ] Email shows estimated hours (when set)
- [ ] Email shows weighting percentage (when set)
- [ ] Email has working link to assignments page
- [ ] Completed assignment (status='done') does NOT trigger reminder
- [ ] Settings page allows toggling email_enabled
- [ ] Disabling emails stops reminders
- [ ] Custom reminder days work (e.g., 5,3,1)
- [ ] Same assignment doesn't get duplicate reminders within 24h
- [ ] Cron job runs automatically in production
- [ ] Manual trigger endpoint works for testing

---

## Development vs Production Modes

### Development Mode
- **Trigger:** Auto-runs 5 seconds after server start
- **Email:** Console logs only (no actual emails sent)
- **Testing:** Easy to test without SMTP setup

### Production Mode
- **Trigger:** Cron job at 9:00 AM daily
- **Email:** Actual emails via SMTP
- **Testing:** Requires valid SMTP credentials

**Switch modes:**
```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm start
```

---

## Useful SQL Queries

**View all pending assignments with reminder timing:**
```sql
SELECT 
  a.title,
  a.due_date,
  a.status,
  EXTRACT(day FROM (a.due_date - NOW())) as days_until_due,
  np.email_enabled,
  np.default_reminder_days
FROM assignments a
JOIN modules m ON a.module_id = m.id
JOIN notification_preferences np ON m.user_id = np.user_id
WHERE a.status != 'done'
  AND a.due_date > NOW()
ORDER BY a.due_date;
```

**View reminder history:**
```sql
SELECT 
  r.sent_at,
  a.title,
  a.due_date,
  u.email,
  r.type
FROM reminders r
JOIN assignments a ON r.assignment_id = a.id
JOIN users u ON r.user_id = u.id
ORDER BY r.sent_at DESC
LIMIT 20;
```

**Delete old test reminders:**
```sql
-- Be careful! This deletes ALL reminders
DELETE FROM reminders WHERE user_id = 1;

-- Or delete for specific assignment
DELETE FROM reminders WHERE assignment_id = 123;
```

**Reset reminder cooldown (for testing):**
```sql
-- Update sent_at to 2 days ago to bypass 24h cooldown
UPDATE reminders 
SET sent_at = NOW() - INTERVAL '2 days'
WHERE assignment_id = 123;
```

---

## Summary

The email reminder system (US-015) is **fully implemented** with all acceptance criteria met:

Emails sent at 7, 2, 1 days before (configurable)  
Email includes all required details (title, module, date, hours, weighting)  
Email has direct link to assignments  
Completed assignments excluded  
User can opt out via Settings  
Automatic daily checks  
Manual trigger for testing  
Development and production modes  

**Next Steps:**
1. Set up SMTP credentials in `.env`
2. Run through test scenarios above
3. Verify emails are sent correctly
4. Customize cron schedule if needed (default 9 AM is good for most users)

**Questions or Issues?**
Check server logs for detailed debugging information. Every reminder check logs:
- Number of assignments found
- Which assignments were sent reminders
- Any errors during email sending