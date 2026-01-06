// Preference Routes
// Routes for user preference management

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :id from parent router
const preferenceController = require('../controllers/preferenceController');
const { requireAuth } = require('../middleware/auth');

// All preference routes require authentication
router.use(requireAuth);

// GET /api/users/:id/preference - Get user's preferences
router.get('/', preferenceController.getUserPreference);

// PATCH /api/users/:id/preference - Update user's preferences
router.patch('/', preferenceController.updateUserPreference);

module.exports = router;
