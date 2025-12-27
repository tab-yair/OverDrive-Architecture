const {fileService} = require('../services/fileService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/search/:query
 * Search files by name and content
 */
const searchFiles = asyncHandler(async (req, res) => {
    const { query } = req.params;

    if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
    }

    const results = await fileService.searchFiles({ query, userId: req.userId });

    res.status(200).json(results);
});

module.exports = {
    searchFiles
};
