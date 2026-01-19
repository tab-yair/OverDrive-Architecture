/**
 * optimisticUpdates.js
 * 
 * Shared utilities for optimistic updates across all file operations.
 * Provides a consistent pattern for:
 * - Adding items (copy, upload, create)
 * - Removing items (delete, permanent delete)
 * - Updating items (rename, move, star, restore)
 * 
 * Each operation follows the pattern:
 * 1. Apply optimistic change immediately
 * 2. Call API
 * 3. Update with real result OR rollback on error
 */

/**
 * File operation status values
 * Used for visual feedback during optimistic operations
 */
export const FileStatus = {
    COPYING: 'copying',
    UPLOADING: 'uploading',
    MOVING: 'moving',
    DELETING: 'deleting',
    RESTORING: 'restoring',
    RENAMING: 'renaming',
};

/**
 * Generate a temporary ID for optimistic items
 * @param {string} operation - The operation type (copy, upload, etc.)
 * @returns {string} Temporary ID
 */
export const generateTempId = (operation = 'temp') => {
    return `temp_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Check if an ID is a temporary optimistic ID
 * @param {string} id - The ID to check
 * @returns {boolean}
 */
export const isTempId = (id) => {
    return id && typeof id === 'string' && id.startsWith('temp_');
};

/**
 * Create optimistic file item with status
 * @param {Object} baseFile - The original file to base the copy on
 * @param {string} status - The status (from FileStatus)
 * @param {Object} overrides - Additional properties to override
 * @returns {Object} Optimistic file object
 */
export const createOptimisticItem = (baseFile, status, overrides = {}) => {
    return {
        ...baseFile,
        _status: status,
        _isOptimistic: true,
        ...overrides,
    };
};

/**
 * Clear optimistic status from a file
 * @param {Object} file - File object with potential status
 * @returns {Object} File without status properties
 */
export const clearOptimisticStatus = (file) => {
    if (!file) return file;
    const { _status, _isOptimistic, _isCopying, ...rest } = file;
    return rest;
};

/**
 * Create an optimistic operations helper for Map-based state
 * 
 * @param {Function} setFilesMap - The setState function for the files Map
 * @param {Function} normalizeFile - Function to normalize file objects
 * @returns {Object} Object with optimistic operation functions
 */
export const createMapOptimisticOperations = (setFilesMap, normalizeFile) => {
    
    /**
     * Optimistically add an item to the Map
     * Used for: copy, upload, create folder/file
     * 
     * @param {Object} tempItem - Temporary item with temp ID and _status
     * @param {Function} apiCall - Async function that calls the API
     * @param {Function} onSuccess - Optional callback on success
     * @returns {Promise<Object>} Result object with success status
     */
    const optimisticAdd = async (tempItem, apiCall, onSuccess = null) => {
        // Step 1: Add temp item immediately
        setFilesMap(prev => {
            const newMap = new Map(prev);
            newMap.set(tempItem.id, tempItem);
            return newMap;
        });

        try {
            // Step 2: Call API
            const result = await apiCall();
            
            // Step 3: Replace temp with real item
            setFilesMap(prev => {
                const newMap = new Map(prev);
                newMap.delete(tempItem.id);
                if (result) {
                    const normalized = normalizeFile ? normalizeFile(result) : result;
                    newMap.set(result.id, clearOptimisticStatus(normalized));
                }
                return newMap;
            });

            if (onSuccess) onSuccess(result);
            return { success: true, item: result, error: null };
        } catch (error) {
            // Step 3 (error): Rollback - remove temp item
            setFilesMap(prev => {
                const newMap = new Map(prev);
                newMap.delete(tempItem.id);
                return newMap;
            });
            
            return { 
                success: false, 
                error: error.message || 'Operation failed',
                isStorageLimitError: error.isStorageLimitError || 
                    (error.message || '').toLowerCase().includes('storage limit'),
            };
        }
    };

    /**
     * Optimistically remove an item from the Map
     * Used for: delete, permanent delete
     * 
     * @param {string} itemId - ID of item to remove
     * @param {Object} originalItem - Original item (for rollback)
     * @param {Function} apiCall - Async function that calls the API
     * @param {Function} onSuccess - Optional callback on success
     * @returns {Promise<Object>} Result object with success status
     */
    const optimisticRemove = async (itemId, originalItem, apiCall, onSuccess = null) => {
        // Step 1: Remove immediately
        setFilesMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(itemId);
            return newMap;
        });

        try {
            // Step 2: Call API
            const result = await apiCall();
            
            if (onSuccess) onSuccess(result);
            return { success: true, result, error: null };
        } catch (error) {
            // Step 3 (error): Rollback - restore item
            if (originalItem) {
                setFilesMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(itemId, originalItem);
                    return newMap;
                });
            }
            
            return { success: false, error: error.message || 'Operation failed' };
        }
    };

    /**
     * Optimistically update an item in the Map
     * Used for: rename, move, star, restore, trash
     * 
     * @param {string} itemId - ID of item to update
     * @param {Object} originalItem - Original item (for rollback)
     * @param {Object} optimisticChanges - Changes to apply optimistically
     * @param {Function} apiCall - Async function that calls the API
     * @param {Function} onSuccess - Optional callback on success
     * @returns {Promise<Object>} Result object with success status
     */
    const optimisticUpdate = async (itemId, originalItem, optimisticChanges, apiCall, onSuccess = null) => {
        // Step 1: Apply changes immediately
        setFilesMap(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(itemId);
            if (existing) {
                newMap.set(itemId, { ...existing, ...optimisticChanges });
            }
            return newMap;
        });

        try {
            // Step 2: Call API
            const result = await apiCall();
            
            // Step 3: Update with server response
            if (result) {
                setFilesMap(prev => {
                    const newMap = new Map(prev);
                    const normalized = normalizeFile ? normalizeFile(result) : result;
                    newMap.set(itemId, clearOptimisticStatus(normalized));
                    return newMap;
                });
            }
            
            if (onSuccess) onSuccess(result);
            return { success: true, item: result, error: null };
        } catch (error) {
            // Step 3 (error): Rollback
            if (originalItem) {
                setFilesMap(prev => {
                    const newMap = new Map(prev);
                    newMap.set(itemId, originalItem);
                    return newMap;
                });
            }
            
            return { success: false, error: error.message || 'Operation failed' };
        }
    };

    /**
     * Optimistically update multiple items in the Map
     * Used for: bulk move, bulk delete
     * 
     * @param {Array<{id, original, changes}>} items - Array of items with their IDs, originals, and changes
     * @param {Function} apiCall - Async function that calls the API (receives item IDs)
     * @param {Function} onSuccess - Optional callback on success
     * @returns {Promise<Object>} Result object with success status
     */
    const optimisticBulkUpdate = async (items, apiCall, onSuccess = null) => {
        // Step 1: Apply all changes immediately
        setFilesMap(prev => {
            const newMap = new Map(prev);
            items.forEach(({ id, changes }) => {
                const existing = newMap.get(id);
                if (existing) {
                    newMap.set(id, { ...existing, ...changes });
                }
            });
            return newMap;
        });

        try {
            // Step 2: Call API
            const result = await apiCall();
            
            // Step 3: Clear optimistic status from all items
            setFilesMap(prev => {
                const newMap = new Map(prev);
                items.forEach(({ id }) => {
                    const existing = newMap.get(id);
                    if (existing) {
                        newMap.set(id, clearOptimisticStatus(existing));
                    }
                });
                return newMap;
            });
            
            if (onSuccess) onSuccess(result);
            return { success: true, result, error: null };
        } catch (error) {
            // Step 3 (error): Rollback all items
            setFilesMap(prev => {
                const newMap = new Map(prev);
                items.forEach(({ id, original }) => {
                    if (original) {
                        newMap.set(id, original);
                    }
                });
                return newMap;
            });
            
            return { success: false, error: error.message || 'Operation failed' };
        }
    };

    // === Direct state manipulation (for custom async flows) ===

    /**
     * Directly update an item's properties without async handling
     * Use when you need custom control flow (e.g., conditional updates based on server response)
     * 
     * @param {string} itemId - ID of item to update
     * @param {Object} changes - Changes to apply
     */
    const directUpdate = (itemId, changes) => {
        setFilesMap(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(itemId);
            if (existing) {
                newMap.set(itemId, { ...existing, ...changes });
            }
            return newMap;
        });
    };

    /**
     * Directly remove an item without async handling
     * Use when you need custom control flow
     * 
     * @param {string} itemId - ID of item to remove
     */
    const directRemove = (itemId) => {
        setFilesMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(itemId);
            return newMap;
        });
    };

    return {
        optimisticAdd,
        optimisticRemove,
        optimisticUpdate,
        optimisticBulkUpdate,
        // Direct manipulation for custom flows
        directUpdate,
        directRemove,
    };
};

export default {
    FileStatus,
    generateTempId,
    isTempId,
    createOptimisticItem,
    clearOptimisticStatus,
    createMapOptimisticOperations,
};
