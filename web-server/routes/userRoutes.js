const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// POST /api/users - Register new user
router.post('/', userController.createUser);

// GET /api/users/:id - Get user profile
router.get('/:id', userController.getUserById);

module.exports = router;