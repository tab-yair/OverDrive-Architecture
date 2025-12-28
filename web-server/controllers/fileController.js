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
        throw new Error('Type is required (file or folder)');
    }

    // If it's a file (not folder), content might be required
    if (type === 'file' && content === undefined) {
        throw new Error('Content is required for files');
    }

    // Calculate size for files
    const size = type === 'file' && content ? Buffer.byteLength(content) : 0;

    // Create file metadata
    const file = await fileService.createFile({
        name,
        type,
        ownerId: req.userId,
        parentId,
        size
    });

    // If it's a file (not folder), upload to storage server
    if (type === 'file') {
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
 * Delete file or folder (recursive)
 */
const deleteFile = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await fileService.deleteFile(id, req.userId);

    // Return 204 No Content
    res.status(204).end();
});

module.exports = {
    getAllFiles,
    createFile,
    getFileById,
    updateFile,
    deleteFile
};
