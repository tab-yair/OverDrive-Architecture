const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const preferenceRoutes = require('./preferenceRoutes');
const { requireAuth } = require('../middleware/auth');

// POST /api/users - Register new user
router.post('/', userController.createUser);

// GET /api/users/search - Search user by email (protected)
router.get('/search', requireAuth, userController.searchUserByEmail);

// GET /api/users/:id - Get user profile (protected)
router.get('/:id', requireAuth, userController.getUserById);

// PATCH /api/users/:id - Update user profile (protected)
router.patch('/:id', requireAuth, userController.updateUser);

// Nested preference routes: /api/users/:id/preference
router.use('/:id/preference', preferenceRoutes);

module.exports = router;
