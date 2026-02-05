const express = require('express');
const router = express.Router();
const { triggerManualCheck } = require('../services/reminderService');
const { authenticateToken } = require('../middleware/auth');

// POST /api/reminders/trigger - Manually trigger reminder check (for testing)
router.post('/trigger', authenticateToken, triggerManualCheck);

module.exports = router;
