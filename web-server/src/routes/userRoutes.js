const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');

// POST /api/users - Register new user
router.post('/', userController.createUser);

// GET /api/users/:id - Get user profile (protected)
router.get('/:id', requireAuth, userController.getUserById);

module.exports = router;