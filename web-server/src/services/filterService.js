// Filter Service
// Handles parsing and validation of HTTP header-based filters

class FilterService {
    
    parseFilters(headers) {
        const filters = {};

        // Parse File Type Filter
        const fileType = headers['x-filter-type'];
        if (fileType) {
            const validTypes = ['image', 'folder', 'pdf', 'docs'];
            // Support comma-separated types
            const types = fileType.split(',').map(t => t.trim().toLowerCase());
            
            // Validate all types
            for (const type of types) {
                if (!validTypes.includes(type)) {
                    const error = new Error(`Invalid file type: ${type}. Allowed types: ${validTypes.join(', ')}`);
                    error.status = 400;
                    throw error;
                }
            }
            
            filters.type = types;
        }

        // Parse Date Category Filter
        const dateCategory = headers['x-filter-date-category'];
        if (dateCategory) {
            const validCategories = ['today', 'last7days', 'last30days', 'thisyear', 'lastyear'];
            if (!validCategories.includes(dateCategory.toLowerCase())) {
                const error = new Error(`Invalid date category: ${dateCategory}. Must be one of: ${validCategories.join(', ')}`);
                error.status = 400;
                throw error;
            }
            filters.dateRange = this._calculateDateRange(dateCategory.toLowerCase());
        }

        // Parse Custom Date Range
        const startDate = headers['x-filter-date-start'];
        const endDate = headers['x-filter-date-end'];
        
        if (startDate || endDate) {
            // Both start and end required
            if (!startDate || !endDate) {
                const error = new Error('Both x-filter-date-start and x-filter-date-end are required for custom date range');
                error.status = 400;
                throw error;
            }

            // Validate and parse dates
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime())) {
                const error = new Error(`Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)`);
                error.status = 400;
                throw error;
            }

            if (isNaN(end.getTime())) {
                const error = new Error(`Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)`);
                error.status = 400;
                throw error;
            }

            if (start > end) {
                const error = new Error('Invalid date range: end date must be after start date');
                error.status = 400;
                throw error;
            }

            // Custom dates override category
            filters.dateRange = { start, end };
        }

        // Parse Ownership Filter
        const ownership = headers['x-filter-ownership'];
        if (ownership) {
            const validOwnerships = ['owned', 'shared', 'all'];
            if (!validOwnerships.includes(ownership.toLowerCase())) {
                const error = new Error(`Invalid ownership filter: ${ownership}. Must be one of: ${validOwnerships.join(', ')}`);
                error.status = 400;
                throw error;
            }
            filters.ownership = ownership.toLowerCase();
        } else {
            filters.ownership = 'all'; // Default
        }

        return filters;
    }

    _calculateDateRange(category) {
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

    applyFilters(files, filters, userId) {
        let filtered = files;

        // Apply type filter
        if (filters.type && filters.type.length > 0) {
            filtered = filtered.filter(file => filters.type.includes(file.type));
        }

        // Apply date range filter
        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            filtered = filtered.filter(file => {
                const modifiedDate = new Date(file.lastEditedAt || file.createdAt);
                
                if (start && modifiedDate < start) return false;
                if (end && modifiedDate > end) return false;
                
                return true;
            });
        }

        // Apply ownership filter
        if (filters.ownership && filters.ownership !== 'all') {
            if (filters.ownership === 'owned') {
                filtered = filtered.filter(file => file.ownerId === userId);
            } else if (filters.ownership === 'shared') {
                filtered = filtered.filter(file => file.ownerId !== userId);
            }
        }

        return filtered;
    }

    shouldIgnoreOwnershipFilter(path) {
        // Trash and storage endpoints always show only user's own data
        return path.includes('/trash') || path.includes('/storage');
    }
}

const filterService = new FilterService();

module.exports = { filterService, FilterService };
