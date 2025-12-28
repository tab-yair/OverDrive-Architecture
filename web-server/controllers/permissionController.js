const {permissionService} = require('../services/permissionService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/files/:id/permissions
 * Get list of users who have access to file
 */
const getPermissions = asyncHandler(async (req, res) => {
    const { id: fileId } = req.params;

    const permissions = await permissionService.getFilePermissions(fileId, req.userId);

    res.status(200).json(permissions);
});

/**
 * POST /api/files/:id/permissions
 * Share file with another user
 */
const addPermission = asyncHandler(async (req, res) => {
    const { id: fileId } = req.params;
    const { targetUserId, permissionLevel } = req.body;

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
    const { permissionLevel } = req.body;

    // Permission level must be provided
    if (!permissionLevel) {
        throw new Error('permission Level is required');
    }

    // Build updates object
    const updates = {};

    // Handle permission level change (OWNER not allowed, use POST for transfer)
    const validLevels = ['VIEWER', 'EDITOR'];
    const normalizedLevel = permissionLevel.toUpperCase();
    if (!validLevels.includes(normalizedLevel)) {
        throw new Error('permissionLevel must be VIEWER or EDITOR (use POST for ownership transfer)');
    }
    updates.level = normalizedLevel;

    // Update permission
    await permissionService.updatePermission(
        permissionId,
        updates,
        req.userId
    );

    // Return 204 No Content
    res.status(204).end();
});

/**
 * DELETE /api/files/:id/permissions/:pId
 * Remove user's access to file
 */
const removePermission = asyncHandler(async (req, res) => {
    const { pId: permissionId } = req.params;

    await permissionService.removePermission(permissionId, req.userId);

    // Return 204 No Content
    res.status(204).end();
});

module.exports = {
    getPermissions,
    addPermission,
    updatePermission,
    removePermission
};
