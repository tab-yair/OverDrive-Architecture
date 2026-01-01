const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const fileController = require('../controllers/fileController');
const permissionController = require('../controllers/permissionController');

// All file routes require authentication
router.use(requireAuth);

// File starred, recent, and shared (must be before /:id routes)
router.get('/starred', fileController.getStarredFiles);
router.get('/recent', fileController.getRecentFiles);
router.get('/shared', fileController.getSharedFiles);
router.post('/:id/star', fileController.toggleStarFile);
router.post('/:id/copy', fileController.copyFile);

// File CRUD
router.get('/', fileController.getAllFiles);
router.post('/', fileController.createFile);
router.get('/:id', fileController.getFileById);
router.patch('/:id', fileController.updateFile);
router.delete('/:id', fileController.deleteFile);

// Permissions (nested resource)
router.get('/:id/permissions', permissionController.getPermissions);
router.post('/:id/permissions', permissionController.addPermission);
router.patch('/:id/permissions/:pId', permissionController.updatePermission);
router.delete('/:id/permissions/:pId', permissionController.removePermission);

module.exports = router;
