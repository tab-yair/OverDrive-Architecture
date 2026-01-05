/**
 * API Service Layer
 * Centralized API calls with JWT authentication
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

/**
 * Get authorization headers with Bearer token
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization
 */
export function getAuthHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * User API endpoints
 */
export const userApi = {
    /**
     * Get user profile
     * @param {string} token - JWT token
     * @param {string} userId - User ID
     */
    async getUser(token, userId) {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }
        return response.json();
    },

    /**
     * Update user profile
     * @param {string} token - JWT token
     * @param {string} userId - User ID
     * @param {Object} updates - Fields to update (password, firstName, lastName, profileImage)
     */
    async updateUser(token, userId, updates) {
        const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token),
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to update user profile');
        }
        return response.json();
    },

    /**
     * Get user preferences from localStorage
     * TODO: Replace with API call when server implements GET /api/users/:id/preferences
     * @param {string} userId - User ID
     */
    getPreferences(userId) {
        const stored = localStorage.getItem(`preferences_${userId}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return { theme: 'system', startPage: 'home' };
            }
        }
        return { theme: 'system', startPage: 'home' };
    },

    /**
     * Update user preferences in localStorage
     * TODO: Replace with API call when server implements PATCH /api/users/:id/preferences
     * @param {string} userId - User ID
     * @param {Object} preferences - Preferences to update
     */
    updatePreferences(userId, preferences) {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...preferences };
        localStorage.setItem(`preferences_${userId}`, JSON.stringify(updated));
        return updated;
    }
};

/**
 * Storage API endpoints
 */
export const storageApi = {
    /**
     * Get storage info
     * @param {string} token - JWT token
     * @returns {Object} { storageUsed, storageLimit, storageAvailable, storageUsedMB, storageLimitMB, storageAvailableMB, usagePercentage }
     */
    async getStorageInfo(token) {
        const response = await fetch(`${API_BASE_URL}/api/storage`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch storage info');
        }
        return response.json();
    }
};

/**
 * Files API endpoints
 */
export const filesApi = {
    /**
     * Get all files at root level
     * @param {string} token - JWT token
     * @param {Object} options - Query options
     */
    async getFiles(token, options = {}) {
        const params = new URLSearchParams();
        if (options.parentId) params.append('parentId', options.parentId);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.sortOrder) params.append('sortOrder', options.sortOrder);

        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/files${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }
        return response.json();
    },

    /**
     * Create a new file or folder
     * @param {string} token - JWT token
     * @param {Object} data - File data { name, type: 'file'|'folder', parentId?, content? }
     */
    async createFile(token, data) {
        const response = await fetch(`${API_BASE_URL}/api/files`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create file');
        }
        return response.json();
    },

    /**
     * Upload a file
     * @param {string} token - JWT token
     * @param {File} file - File object to upload
     * @param {string} parentId - Parent folder ID (optional)
     */
    async uploadFile(token, file, parentId = null) {
        const formData = new FormData();
        formData.append('file', file);
        if (parentId) {
            formData.append('parentId', parentId);
        }

        const response = await fetch(`${API_BASE_URL}/api/files`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Note: Don't set Content-Type for FormData, browser will set it with boundary
            },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to upload file');
        }
        return response.json();
    },

    /**
     * Get file details
     * @param {string} token - JWT token
     * @param {string} fileId - File ID
     */
    async getFile(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch file');
        }
        return response.json();
    },

    /**
     * Search files
     * @param {string} token - JWT token
     * @param {string} query - Search query
     */
    async searchFiles(token, query) {
        const response = await fetch(`${API_BASE_URL}/api/search/${encodeURIComponent(query)}`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to search files');
        }
        return response.json();
    }
};

/**
 * Format bytes to human readable string
 * @param {number} bytes - Bytes to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
export function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
