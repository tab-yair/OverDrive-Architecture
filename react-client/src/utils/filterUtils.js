/**
 * Filter Utilities
 * Provides scalable filtering architecture for OverDrive API
 * 
 * This utility enables future-proof filtering by centralizing header generation.
 * Adding new filters requires only updating this file, not individual components.
 */

/**
 * Converts filter state object to API headers
 * @param {Object} filters - Filter state object
 * @returns {Object} - HTTP headers for API requests
 * 
 * Supported filters:
 * - type: array of file types (image, folder, pdf, docs)
 * - dateCategory: predefined date range (today, last7days, last30days, thisyear, lastyear)
 * - dateStart/dateEnd: custom date range (ISO 8601)
 * - ownership: ownership filter (owned, shared, all)
 * - starred: starred status (true, false, null)
 */
export const getFilterHeaders = (filters = {}) => {
    const headers = {};

    // File type filter
    if (filters.type && Array.isArray(filters.type) && filters.type.length > 0) {
        headers['x-filter-type'] = filters.type.join(',');
    }

    // Date category filter (predefined ranges)
    if (filters.dateCategory) {
        headers['x-filter-date-category'] = filters.dateCategory;
    }

    // Custom date range filter (takes precedence over dateCategory)
    if (filters.dateStart && filters.dateEnd) {
        headers['x-filter-date-start'] = filters.dateStart;
        headers['x-filter-date-end'] = filters.dateEnd;
    }

    // Ownership filter
    if (filters.ownership) {
        headers['x-filter-ownership'] = filters.ownership;
    }

    // Starred filter
    if (filters.starred !== null && filters.starred !== undefined) {
        headers['x-filter-starred'] = String(filters.starred);
    }

    // Future filters can be added here:
    // if (filters.size) headers['x-filter-size'] = filters.size;
    // if (filters.tags) headers['x-filter-tags'] = filters.tags.join(',');

    return headers;
};

/**
 * Creates default filter state for different page types
 * @param {string} pageType - Type of page (mydrive, shared, recent, trash, starred)
 * @returns {Object} - Default filter state
 */
export const getDefaultFilters = (pageType) => {
    const defaults = {
        type: [],
        dateCategory: null,
        dateStart: null,
        dateEnd: null,
        ownership: 'all',
        starred: null
    };

    // Page-specific defaults
    switch (pageType) {
        case 'mydrive':
            return { ...defaults, ownership: 'owned' }; // Show only owned items
        case 'shared':
            return { ...defaults }; // API handles this automatically
        case 'recent':
            return { ...defaults }; // Show all recent items
        case 'starred':
            return { ...defaults }; // Show all starred items
        case 'trash':
            return { ...defaults }; // Show trash items (ownership filter ignored by backend)
        default:
            return defaults;
    }
};

/**
 * Validates filter values
 * @param {Object} filters - Filter state to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const validateFilters = (filters) => {
    const errors = [];

    // Validate type
    const validTypes = ['image', 'folder', 'pdf', 'docs'];
    if (filters.type && Array.isArray(filters.type)) {
        const invalidTypes = filters.type.filter(t => !validTypes.includes(t));
        if (invalidTypes.length > 0) {
            errors.push(`Invalid file types: ${invalidTypes.join(', ')}`);
        }
    }

    // Validate dateCategory
    const validDateCategories = ['today', 'last7days', 'last30days', 'thisyear', 'lastyear'];
    if (filters.dateCategory && !validDateCategories.includes(filters.dateCategory)) {
        errors.push(`Invalid date category: ${filters.dateCategory}`);
    }

    // Validate ownership
    const validOwnership = ['owned', 'shared', 'all'];
    if (filters.ownership && !validOwnership.includes(filters.ownership)) {
        errors.push(`Invalid ownership: ${filters.ownership}`);
    }

    // Validate custom date range
    if ((filters.dateStart && !filters.dateEnd) || (!filters.dateStart && filters.dateEnd)) {
        errors.push('Both dateStart and dateEnd are required for custom date range');
    }

    if (filters.dateStart && filters.dateEnd) {
        const start = new Date(filters.dateStart);
        const end = new Date(filters.dateEnd);
        if (start > end) {
            errors.push('Start date must be before end date');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Merges new filters with existing ones
 * @param {Object} currentFilters - Current filter state
 * @param {Object} newFilters - New filters to apply
 * @returns {Object} - Merged filter state
 */
export const mergeFilters = (currentFilters, newFilters) => {
    return {
        ...currentFilters,
        ...newFilters
    };
};

/**
 * Clears all filters to default state
 * @returns {Object} - Empty filter state
 */
export const clearFilters = () => {
    return {
        type: [],
        dateCategory: null,
        dateStart: null,
        dateEnd: null,
        ownership: 'all',
        starred: null
    };
};
