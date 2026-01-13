import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { filesApi } from '../services/api';
import { useUserChange } from '../hooks/useUserChange';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents, notifyStorageUpdated } from '../utils/eventManager';

/**
 * FilesContext - Single Source of Truth (SSOT) for all file metadata
 * 
 * This context provides:
 * 1. Centralized file store (Map) with instant lookups by ID
 * 2. Schema alignment with backend (exact field names from README)
 * 3. Optimistic updates with rollback on failure
 * 4. Automatic synchronization across all components
 * 5. Distinction between metadata display and content interaction
 */

const FilesContext = createContext();

export function FilesProvider({ children }) {
    const { token } = useAuth();
    
    // SSOT: Map for O(1) lookups, Set for tracking loaded endpoints
    const [filesMap, setFilesMap] = useState(new Map());
    const [loadedEndpoints, setLoadedEndpoints] = useState(new Set());
    const [loading, setLoading] = useState({});
    const [errors, setErrors] = useState({});

    /**
     * Clear all files when user changes (login/logout/user switch)
     */
    useUserChange(() => {
        console.log('🧹 FilesContext: Clearing all files due to user change');
        setFilesMap(new Map());
        setLoadedEndpoints(new Set());
        setLoading({});
        setErrors({});
    });

    /**
     * Listen for files updated events and invalidate cache
     */
    useAppEvent(AppEvents.FILES_UPDATED, () => {
        console.log('📥 FilesContext: Files updated event - invalidating all endpoints for refetch');
        setLoadedEndpoints(new Set());
    });

    /**
     * Schema-aligned file object (matches backend exactly)
     * Fields from README.md API documentation
     * 
     * NOTE: location is NOT stored - computed dynamically by getFile()
     * This ensures TRUE Single Source of Truth - no data duplication
     */
    const normalizeFile = useCallback((file) => {
        return {
            // Core identifiers
            id: file.id,
            name: file.name,
            type: file.type, // folder, docs, pdf, image
            size: file.size || 0,
            
            // Hierarchy (location computed from parentId by getFile)
            ownerId: file.ownerId,
            parentId: file.parentId || null,
            
            // Permissions (user's effective permission level)
            permissionLevel: file.permissionLevel || null, // OWNER | EDITOR | VIEWER
            
            // Status flags
            isStarred: file.isStarred || false,
            isTrashed: file.isTrashed || false,
            
            // Timestamps (ISO 8601)
            createdAt: file.createdAt,
            modifiedAt: file.modifiedAt,
            lastViewedAt: file.lastViewedAt || null,
            lastEditedAt: file.lastEditedAt || null,
            
            // Interaction tracking
            lastInteractionType: file.lastInteractionType || null, // VIEW | EDIT
            lastActions: file.lastActions || null, // Array of {date, action} for Recent page
            
            // Shared files specific
            sharedPermissionLevel: file.sharedPermissionLevel || null, // VIEWER | EDITOR
            
            // Content (only loaded on explicit fetch)
            content: file.content || null,
            path: file.path || null
        };
    }, []);

    /**
     * Update files map (merges new data with existing)
     * Simple merge - no need for deep merge since location is computed
     */
    const updateFilesInStore = useCallback((files) => {
        setFilesMap(prev => {
            const newMap = new Map(prev);
            files.forEach(file => {
                const normalized = normalizeFile(file);
                const existing = newMap.get(file.id);
                
                // Merge: new data overwrites old, but keep activity fields if server didn't return them (avoid null erasing)
                const merged = existing ? {
                    ...existing,
                    ...normalized,
                    lastViewedAt: normalized.lastViewedAt ?? existing.lastViewedAt ?? null,
                    lastEditedAt: normalized.lastEditedAt ?? existing.lastEditedAt ?? null,
                } : normalized;

                newMap.set(file.id, merged);
            });
            return newMap;
        });
    }, [normalizeFile]);

    /**
     * Fetch files from endpoint and update store
     * Only triggers VIEW interaction when fetching individual file content
     */
    const fetchFiles = useCallback(async (endpoint, filters = {}) => {
        console.log('📁 FilesContext.fetchFiles called:', { 
          endpoint, 
          filters, 
          hasToken: !!token,
          timestamp: new Date().toISOString()
        });

        if (!token) {
            console.log('⚠️ No token available, returning empty files');
            return { files: [], error: null };
        }

        const cacheKey = `${endpoint}:${JSON.stringify(filters)}`;
        setLoading(prev => ({ ...prev, [cacheKey]: true }));
        setErrors(prev => ({ ...prev, [cacheKey]: null }));

        try {
            let result;
            const filterHeaders = filters.headers || {};

            console.log(`🔄 Fetching from endpoint: ${endpoint}`);

            switch (endpoint) {
                case 'mydrive':
                    result = await filesApi.getFiles(token, { headers: filterHeaders });
                    break;
                case 'shared':
                    result = await filesApi.getSharedFiles(token, { headers: filterHeaders });
                    break;
                case 'recent':
                    result = await filesApi.getRecentFiles(token, { headers: filterHeaders });
                    break;
                case 'trash':
                    result = await filesApi.getTrashFiles(token, { headers: filterHeaders });
                    break;
                case 'starred':
                    result = await filesApi.getStarredFiles(token, { headers: filterHeaders });
                    break;
                default:
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }

            console.log(`✅ Files fetched from ${endpoint}:`, { 
              count: result?.length || 0,
              files: result?.slice(0, 3).map(f => ({ id: f.id, name: f.name, type: f.type }))
            });

            updateFilesInStore(result || []);
            setLoadedEndpoints(prev => new Set(prev).add(endpoint));
            
            return { files: result || [], error: null };
        } catch (error) {
            const errorMsg = error.message || `Failed to load ${endpoint} files`;
            console.error(`❌ Error fetching ${endpoint}:`, error);
            setErrors(prev => ({ ...prev, [cacheKey]: errorMsg }));
            return { files: [], error: errorMsg };
        } finally {
            setLoading(prev => ({ ...prev, [cacheKey]: false }));
        }
    }, [token, updateFilesInStore]);

    /**
     * Fetch single file with content (triggers VIEW interaction)
     * Use this ONLY when user explicitly opens/previews file
     */
    const fetchFileContent = useCallback(async (fileId) => {
        if (!token) return { file: null, error: 'Not authenticated' };

        setLoading(prev => ({ ...prev, [fileId]: true }));
        
        try {
            // This endpoint records VIEW interaction and updates lastViewedAt
            const file = await filesApi.getFile(token, fileId);

            // If server didn't return activity timestamps, ensure we keep it in Recent
            const nowIso = new Date().toISOString();
            
            // Determine most recent action - no preference for Edit over View
            let fallbackAction = { date: nowIso, action: 'Open' };
            if (file.lastEditedAt || file.lastViewedAt) {
                const editDate = file.lastEditedAt ? new Date(file.lastEditedAt).getTime() : 0;
                const viewDate = file.lastViewedAt ? new Date(file.lastViewedAt).getTime() : 0;
                const mostRecentIsEdit = editDate >= viewDate && editDate > 0;
                fallbackAction = {
                    date: mostRecentIsEdit ? file.lastEditedAt : (file.lastViewedAt || nowIso),
                    action: mostRecentIsEdit ? 'Edit' : 'Open'
                };
            }
            
            const withActivity = {
                ...file,
                lastViewedAt: file.lastViewedAt || nowIso,
                lastActions: (file.lastActions && file.lastActions.length > 0)
                    ? file.lastActions
                    : [fallbackAction]
            };
            
            // Update store with fresh data including content and activity
            updateFilesInStore([withActivity]);
            
            return { file: withActivity, error: null };
        } catch (error) {
            const errorMsg = error.message || 'Failed to fetch file';
            setErrors(prev => ({ ...prev, [fileId]: errorMsg }));
            return { file: null, error: errorMsg };
        } finally {
            setLoading(prev => ({ ...prev, [fileId]: false }));
        }
    }, [token, updateFilesInStore]);

    /**
     * Optimistic update with rollback on failure
     */
    const updateFile = useCallback(async (fileId, updates) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found in store' };
        }

        // Optimistic update
        const optimisticFile = { ...originalFile, ...updates, modifiedAt: new Date().toISOString() };
        updateFilesInStore([optimisticFile]);

        try {
            const result = await filesApi.updateFile(token, fileId, updates);
            
            // After successful PATCH (204 No Content), fetch fresh data from server
            // This ensures we get server-generated fields like lastEditedAt, lastInteractionType
            const freshFile = await filesApi.getFile(token, fileId);
            if (freshFile) {
                updateFilesInStore([freshFile]);
            }
            
            // If content was updated, storage may have changed
            if (updates.content !== undefined) {
                notifyStorageUpdated();
            }
            
            return { success: true, error: null };
        } catch (error) {
            // Rollback on failure
            updateFilesInStore([originalFile]);
            const errorMsg = error.message || 'Failed to update file';
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);

    /**
     * Toggle star (optimistic update)
     */
    const toggleStar = useCallback(async (fileId) => {
        console.log('⭐ toggleStar called:', { fileId, hasToken: !!token, filesMapSize: filesMap.size });
        
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            console.error('❌ toggleStar: File not found in filesMap!', { 
                fileId, 
                availableIds: Array.from(filesMap.keys()) 
            });
            return { success: false, error: 'File not found' };
        }

        console.log('✅ toggleStar: File found, toggling star', { 
            fileId, 
            currentStar: originalFile.isStarred 
        });

        // Optimistic toggle
        const optimisticFile = { ...originalFile, isStarred: !originalFile.isStarred };
        updateFilesInStore([optimisticFile]);

        try {
            const result = await filesApi.toggleStar(token, fileId);
            
            // Update with server response
            updateFilesInStore([{
                ...originalFile,
                isStarred: result.isStarred
            }]);
            
            // Invalidate starred cache to trigger refetch on starred page
            setLoadedEndpoints(prev => {
                const newSet = new Set(prev);
                newSet.delete('starred');
                return newSet;
            });
            
            return { success: true, isStarred: result.isStarred, error: null };
        } catch (error) {
            // Rollback
            updateFilesInStore([originalFile]);
            const errorMsg = error.message || 'Failed to toggle star';
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);

    /**
     * Delete file (optimistic removal)
     */
    const deleteFile = useCallback(async (fileId) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found' };
        }

        // Optimistic: mark as trashed or remove from map
        const optimisticFile = { ...originalFile, isTrashed: true };
        updateFilesInStore([optimisticFile]);

        try {
            await filesApi.deleteFile(token, fileId);
            
            // Emit storage-updated event (delete affects storage)
            notifyStorageUpdated();
            
            return { success: true, error: null };
        } catch (error) {
            // Rollback
            updateFilesInStore([originalFile]);
            const errorMsg = error.message || 'Failed to delete file';
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);

    /**
     * Restore file from trash (optimistic update)
     */
    const restoreFile = useCallback(async (fileId) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found' };
        }

        // Optimistic: mark as not trashed
        const optimisticFile = { ...originalFile, isTrashed: false };
        updateFilesInStore([optimisticFile]);

        try {
            await filesApi.restoreFromTrash(token, fileId);
            
            // Emit storage-updated event (restore may affect storage)
            notifyStorageUpdated();
            
            // Invalidate starred cache if file is starred (so it appears in starred page)
            if (originalFile.isStarred) {
                setLoadedEndpoints(prev => {
                    const newSet = new Set(prev);
                    newSet.delete('starred');
                    return newSet;
                });
            }
            
            return { success: true, error: null };
        } catch (error) {
            // Rollback
            updateFilesInStore([originalFile]);
            const errorMsg = error.message || 'Failed to restore file';
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);

    /**
     * Permanently delete file from trash (optimistic removal)
     */
    const permanentlyDeleteFile = useCallback(async (fileId) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found' };
        }

        // Optimistic: remove from store
        const newMap = new Map(filesMap);
        newMap.delete(fileId);
        setFilesMap(newMap);

        try {
            await filesApi.permanentDelete(token, fileId);
            
            // Emit storage-updated event (permanent delete frees up storage)
            notifyStorageUpdated();
            
            return { success: true, error: null };
        } catch (error) {
            // Rollback - restore to map
            updateFilesInStore([originalFile]);
            const errorMsg = error.message || 'Failed to permanently delete file';
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);


    /**
     * Get files for specific endpoint from store
     * Returns files with computed location (consistent with getFile)
     */
    const getFilesFromStore = useCallback((endpoint, filterFn = null) => {
        const allFiles = Array.from(filesMap.values());
        
        // Apply endpoint-specific filtering
        let filtered = allFiles;
        
        if (endpoint === 'mydrive') {
            filtered = allFiles.filter(f => !f.isTrashed && f.parentId === null);
        } else if (endpoint === 'shared') {
            filtered = allFiles.filter(f => f.sharedPermissionLevel && !f.isTrashed);
        } else if (endpoint === 'recent') {
            filtered = allFiles
                .filter(f => !f.isTrashed && (f.lastViewedAt || f.lastEditedAt))
                .sort((a, b) => {
                    // Use MOST RECENT of lastEditedAt or lastViewedAt (no preference)
                    const aEdit = a.lastEditedAt ? new Date(a.lastEditedAt).getTime() : 0;
                    const aView = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
                    const aDate = Math.max(aEdit, aView) || 0;
                    
                    const bEdit = b.lastEditedAt ? new Date(b.lastEditedAt).getTime() : 0;
                    const bView = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
                    const bDate = Math.max(bEdit, bView) || 0;
                    
                    return bDate - aDate; // Newest first (descending)
                });
        } else if (endpoint === 'starred') {
            filtered = allFiles.filter(f => f.isStarred && !f.isTrashed);
        } else if (endpoint === 'trash') {
            filtered = allFiles.filter(f => f.isTrashed);
        }
        
        // Apply custom filter if provided
        if (filterFn) {
            filtered = filtered.filter(filterFn);
        }
        
        // Compute location for each file (consistent with getFile)
        return filtered.map(file => {
            if (file.parentId) {
                const parent = filesMap.get(file.parentId);
                return {
                    ...file,
                    location: {
                        parentId: file.parentId,
                        parentName: parent?.name || file.location?.parentName || 'Unknown Folder',
                        isRoot: false
                    }
                };
            }
            
            // Root level files
            return {
                ...file,
                location: {
                    parentId: null,
                    parentName: file.location?.parentName || null,
                    isRoot: true
                }
            };
        });
    }, [filesMap]);

    /**
     * Get single file from store (for Details Panel - no server interaction)
     * Computes location dynamically from parent folder (TRUE SSOT)
     * - Always returns fresh location data
     * - If parent folder renamed, location updates automatically
     * - No data duplication
     */
    const getFile = useCallback((fileId) => {
        const file = filesMap.get(fileId);
        if (!file) return null;
        
        // Compute location on-the-fly from parent folder in store
        if (file.parentId) {
            const parent = filesMap.get(file.parentId);
            return {
                ...file,
                location: {
                    parentId: file.parentId,
                    parentName: parent?.name || 'Unknown Folder',
                    isRoot: false
                }
            };
        }
        
        // Root level files (parentId = null)
        return {
            ...file,
            location: {
                parentId: null,
                parentName: null,
                isRoot: true
            }
        };
    }, [filesMap]);

    /**
     * Invalidate cache and force refetch
     */
    const invalidateEndpoint = useCallback((endpoint) => {
        setLoadedEndpoints(prev => {
            const newSet = new Set(prev);
            newSet.delete(endpoint);
            return newSet;
        });
    }, []);
    /**
     * Clear all files from store (used on logout/user change)
     */
    const clearAllFiles = useCallback(() => {
        console.log('🧹 Clearing all files from FilesContext');
        setFilesMap(new Map());
        setLoadedEndpoints(new Set());
        setLoading({});
        setErrors({});
    }, []);

    const value = {
        // Store access
        filesMap,
        getFile,
        getFilesFromStore,
        updateFilesInStore, // Allow manual updates to store (e.g., FolderPage)
        
        // Data fetching
        fetchFiles,
        fetchFileContent, // Use ONLY for explicit file open/preview
        
        // Mutations (optimistic)
        updateFile,
        toggleStar,
        deleteFile,
        restoreFile,
        permanentlyDeleteFile,
        
        // Cache management
        invalidateEndpoint,
        clearAllFiles,
        loadedEndpoints,
        
        // Loading/error states
        loading,
        errors
    };

    return (
        <FilesContext.Provider value={value}>
            {children}
        </FilesContext.Provider>
    );
}

export function useFilesContext() {
    const context = useContext(FilesContext);
    if (!context) {
        throw new Error('useFilesContext must be used within FilesProvider');
    }
    return context;
}

export default FilesContext;
