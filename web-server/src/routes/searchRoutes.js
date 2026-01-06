const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const searchController = require('../controllers/searchController');

// All search routes require authentication
router.use(requireAuth);

// GET /api/search/:query - Search with optional filters via headers
router.get('/:query', searchController.searchFiles);

module.exports = router;
