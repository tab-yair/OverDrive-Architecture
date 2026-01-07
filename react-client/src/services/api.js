/**
 * api.js
 * Unified API Service Layer
 * Combines Authentication, User Profile, Storage, and File management logic.
 */
import { jwtDecode } from "jwt-decode";

// Base URL for the backend server
const API_BASE_URL = 'http://localhost:3000';

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
     * Fetches files with optional sorting and parentId filters.
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
        return response.json();
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
        return response.json();
    },

    /**
     * Fetches details for a specific file.
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