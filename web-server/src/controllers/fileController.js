const { fileService } = require('../services/fileService');
const { filterService } = require('../services/filterService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/files
 * Get all files in root folder (parentId = null)
 * Supports filtering via HTTP headers
 */
const getAllFiles = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Get all files
    let files = await fileService.getFilesInFolder({ parentId: null, userId: req.userId });
    
    // Apply filters
    files = filterService.applyFilters(files, filters, req.userId);
    
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

    // Normalize parentId: explicitly set to null if not provided
    const normalizedParentId = parentId !== undefined ? parentId : null;

    // If creating in a folder (parentId provided), check write permission
    if (normalizedParentId !== null) {
        const canWrite = await fileService.checkPermission({ userId: req.userId, fileId: normalizedParentId, action: 'Write' });
        if (!canWrite) {
            throw new Error('Permission denied: cannot create files in this folder');
        }
    }

    // Create file metadata (size will be set by uploadFile)
    const file = await fileService.createFile({
        name,
        type,
        ownerId: req.userId,
        parentId: normalizedParentId,
        size: 0  // Size will be updated by uploadFile
    });

    // If it's not a folder, upload to storage server
    if (type !== 'folder') {
        await fileService.uploadFile({ fileId: file.id, content });
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

    const file = await fileService.getFileInfo({ fileId: id, userId: req.userId });

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
        const fileInfo = await fileService.getFileInfo({ fileId: id, userId: req.userId });
        if (fileInfo.type === 'pdf' || fileInfo.type === 'image') {
            throw new Error(`Cannot modify content of ${fileInfo.type} files - they are read-only`);
        }
    }

    // Build updates object with only provided fields
    // Normalize: fields not provided should not be included (not set to null)
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (content !== undefined) updates.content = content;
    if (parentId !== undefined) updates.parentId = parentId;

    await fileService.updateFile({ fileId: id, updates, userId: req.userId });

    // Return 204 No Content
    res.status(204).end();
});

/**
 * DELETE /api/files/:id
 * Remove file or folder (move to trash or hide for non-owners)
 */
const deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await fileService.removeFile({ fileId: id, userId: req.userId });

    // Return result to inform frontend of action taken
    res.status(200).json(result);
});

/**
 * GET /api/files/starred
 * Get all starred files for current user
 * Supports filtering via HTTP headers
 */
const getStarredFiles = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Get starred files
    let files = await fileService.getStarredFiles({ userId: req.userId });
    
    // Apply filters
    files = filterService.applyFilters(files, filters, req.userId);
    
    res.status(200).json(files);
});

/**
 * GET /api/files/recent
 * Get recently accessed files for current user
 * Supports filtering via HTTP headers
 */
const getRecentFiles = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Get recent files
    let files = await fileService.getRecentFiles({ userId: req.userId });
    
    // Apply filters
    files = filterService.applyFilters(files, filters, req.userId);
    
    res.status(200).json(files);
});

/**
 * POST /api/files/:id/star
 * Toggle star status for a file
 */
const toggleStarFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await fileService.toggleStarFile({ fileId: id, userId: req.userId });
    res.status(200).json(result);
});

/**
 * POST /api/files/:id/copy
 * Copy a file or folder
 */
const copyFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { parentId, newName, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['parentId', 'newName'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Only parentId and newName are allowed`);
    }

    // Normalize optional fields: set to undefined if not provided (service will handle defaults)
    const options = {};
    if (parentId !== undefined) options.parentId = parentId;
    if (newName !== undefined) options.newName = newName;

    const copiedFile = await fileService.copyFile({ fileId: id, userId: req.userId, options });

    // Return 201 Created with Location header
    res.status(201)
       .location(`/api/files/${copiedFile.id}`)
       .json(copiedFile);
});

/**
 * GET /api/files/shared
 * Get files shared with current user
 * Supports filtering via HTTP headers
 */
const getSharedFiles = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Get shared files
    let files = await fileService.getSharedFiles({ userId: req.userId });
    
    // Apply filters
    files = filterService.applyFilters(files, filters, req.userId);
    
    res.status(200).json(files);
});

/**
 * GET /api/files/owned
 * Get all files owned by current user (excluding folders), sorted by size
 * Supports filtering via HTTP headers
 */
const getOwnedFiles = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Get sort order from query params (default: desc = largest first)
    const sortOrder = req.query.sortOrder || 'desc';
    
    // Get owned files
    let files = await fileService.getOwnedFiles({ userId: req.userId, sortOrder });
    
    // Apply filters
    files = filterService.applyFilters(files, filters, req.userId);
    
    res.status(200).json(files);
});

/**
 * GET /api/files/trash
 * Get all items in trash (top-level only)
 * Supports filtering via HTTP headers (ownership filter is ignored)
 */
const getTrashItems = asyncHandler(async (req, res) => {
    // Parse filter headers
    const filters = filterService.parseFilters(req.headers);
    
    // Trash always shows only user's own files - ignore ownership filter
    if (filterService.shouldIgnoreOwnershipFilter(req.path)) {
        delete filters.ownership;
    }
    
    // Get trash items
    let trashItems = await fileService.getTrashItems({ userId: req.userId });
    
    // Apply filters (excluding ownership)
    trashItems = filterService.applyFilters(trashItems, filters, req.userId);
    
    res.status(200).json(trashItems);
});

/**
 * DELETE /api/files/trash/:id
 * Permanently delete a file from trash
 */
const permanentDeleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await fileService.permanentDeleteFile({ fileId: id, userId: req.userId });
    res.status(204).end();
});

/**
 * POST /api/files/trash/:id/restore
 * Restore a file from trash
 */
const restoreFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await fileService.restoreFile({ fileId: id, userId: req.userId });
    res.status(204).end();
});

/**
 * DELETE /api/files/trash
 * Empty trash (permanently delete all trashed items)
 */
const emptyTrash = asyncHandler(async (req, res) => {
    const result = await fileService.emptyTrash({ userId: req.userId });
    res.status(200).json(result);
});

/**
 * POST /api/files/trash/restore
 * Restore all items from trash
 */
const restoreAllTrash = asyncHandler(async (req, res) => {
    const result = await fileService.restoreAllTrash({ userId: req.userId });
    res.status(200).json(result);
});

/**
 * GET /api/files/:id/download
 * Download file or export folder (flattened recursive)
 */
const downloadFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await fileService.downloadFile({ fileId: id, userId: req.userId });

    if (result.type === 'file') {
        // Single file download: stream binary with proper headers
        res.setHeader('Content-Type', result.contentType);
        // Use 'inline' to display in browser, not force download
        // Encode filename to handle special characters (Hebrew, etc.)
        const encodedFileName = encodeURIComponent(result.fileName);
        res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFileName}`);
        res.setHeader('Content-Length', result.size);
        res.status(200).send(result.buffer);
    } else if (result.type === 'folder') {
        // Folder export: return flattened JSON array
        res.status(200).json(result.files);
    } else {
        throw new Error('Invalid download type');
    }
});

module.exports = {
    getAllFiles,
    createFile,
    getFileById,
    updateFile,
    deleteFile,
    getStarredFiles,
    getRecentFiles,
    getOwnedFiles,
    toggleStarFile,
    copyFile,
    getSharedFiles,
    getTrashItems,
    permanentDeleteFile,
    restoreFile,
    emptyTrash,
    restoreAllTrash,
    downloadFile
};
