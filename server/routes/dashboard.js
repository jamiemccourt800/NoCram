// server/routes/dashboard.js
const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/dashboard - Get dashboard summary
router.get('/', async (req, res) => {
  try {
    // Upcoming assignments (next 7 days)
    const upcomingResult = await pool.query(
      `SELECT a.*, m.name as module_name, m.code as module_code, m.color as module_color
       FROM assignments a
       LEFT JOIN modules m ON a.module_id = m.id
       WHERE a.user_id = $1 
         AND a.status != 'done'
         AND a.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       ORDER BY a.due_date ASC
       LIMIT 10`,
      [req.user.id]
    );

    // Overdue assignments
    const overdueResult = await pool.query(
      `SELECT a.*, m.name as module_name, m.code as module_code, m.color as module_color
       FROM assignments a
       LEFT JOIN modules m ON a.module_id = m.id
       WHERE a.user_id = $1 
         AND a.status != 'done'
         AND a.due_date < NOW()
       ORDER BY a.due_date ASC`,
      [req.user.id]
    );

    // Workload this week (sum of estimated hours)
    const workloadResult = await pool.query(
      `SELECT COALESCE(SUM(estimated_hours), 0) as total_hours
       FROM assignments
       WHERE user_id = $1 
         AND status != 'done'
         AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'`,
      [req.user.id]
    );

    // Workload breakdown by module
    const moduleBreakdownResult = await pool.query(
      `SELECT 
         m.id,
         m.name,
         m.color,
         COALESCE(SUM(a.estimated_hours), 0) as hours
       FROM modules m
       LEFT JOIN assignments a ON m.id = a.module_id 
         AND a.user_id = $1
         AND a.status != 'done'
         AND a.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
       WHERE m.user_id = $1
       GROUP BY m.id, m.name, m.color
       HAVING COALESCE(SUM(a.estimated_hours), 0) > 0
       ORDER BY hours DESC`,
      [req.user.id]
    );

    // Total assignments by status
    const statsResult = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'done') as done
       FROM assignments
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      upcoming: upcomingResult.rows,
      overdue: overdueResult.rows,
      workload: {
        total_hours: parseFloat(workloadResult.rows[0].total_hours),
        breakdown: moduleBreakdownResult.rows.map(row => ({
          module_id: row.id,
          module_name: row.name,
          module_color: row.color,
          hours: parseFloat(row.hours)
        }))
      },
      stats: statsResult.rows[0],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
