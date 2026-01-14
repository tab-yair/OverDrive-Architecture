/**
 * api.js
 * Unified API Service Layer
 * Combines Authentication, User Profile, Storage, and File management logic.
 */
import { jwtDecode } from "jwt-decode";

// Base URL for the backend server
// Use environment variable if available, fallback to localhost
// Note: In production Docker, env vars must be set at build time
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || 'http://localhost:3000';

console.log('🌐 API Base URL:', API_BASE_URL);

/**
 * Helper to generate authorization headers with Bearer token.
 * @param {string} token - JWT token
 */
export function getAuthHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Authentication API Logic
 * Handles user registration and token-based login.
 */
export const authApi = {
    /**
     * Registers a new user with profile data.
     */
    register: async (userData) => {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
        return await response.json();
    },

    /**
     * Authenticates user and decodes the JWT to return userId.
     */
    login: async (username, password) => {
        const response = await fetch(`${API_BASE_URL}/api/tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Invalid credentials');
        }

        const data = await response.json();
        const token = data.token;
        const decoded = jwtDecode(token);
        
        return { token, userId: decoded.userId };
    }
};

/**
 * User Profile & Preferences API
 */
export const userApi = {
    /**
     * Fetches user profile data by ID.
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
     * Updates user profile fields (password, names, image).
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

        // No content returned on success
        if (response.status === 204) {
            return { success: true };
        }

        return response.json();
    },

    /**
     * Searches for a user by email address.
     * Returns user ID and basic profile info for sharing.
     */
    async searchUserByEmail(token, email) {
        const response = await fetch(`${API_BASE_URL}/api/users/search?email=${encodeURIComponent(email)}`, {
            headers: getAuthHeaders(token)
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('User not found');
            }
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to search user');
        }
        
        return response.json();
    },

    /**
     * Local storage fallback for user preferences.
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

    updatePreferences(userId, preferences) {
        const current = this.getPreferences(userId);
        const updated = { ...current, ...preferences };
        localStorage.setItem(`preferences_${userId}`, JSON.stringify(updated));
        return updated;
    }
};

/**
 * Storage & Statistics API
 */
export const storageApi = {
    /**
     * Fetches server-side storage usage statistics.
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
 * Files Management API
 */
export const filesApi = {
    /**
     * Fetches files with optional sorting, parentId filters, and custom headers.
     */
    async getFiles(token, options = {}) {
        const params = new URLSearchParams();
        if (options.parentId) params.append('parentId', options.parentId);
        if (options.sortBy) params.append('sortBy', options.sortBy);
        if (options.sortOrder) params.append('sortOrder', options.sortOrder);

        const queryString = params.toString();
        const url = `${API_BASE_URL}/api/files${queryString ? `?${queryString}` : ''}`;

        // Merge auth headers with custom filter headers
        const headers = {
            ...getAuthHeaders(token),
            ...(options.headers || {})
        };

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }
        return response.json();
    },

    /**
     * Generic file fetcher for endpoints that support filter headers
     * @private
     */
    async _fetchWithFilters(token, endpoint, errorMessage, options = {}) {
        const headers = {
            ...getAuthHeaders(token),
            ...(options.headers || {})
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
        if (!response.ok) {
            throw new Error(errorMessage);
        }
        return response.json();
    },

    /**
     * Fetches a single file by ID (triggers VIEW interaction)
     * Use this ONLY when user explicitly opens/previews file content
     * For metadata display (Details Panel), use data from FilesContext
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
     * Fetches shared files (where user has direct VIEWER/EDITOR permission, not owner)
     */
    async getSharedFiles(token, options = {}) {
        return this._fetchWithFilters(token, '/api/files/shared', 'Failed to fetch shared files', options);
    },

    /**
     * Fetches recently accessed files
     */
    async getRecentFiles(token, options = {}) {
        return this._fetchWithFilters(token, '/api/files/recent', 'Failed to fetch recent files', options);
    },

    /**
     * Fetches starred files
     */
    async getStarredFiles(token, options = {}) {
        return this._fetchWithFilters(token, '/api/files/starred', 'Failed to fetch starred files', options);
    },

    /**
     * Fetches trash items
     */
    async getTrashFiles(token, options = {}) {
        return this._fetchWithFilters(token, '/api/files/trash', 'Failed to fetch trash', options);
    },

    /**
     * Toggles star status for a file
     */
    async toggleStar(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/star`, {
            method: 'POST',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to toggle star');
        }
        return response.json();
    },

    /**
     * Restores a file from trash
     */
    async restoreFromTrash(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/trash/${fileId}/restore`, {
            method: 'POST',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to restore file');
        }
        // 204 No Content
        return { success: true };
    },

    /**
     * Permanently deletes a file from trash
     */
    async permanentDelete(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/trash/${fileId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to permanently delete file');
        }
        // 204 No Content
        return { success: true };
    },

    /**
     * Empties all trash
     */
    async emptyTrash(token) {
        const response = await fetch(`${API_BASE_URL}/api/files/trash`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to empty trash');
        }
        // 204 No Content
        return { success: true };
    },

    /**
     * Restores all items from trash
     */
    async restoreAllTrash(token) {
        const response = await fetch(`${API_BASE_URL}/api/files/trash/restore`, {
            method: 'POST',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to restore all trash');
        }
        // 204 No Content
        return { success: true };
    },

    /**
     * Creates a new folder or file metadata entry.
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
        
        // Server returns 201 with empty body - extract file ID from Location header
        if (response.status === 201) {
            const location = response.headers.get('Location');
            if (location) {
                const fileId = location.split('/').pop();
                return { id: fileId, success: true };
            }
        }
        
        // Fallback: try to parse JSON (for backwards compatibility)
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true };
    },

    /**
     * Uploads a physical file using FormData.
     */
    async uploadFile(token, file, parentId = null) {
        const formData = new FormData();
        formData.append('file', file);
        if (parentId) {
            formData.append('parentId', parentId);
        }

        const response = await fetch(`${API_BASE_URL}/api/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to upload file');
        }
        
        // Server returns 201 with empty body - extract file ID from Location header
        if (response.status === 201) {
            const location = response.headers.get('Location');
            if (location) {
                const fileId = location.split('/').pop();
                return { id: fileId, success: true };
            }
        }
        
        // Fallback: try to parse JSON (for backwards compatibility)
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true };
    },

    /**
     * Fetches details for a specific file.
     * IMPORTANT: This triggers VIEW interaction and updates lastViewedAt
     * Use only when user explicitly opens/previews file content
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
     * Updates file metadata (name, parentId) or content (docs only)
     * Automatically records EDIT interaction for content changes
     */
    async updateFile(token, fileId, updates) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token),
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to update file');
        }
        
        // Check if response has content (200) or is empty (204)
        if (response.status === 204) {
            return { success: true };
        }
        
        // Try to parse JSON, return success if empty
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true };
    },

    /**
     * Deletes a file (moves to trash for owners, hides for viewers/editors)
     * Returns { success, action, message } where action is 'trashed' or 'hidden'
     */
    async deleteFile(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
        return response.json();
    },

    /**
     * Searches for files by query string.
     */
    async searchFiles(token, query) {
        const response = await fetch(`${API_BASE_URL}/api/search/${encodeURIComponent(query)}`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to search files');
        }
        return response.json();
    },

    /**
     * Gets all permissions for a file/folder
     */
    async getPermissions(token, fileId) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/permissions`, {
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            throw new Error('Failed to fetch permissions');
        }
        return response.json();
    },

    /**
     * Grants a new permission to a user
     * @param {string} token - JWT token
     * @param {string} fileId - File/folder ID
     * @param {string} targetUserId - User ID to grant permission to
     * @param {string} permissionLevel - VIEWER, EDITOR, or OWNER
     */
    async grantPermission(token, fileId, targetUserId, permissionLevel) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/permissions`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ targetUserId, permissionLevel })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to grant permission');
        }
        // 201 Created with Location header
        if (response.status === 201) {
            const location = response.headers.get('Location');
            if (location) {
                const permissionId = location.split('/').pop();
                return { id: permissionId, success: true };
            }
        }
        return { success: true };
    },

    /**
     * Updates an existing permission (including ownership transfer)
     * @param {string} token - JWT token
     * @param {string} fileId - File/folder ID
     * @param {string} permissionId - Permission ID
     * @param {string} permissionLevel - VIEWER, EDITOR, or OWNER
     */
    async updatePermission(token, fileId, permissionId, permissionLevel) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/permissions/${permissionId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ permissionLevel })
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to update permission');
        }
        // 204 No Content
        return { success: true };
    },

    /**
     * Revokes a permission
     * @param {string} token - JWT token
     * @param {string} fileId - File/folder ID
     * @param {string} permissionId - Permission ID
     */
    async revokePermission(token, fileId, permissionId) {
        const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/permissions/${permissionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || 'Failed to revoke permission');
        }
        // 204 No Content
        return { success: true };
    }
};

/**
 * Utility: Format bytes to human-readable format.
 */
export function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Permissions API (alias to filesApi methods for convenience)
 */
export const permissionsApi = {
    getPermissions: filesApi.getPermissions,
    grantPermission: filesApi.grantPermission,
    updatePermission: filesApi.updatePermission,
    revokePermission: filesApi.revokePermission
};

/**
 * Legacy Support / Default Export
 * Allows existing login/register components to work without changes.
 */
export const apiService = {
    register: authApi.register,
    login: authApi.login,
    getUserProfile: userApi.getUser,
    getFiles: filesApi.getFiles
};

export default apiService;
