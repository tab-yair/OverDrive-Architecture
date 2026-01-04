const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const fileController = require('../controllers/fileController');
const permissionController = require('../controllers/permissionController');

// All file routes require authentication
router.use(requireAuth);

// Special routes (must be before /:id routes to avoid conflicts with id parameter)
// Trash management
router.get('/trash', fileController.getTrashItems);
router.delete('/trash/:id', fileController.permanentDeleteFile);
router.post('/trash/:id/restore', fileController.restoreFile);
router.delete('/trash', fileController.emptyTrash);
router.post('/trash/restore', fileController.restoreAllTrash);

// File starred, recent, and shared
router.get('/starred', fileController.getStarredFiles);
router.get('/recent', fileController.getRecentFiles);
router.get('/shared', fileController.getSharedFiles);

// File CRUD
router.get('/', fileController.getAllFiles);
router.post('/', fileController.createFile);
router.get('/:id', fileController.getFileById);
router.patch('/:id', fileController.updateFile);
router.delete('/:id', fileController.deleteFile);

// File actions (after :id routes because they have more specific paths)
router.post('/:id/star', fileController.toggleStarFile);
router.post('/:id/copy', fileController.copyFile);
router.get('/:id/download', fileController.downloadFile);

// Permissions (nested resource)
router.get('/:id/permissions', permissionController.getPermissions);
router.post('/:id/permissions', permissionController.addPermission);
router.patch('/:id/permissions/:pId', permissionController.updatePermission);
router.delete('/:id/permissions/:pId', permissionController.removePermission);

module.exports = router;
