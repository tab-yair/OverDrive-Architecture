const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

// POST /api/tokens - Login (no auth required)
router.post('/', tokenController.login);

module.exports = router;
