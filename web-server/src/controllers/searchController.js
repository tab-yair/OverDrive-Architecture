const {fileService} = require('../services/fileService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/search/:query
 * Search with optional filters via HTTP headers:
 * - X-Search-In: Where to search - 'name', 'content', or 'both' (default: 'both')
 * - X-Filter-Type: File type (image, folder, pdf, docs)
 * - X-Filter-Owner: owned, shared
 * - X-Filter-Date-Category: today, last7days, last30days, thisyear, lastyear
 * - X-Filter-Date-Start/End: Custom date range
 * - X-Filter-Shared-With: User ID to filter files shared with specific user
 * - X-Filter-Starred: true/false
 */
const searchFiles = asyncHandler(async (req, res) => {
    const query = req.params.query;
    const headers = req.headers;

    // Validate query
    if (!query || query.trim().length === 0) {
        const error = new Error('Search query is required');
        error.status = 400;
        throw error;
    }

    // Parse search location (where to search)
    const searchIn = headers['x-search-in'] ? headers['x-search-in'].toLowerCase() : 'both';
    if (!['name', 'content', 'both'].includes(searchIn)) {
        const error = new Error(`Invalid search-in value: ${searchIn}. Must be 'name', 'content', or 'both'`);
        error.status = 400;
        throw error;
    }

    const searchTerm = query.trim();
    const searchName = (searchIn === 'name' || searchIn === 'both') ? searchTerm : null;
    const searchContent = (searchIn === 'content' || searchIn === 'both') ? searchTerm : null;

    // Parse type filter
    let type = null;
    if (headers['x-filter-type']) {
        const validTypes = ['image', 'folder', 'pdf', 'docs'];
        type = headers['x-filter-type'].split(',').map(t => t.trim().toLowerCase());
        
        for (const t of type) {
            if (!validTypes.includes(t)) {
                const error = new Error(`Invalid file type: ${t}. Allowed types: ${validTypes.join(', ')}`);
                error.status = 400;
                throw error;
            }
        }
    }

    // Parse owner filter
    let owner = null;
    if (headers['x-filter-owner']) {
        owner = headers['x-filter-owner'].toLowerCase();
        if (!['owned', 'shared'].includes(owner)) {
            const error = new Error(`Invalid owner filter: ${owner}. Must be 'owned' or 'shared'`);
            error.status = 400;
            throw error;
        }
    }

    // Parse date range
    let dateRange = null;
    const dateCategory = headers['x-filter-date-category'];
    if (dateCategory) {
        const validCategories = ['today', 'last7days', 'last30days', 'thisyear', 'lastyear'];
        if (!validCategories.includes(dateCategory.toLowerCase())) {
            const error = new Error(`Invalid date category: ${dateCategory}. Must be one of: ${validCategories.join(', ')}`);
            error.status = 400;
            throw error;
        }
        dateRange = calculateDateRange(dateCategory.toLowerCase());
    }

    // Custom date range overrides category
    const startDate = headers['x-filter-date-start'];
    const endDate = headers['x-filter-date-end'];
    if (startDate || endDate) {
        if (!startDate || !endDate) {
            const error = new Error('Both x-filter-date-start and x-filter-date-end are required for custom date range');
            error.status = 400;
            throw error;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            const error = new Error('Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)');
            error.status = 400;
            throw error;
        }

        if (start > end) {
            const error = new Error('Invalid date range: end date must be after start date');
            error.status = 400;
            throw error;
        }

        dateRange = { start, end };
    }

    // Parse sharedWith filter
    const sharedWith = headers['x-filter-shared-with'] || null;

    // Parse starred filter
    let isStarred = null;
    if (headers['x-filter-starred']) {
        const starredValue = headers['x-filter-starred'].toLowerCase();
        if (starredValue === 'true') {
            isStarred = true;
        } else if (starredValue === 'false') {
            isStarred = false;
        } else {
            const error = new Error('Invalid starred filter: must be "true" or "false"');
            error.status = 400;
            throw error;
        }
    }

    // Note: query is always provided (required in path), filters are optional

    const results = await fileService.searchFiles({ 
        searchName,
        searchContent,
        type,
        owner,
        dateRange,
        sharedWith,
        isStarred,
        userId: req.userId 
    });

    res.status(200).json(results);
});

// Helper function to calculate date ranges
function calculateDateRange(category) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (category) {
        case 'today':
            return {
                start: today,
                end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
            };
        
        case 'last7days':
            return {
                start: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
                end: now
            };
        
        case 'last30days':
            return {
                start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
                end: now
            };
        
        case 'thisyear':
            return {
                start: new Date(now.getFullYear(), 0, 1),
                end: now
            };
        
        case 'lastyear':
            return {
                start: new Date(now.getFullYear() - 1, 0, 1),
                end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
            };
        
        default:
            return null;
    }
}

module.exports = {
    searchFiles
};
