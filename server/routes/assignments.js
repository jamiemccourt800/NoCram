// server/routes/assignments.js
const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Helper function to create automatic reminders
async function createReminders(assignmentId, userId, dueDate, reminderDays = [7, 2, 1]) {
  const client = await pool.connect();
  try {
    for (const days of reminderDays) {
      const remindAt = new Date(dueDate);
      remindAt.setDate(remindAt.getDate() - days);
      
      // Only create if remind_at is in the future
      if (remindAt > new Date()) {
        await client.query(
          `INSERT INTO reminders (assignment_id, user_id, remind_at, type) 
           VALUES ($1, $2, $3, 'email')`,
          [assignmentId, userId, remindAt]
        );
      }
    }
  } finally {
    client.release();
  }
}

// GET /api/assignments - Get all assignments with filters
router.get('/', async (req, res) => {
  const { status, module_id, upcoming } = req.query;

  try {
    let query = `
      SELECT a.*, m.name as module_name, m.code as module_code, m.color as module_color
      FROM assignments a
      LEFT JOIN modules m ON a.module_id = m.id
      WHERE a.user_id = $1
    `;
    const params = [req.user.id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }

    if (module_id) {
      paramCount++;
      query += ` AND a.module_id = $${paramCount}`;
      params.push(module_id);
    }

    if (upcoming) {
      const days = parseInt(upcoming) || 7;
      query += ` AND a.due_date BETWEEN NOW() AND NOW() + INTERVAL '${days} days'`;
    }

    query += ` ORDER BY a.due_date ASC`;

    const result = await pool.query(query, params);
    res.json({ assignments: result.rows });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/assignments - Create assignment
router.post('/', async (req, res) => {
  const { module_id, title, description, due_date, weighting_percent, estimated_hours } = req.body;

  try {
    if (!title || !due_date) {
      return res.status(400).json({ error: 'Title and due date are required' });
    }

    // Verify module belongs to user
    if (module_id) {
      const moduleCheck = await pool.query(
        'SELECT id FROM modules WHERE id = $1 AND user_id = $2',
        [module_id, req.user.id]
      );
      if (moduleCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Module not found' });
      }
    }

    const result = await pool.query(
      `INSERT INTO assignments 
       (user_id, module_id, title, description, due_date, weighting_percent, estimated_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [req.user.id, module_id || null, title, description || null, due_date, weighting_percent || null, estimated_hours || null]
    );

    const assignment = result.rows[0];

    // Create automatic reminders
    await createReminders(assignment.id, req.user.id, assignment.due_date);

    res.status(201).json({ assignment });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/assignments/:id - Get specific assignment
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, m.name as module_name, m.code as module_code 
       FROM assignments a
       LEFT JOIN modules m ON a.module_id = m.id
       WHERE a.id = $1 AND a.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment: result.rows[0] });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/assignments/:id - Update assignment
router.put('/:id', async (req, res) => {
  const { module_id, title, description, due_date, weighting_percent, estimated_hours, status } = req.body;

  try {
    // Get current assignment to check if due_date changed
    const currentAssignment = await pool.query(
      'SELECT due_date FROM assignments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (currentAssignment.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const result = await pool.query(
      `UPDATE assignments 
       SET module_id = COALESCE($1, module_id),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           due_date = COALESCE($4, due_date),
           weighting_percent = COALESCE($5, weighting_percent),
           estimated_hours = COALESCE($6, estimated_hours),
           status = COALESCE($7::varchar, status),
           completed_at = CASE WHEN $7::varchar = 'done' THEN NOW() WHEN $7 IS NOT NULL AND $7::varchar != 'done' THEN NULL ELSE completed_at END
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [module_id, title, description, due_date, weighting_percent, estimated_hours, status, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updatedAssignment = result.rows[0];

    // If due_date changed, update reminders
    if (due_date && new Date(due_date).getTime() !== new Date(currentAssignment.rows[0].due_date).getTime()) {
      // Delete existing reminders that haven't been sent
      await pool.query(
        'DELETE FROM reminders WHERE assignment_id = $1 AND sent = false',
        [req.params.id]
      );

      // Create new reminders with updated due date
      await createReminders(req.params.id, req.user.id, due_date);
    }

    res.json({ assignment: updatedAssignment });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/assignments/:id/status - Quick status update
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  console.log('PATCH /api/assignments/:id/status called');
  console.log('Assignment ID:', req.params.id);
  console.log('User ID:', req.user.id);
  console.log('Status:', status);

  try {
    if (!status) {
      console.log('ERROR: No status provided');
      return res.status(400).json({ error: 'Status is required' });
    }

    if (!['not_started', 'in_progress', 'done'].includes(status)) {
      console.log('ERROR: Invalid status value:', status);
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE assignments 
       SET status = $1::varchar,
           completed_at = CASE WHEN $1::varchar = 'done' THEN NOW() ELSE NULL END
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, req.params.id, req.user.id]
    );

    console.log('Query result rows:', result.rows.length);

    if (result.rows.length === 0) {
      console.log('ERROR: Assignment not found');
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log('SUCCESS: Status updated to', status);
    res.json({ assignment: result.rows[0] });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/assignments/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM assignments WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
