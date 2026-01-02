const { usersStore } = require('../models/usersStore');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/storage
 * Get storage usage and limit for authenticated user
 */
const getStorageInfo = asyncHandler(async (req, res) => {
    const userId = req.userId;
    
    // Get storage limit from environment (in bytes)
    const storageLimitMB = parseInt(process.env.STORAGE_LIMIT_MB) || 100;
    const storageLimitBytes = storageLimitMB * 1024 * 1024;
    
    // Get user's current storage usage
    const storageUsedBytes = await usersStore.getStorageUsed(userId);
    
    // Calculate available storage
    const storageAvailableBytes = storageLimitBytes - storageUsedBytes;
    
    res.status(200).json({
        storageUsed: storageUsedBytes,
        storageLimit: storageLimitBytes,
        storageAvailable: storageAvailableBytes,
        storageUsedMB: parseFloat((storageUsedBytes / (1024 * 1024)).toFixed(2)),
        storageLimitMB: storageLimitMB,
        storageAvailableMB: parseFloat((storageAvailableBytes / (1024 * 1024)).toFixed(2)),
        usagePercentage: parseFloat(((storageUsedBytes / storageLimitBytes) * 100).toFixed(2))
    });
});

module.exports = {
    getStorageInfo
};
