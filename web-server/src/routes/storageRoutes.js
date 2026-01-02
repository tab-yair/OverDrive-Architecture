const express = require('express');
const { getStorageInfo } = require('../controllers/storageController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/storage - Get storage usage and limit
router.get('/', requireAuth, getStorageInfo);

module.exports = router;
