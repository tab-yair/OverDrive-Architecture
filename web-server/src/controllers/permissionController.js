const {permissionService} = require('../services/permissionService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/files/:id/permissions
 * Get list of users who have access to file
 */
const getPermissions = asyncHandler(async (req, res) => {
    const { id: fileId } = req.params;

    const permissions = await permissionService.getFilePermissions({ fileId, requestingUserId: req.userId });

    res.status(200).json(permissions);
});

/**
 * POST /api/files/:id/permissions
 * Share file with another user
 */
const addPermission = asyncHandler(async (req, res) => {
    const { id: fileId } = req.params;
    const { targetUserId, permissionLevel, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['targetUserId', 'permissionLevel'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Only targetUserId and permissionLevel are allowed`);
    }

    // Validate input
    if (!targetUserId) {
        throw new Error('targetUserId is required');
    }

    if (!permissionLevel) {
        throw new Error('permissionLevel is required');
    }

    // Validate and normalize permission level
    const validLevels = ['VIEWER', 'EDITOR', 'OWNER'];
    const normalizedLevel = permissionLevel.toUpperCase();
    if (!validLevels.includes(normalizedLevel)) {
        throw new Error('permissionLevel must be VIEWER, EDITOR, or OWNER');
    }

    // Add permission
    const permission = await permissionService.addPermission({
        fileId,
        userId: targetUserId,
        level: normalizedLevel,
        requestingUserId: req.userId
    });

    // Return 201 Created with Location header (empty body per assignment spec)
    res.status(201)
       .location(`/api/files/${fileId}/permissions/${permission.pid}`)
       .end();
});

/**
 * PATCH /api/files/:id/permissions/:pId
 * Update permission level only
 * Send only permissionLevel to change
 */
const updatePermission = asyncHandler(async (req, res) => {
    const { pId: permissionId } = req.params;
    const { permissionLevel, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['permissionLevel'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Only permissionLevel is allowed`);
    }

    // Permission level must be provided
    if (!permissionLevel) {
        throw new Error('permissionLevel is required');
    }

    // Build updates object
    const updates = {};

    // Validate and normalize permission level
    const validLevels = ['VIEWER', 'EDITOR', 'OWNER'];
    const normalizedLevel = permissionLevel.toUpperCase();
    if (!validLevels.includes(normalizedLevel)) {
        throw new Error('permissionLevel must be VIEWER, EDITOR, or OWNER');
    }
    updates.level = normalizedLevel;

    // Update permission (service will handle OWNER as ownership transfer)
    await permissionService.updatePermission({
        permissionId,
        updates,
        requestingUserId: req.userId
    });

    // Return 204 No Content
    res.status(204).end();
});

/**
 * DELETE /api/files/:id/permissions/:pId
 * Remove user's access to file
 */
const removePermission = asyncHandler(async (req, res) => {
    const { pId: permissionId } = req.params;

    await permissionService.removePermission({ permissionId, requestingUserId: req.userId });

    // Return 204 No Content
    res.status(204).end();
});

module.exports = {
    getPermissions,
    addPermission,
    updatePermission,
    removePermission
};
