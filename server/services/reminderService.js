const cron = require('node-cron');
const db = require('../models/db');
const { sendReminderEmail } = require('./emailService');

// Check for upcoming deadlines and send reminders
const checkUpcomingDeadlines = async () => {
  try {
    console.log('🔍 Checking for upcoming deadlines...');

    // Query to find assignments with upcoming deadlines based on user preferences
    const query = `
      SELECT 
        a.id,
        a.title,
        a.description,
        a.due_date,
        a.status,
        a.estimated_hours,
        a.weighting_percent,
        m.id as module_id,
        m.name as module_name,
        u.id as user_id,
        u.email,
        u.name as user_name,
        np.email_enabled,
        np.default_reminder_days
      FROM assignments a
      JOIN modules m ON a.module_id = m.id
      JOIN users u ON m.user_id = u.id
      JOIN notification_preferences np ON u.id = np.user_id
      WHERE 
        a.status != 'done'
        AND np.email_enabled = true
        AND a.due_date > NOW()
        AND a.due_date <= NOW() + INTERVAL '7 day'
        AND NOT EXISTS (
          SELECT 1 FROM reminders r 
          WHERE r.assignment_id = a.id 
          AND r.sent_at > NOW() - INTERVAL '1 day'
        )
      ORDER BY a.due_date ASC
    `;

    const result = await db.query(query);
    const assignments = result.rows;

    console.log(`📋 Found ${assignments.length} assignment(s) requiring reminders`);

    for (const assignment of assignments) {
      const daysUntilDue = Math.ceil(
        (new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      // Parse user's reminder day preferences (e.g., '7,2,1' -> [7, 2, 1])
      const reminderDays = assignment.default_reminder_days
        ? assignment.default_reminder_days.split(',').map(d => parseInt(d.trim()))
        : [7, 2, 1]; // Default fallback

      // Only send reminder if days until due matches one of the reminder days
      if (!reminderDays.includes(daysUntilDue)) {
        console.log(`⏭️ Skipping ${assignment.title} - ${daysUntilDue} days until due (reminder days: ${reminderDays.join(',')})`);
        continue;
      }

      const subject = daysUntilDue === 0 
        ? `⚠️ Due Today: ${assignment.title}`
        : daysUntilDue === 1
        ? `⏰ Due Tomorrow: ${assignment.title}`
        : `📅 Reminder: ${assignment.title} due in ${daysUntilDue} days`;

      // Send email reminder
      const emailResult = await sendReminderEmail(
        assignment.email,
        subject,
        assignment
      );

      if (emailResult.success) {
        // Log the reminder in the database
        await db.query(
          `INSERT INTO reminders (assignment_id, user_id, remind_at, type, sent, sent_at)
           VALUES ($1, $2, NOW(), $3, true, NOW())`,
          [assignment.id, assignment.user_id, 'email']
        );

        console.log(`✅ Reminder sent to ${assignment.email} for: ${assignment.title}`);
      } else {
        console.error(`❌ Failed to send reminder for assignment ${assignment.id}:`, emailResult.error);
      }
    }

    console.log('✨ Reminder check completed');
  } catch (error) {
    console.error('❌ Error checking deadlines:', error);
  }
};

// Manual trigger function for testing
const triggerManualCheck = async (req, res) => {
  try {
    await checkUpcomingDeadlines();
    res.json({ 
      success: true, 
      message: 'Manual reminder check completed. Check server logs for details.' 
    });
  } catch (error) {
    console.error('Error in manual trigger:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to trigger reminder check' 
    });
  }
};

// Initialize the cron job
const initReminderScheduler = () => {
  const schedule = process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *'; // Default: 9 AM daily
  
  console.log(`📅 Initializing reminder scheduler with cron: ${schedule}`);
  
  // Schedule the job
  cron.schedule(schedule, () => {
    console.log('⏰ Cron job triggered - Running reminder check...');
    checkUpcomingDeadlines();
  });

  console.log('✅ Reminder scheduler initialized successfully');
  
  // Run initial check on startup (for testing)
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Running initial reminder check (development mode)...');
    setTimeout(() => checkUpcomingDeadlines(), 5000); // Wait 5 seconds after startup
  }
};

module.exports = {
  initReminderScheduler,
  checkUpcomingDeadlines,
  triggerManualCheck,
};
