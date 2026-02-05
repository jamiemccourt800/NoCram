// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../models/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, name, timezone } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, timezone) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, timezone, created_at`,
      [email, passwordHash, name || null, timezone || 'UTC']
    );

    const user = result.rows[0];

    // Create default notification preferences
    await pool.query(
      'INSERT INTO notification_preferences (user_id) VALUES ($1)',
      [user.id]
    );

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, timezone FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me (get current user)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.name, u.timezone, u.semester_start, u.semester_end, u.created_at,
        np.email_enabled, np.days_before, np.reminder_time
       FROM users u
       LEFT JOIN notification_preferences np ON u.id = np.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    res.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        timezone: user.timezone,
        semester_start: user.semester_start,
        semester_end: user.semester_end,
        created_at: user.created_at,
      },
      notification_preferences: {
        email_enabled: user.email_enabled,
        days_before: user.days_before,
        reminder_time: user.reminder_time
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/notification-preferences - Update notification preferences
router.put('/notification-preferences', authenticateToken, async (req, res) => {
  const { email_enabled, days_before, reminder_time } = req.body;

  try {
    const result = await pool.query(
      `UPDATE notification_preferences 
       SET email_enabled = $1, days_before = $2, reminder_time = $3, updated_at = NOW()
       WHERE user_id = $4
       RETURNING email_enabled, days_before, reminder_time`,
      [email_enabled, days_before, reminder_time, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preferences not found' });
    }

    res.json({ 
      success: true,
      preferences: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
