// server/routes/modules.js
const express = require('express');
const pool = require('../models/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/modules - Get all user's modules
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, color, icon, credits, created_at, updated_at 
       FROM modules 
       WHERE user_id = $1 
       ORDER BY name ASC`,
      [req.user.id]
    );

    res.json({ modules: result.rows });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/modules - Create new module
router.post('/', async (req, res) => {
  const { name, code, color, icon, credits } = req.body;

  try {
    if (!name) {
      return res.status(400).json({ error: 'Module name is required' });
    }

    const result = await pool.query(
      `INSERT INTO modules (user_id, name, code, color, icon, credits) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [req.user.id, name, code || null, color || '#3B82F6', icon || null, credits || null]
    );

    res.status(201).json({ module: result.rows[0] });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/modules/:id - Get specific module
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM modules WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ module: result.rows[0] });
  } catch (error) {
    console.error('Get module error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/modules/:id - Update module
router.put('/:id', async (req, res) => {
  const { name, code, color, icon, credits } = req.body;

  try {
    const result = await pool.query(
      `UPDATE modules 
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           color = COALESCE($3, color),
           icon = COALESCE($4, icon),
           credits = COALESCE($5, credits)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, code, color, icon, credits, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ module: result.rows[0] });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/modules/:id - Delete module
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM modules WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
