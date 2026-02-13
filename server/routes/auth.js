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
        u.id, u.email, u.name, u.timezone, u.semester_start, u.semester_end, u.created_at
       FROM users u
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
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/notification-preferences - Get notification preferences
router.get('/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT email_enabled, push_enabled, in_app_enabled, default_reminder_days, updated_at
       FROM notification_preferences 
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Return default preferences if none exist
      return res.json({
        email_enabled: true,
        push_enabled: false,
        in_app_enabled: true,
        default_reminder_days: '7,2,1'
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/notification-preferences - Update notification preferences
router.put('/notification-preferences', authenticateToken, async (req, res) => {
  const { email_enabled, push_enabled, in_app_enabled, default_reminder_days } = req.body;

  try {
    // First check if preferences exist
    const checkResult = await pool.query(
      'SELECT user_id FROM notification_preferences WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (checkResult.rows.length === 0) {
      // Insert new preferences
      result = await pool.query(
        `INSERT INTO notification_preferences (user_id, email_enabled, push_enabled, in_app_enabled, default_reminder_days, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING email_enabled, push_enabled, in_app_enabled, default_reminder_days`,
        [req.user.id, email_enabled ?? true, push_enabled ?? false, in_app_enabled ?? true, default_reminder_days || '7,2,1']
      );
    } else {
      // Update existing preferences
      result = await pool.query(
        `UPDATE notification_preferences 
         SET email_enabled = $1, push_enabled = $2, in_app_enabled = $3, default_reminder_days = $4, updated_at = NOW()
         WHERE user_id = $5
         RETURNING email_enabled, push_enabled, in_app_enabled, default_reminder_days`,
        [email_enabled, push_enabled ?? false, in_app_enabled ?? true, default_reminder_days || '7,2,1', req.user.id]
      );
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

// PUT /api/auth/profile - Update user profile (name, email, timezone, semester dates)
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, email, timezone, semester_start, semester_end, currentPassword } = req.body;

  try {
    // Get current user info
    const userResult = await pool.query(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = userResult.rows[0];

    // If email is being changed, require password confirmation
    if (email && email !== currentUser.email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          error: 'Invalid email format' 
        });
      }

      if (!currentPassword) {
        return res.status(400).json({ 
          error: 'Password confirmation required to change email' 
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(currentPassword, currentUser.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Check if new email is already taken
      const existingEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (email && email !== currentUser.email) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount}`);
      values.push(timezone);
      paramCount++;
    }

    if (semester_start !== undefined) {
      updates.push(`semester_start = $${paramCount}`);
      values.push(semester_start || null);
      paramCount++;
    }

    if (semester_end !== undefined) {
      updates.push(`semester_end = $${paramCount}`);
      values.push(semester_end || null);
      paramCount++;
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at would be changed, no actual updates
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add user_id to values array
    values.push(req.user.id);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, timezone, semester_start, semester_end, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/auth/change-password - Change user password
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters' 
      });
    }

    // Get current user
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
