const { fileService } = require('../services/fileService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/files
 * Get all files in root folder (parentId = null)
 */
const getAllFiles = asyncHandler(async (req, res) => {
    const files = await fileService.getFilesInFolder(null, req.userId);
    res.status(200).json(files);
});

/**
 * POST /api/files
 * Create new file or folder
 */
const createFile = asyncHandler(async (req, res) => {
    const { name, type, content, parentId, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['name', 'type', 'content', 'parentId'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Only name, type, content, and parentId are allowed`);
    }

    // Validate required fields
    if (!name) {
        throw new Error('Name is required');
    }

    if (!type) {
        throw new Error('Type is required (folder, docs, pdf, or image)');
    }

    // If it's not a folder, content is required
    if (type !== 'folder' && content === undefined) {
        throw new Error('Content is required for docs, pdf, and image files');
    }

    // If creating in a folder (parentId provided), check write permission
    if (parentId) {
        const canWrite = await fileService.checkPermission(req.userId, parentId, 'Write');
        if (!canWrite) {
            throw new Error('Permission denied: cannot create files in this folder');
        }
    }

    // Create file metadata (size will be set by uploadFile)
    const file = await fileService.createFile({
        name,
        type,
        ownerId: req.userId,
        parentId,
        size: 0  // Size will be updated by uploadFile
    });

    // If it's not a folder, upload to storage server
    if (type !== 'folder') {
        await fileService.uploadFile(file.id, content);
    }

    // Return 201 Created with Location header (empty body per assignment spec)
    res.status(201)
       .location(`/api/files/${file.id}`)
       .end();
});

/**
 * GET /api/files/:id
 * Get file metadata and content
 */
const getFileById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const file = await fileService.getFileInfo(id, req.userId);

    res.status(200).json(file);
});

/**
 * PATCH /api/files/:id
 * Update file (name, content, or parent)
 */
const updateFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, content, parentId, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['name', 'content', 'parentId'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Only name, content, and parentId are allowed`);
    }

    // At least one field must be provided
    if (name === undefined && content === undefined && parentId === undefined) {
        throw new Error('At least one field (name, content, parentId) must be provided');
    }

    // If content update is requested, check if file type allows it
    if (content !== undefined) {
        const fileInfo = await fileService.getFileInfo(id, req.userId);
        if (fileInfo.type === 'pdf' || fileInfo.type === 'image') {
            throw new Error(`Cannot modify content of ${fileInfo.type} files - they are read-only`);
        }
    }

    // Build updates object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (parentId !== undefined) updates.parentId = parentId;

    await fileService.updateFile(id, updates, req.userId);

    // Return 204 No Content
    res.status(204).end();
});

/**
 * DELETE /api/files/:id
 * Remove file or folder (move to trash or hide for non-owners)
 */
const deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await fileService.removeFile(id, req.userId);

    // Return 204 No Content
    res.status(204).end();
});

/**
 * GET /api/files/starred
 * Get all starred files for current user
 */
const getStarredFiles = asyncHandler(async (req, res) => {
    const files = await fileService.getStarredFiles(req.userId);
    res.status(200).json(files);
});

/**
 * GET /api/files/recent
 * Get recently accessed files for current user
 */
const getRecentFiles = asyncHandler(async (req, res) => {
    const files = await fileService.getRecentFiles(req.userId);
    res.status(200).json(files);
});

/**
 * POST /api/files/:id/star
 * Toggle star status for a file
 */
const toggleStarFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await fileService.toggleStarFile(id, req.userId);
    res.status(200).json(result);
});

/**
 * POST /api/files/:id/copy
 * Copy a file or folder
 */
const copyFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { parentId, newName } = req.body;

    const copiedFile = await fileService.copyFile(id, req.userId, { parentId, newName });

    // Return 201 Created with Location header
    res.status(201)
       .location(`/api/files/${copiedFile.id}`)
       .json(copiedFile);
});

/**
 * GET /api/files/shared
 * Get files shared with current user
 */
const getSharedFiles = asyncHandler(async (req, res) => {
    const files = await fileService.getSharedFiles(req.userId);
    res.status(200).json(files);
});

/**
 * GET /api/files/trash
 * Get all items in trash (top-level only)
 */
const getTrashItems = asyncHandler(async (req, res) => {
    const trashItems = await fileService.getTrashItems(req.userId);
    res.status(200).json(trashItems);
});

/**
 * DELETE /api/files/trash/:id
 * Permanently delete a file from trash
 */
const permanentDeleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await fileService.permanentDeleteFile(id, req.userId);
    res.status(204).end();
});

/**
 * POST /api/files/trash/:id/restore
 * Restore a file from trash
 */
const restoreFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await fileService.restoreFile(id, req.userId);
    res.status(204).end();
});

/**
 * DELETE /api/files/trash
 * Empty trash (permanently delete all trashed items)
 */
const emptyTrash = asyncHandler(async (req, res) => {
    const result = await fileService.emptyTrash(req.userId);
    res.status(200).json(result);
});

/**
 * POST /api/files/trash/restore
 * Restore all items from trash
 */
const restoreAllTrash = asyncHandler(async (req, res) => {
    const result = await fileService.restoreAllTrash(req.userId);
    res.status(200).json(result);
});

module.exports = {
    getAllFiles,
    createFile,
    getFileById,
    updateFile,
    deleteFile,
    getStarredFiles,
    getRecentFiles,
    toggleStarFile,
    copyFile,
    getSharedFiles,
    getTrashItems,
    permanentDeleteFile,
    restoreFile,
    emptyTrash,
    restoreAllTrash
};
