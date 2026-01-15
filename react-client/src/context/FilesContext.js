import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { filesApi } from '../services/api';
import { useUserChange } from '../hooks/useUserChange';
import { useAppEvent } from '../hooks/useAppEvent';
import { AppEvents, notifyStorageUpdated, notifyFilesUpdated } from '../utils/eventManager';

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
    const { token, user } = useAuth();
    
    // SSOT: Map for O(1) lookups, Set for tracking loaded endpoints
    const [filesMap, setFilesMap] = useState(new Map());
    const [loadedEndpoints, setLoadedEndpoints] = useState(new Set());
    const [loading, setLoading] = useState({});
    const [errors, setErrors] = useState({});

    /**
     * Clear all files when user changes (login/logout/user switch)
     */
    useUserChange(() => {
        setFilesMap(new Map());
        setLoadedEndpoints(new Set());
        setLoading({});
        setErrors({});
    });

    /**
     * Listen for files updated events and invalidate cache
     */
    useAppEvent(AppEvents.FILES_UPDATED, () => {
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
            
            // Ownership flag (for UI decisions: "Move to Trash" vs "Remove")
            isOwner: user && file.ownerId === user.id,
            
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
            sharer: file.sharer || null, // { id, username, avatarUrl } - who shared this file
            shareDate: file.shareDate || null, // When it was shared with current user
            
            // Owner info - now comes directly from API as full object (same structure as sharer)
            // API enriches all files with owner: {id, username, avatarUrl, firstName, lastName}
            owner: file.owner || null, // Full owner object from API
            
            // Content (only loaded on explicit fetch)
            content: file.content || null,
            path: file.path || null
        };
    }, [user]);

    /**
     * Update files map (merges new data with existing)
     * Preserves endpoint-specific fields (sharer, shareDate, owner) that may not be returned by all endpoints
     * CRITICAL: Always return a NEW Map instance to trigger React re-renders
     */
    const updateFilesInStore = useCallback((files) => {
        setFilesMap(prev => {
            const newMap = new Map(prev);
            let hasChanges = false;
            
            files.forEach(file => {
                const normalized = normalizeFile(file);
                const existing = newMap.get(file.id);
                
                // Merge: new data overwrites old, but preserve endpoint-specific fields if not provided
                const merged = existing ? {
                    ...existing,
                    ...normalized,
                    // Preserve activity timestamps if not provided by new data
                    lastViewedAt: normalized.lastViewedAt ?? existing.lastViewedAt ?? null,
                    lastEditedAt: normalized.lastEditedAt ?? existing.lastEditedAt ?? null,
                    // Preserve shared/owner specific fields if not provided (critical for Shared page)
                    sharer: normalized.sharer ?? existing.sharer ?? null,
                    shareDate: normalized.shareDate ?? existing.shareDate ?? null,
                    sharedPermissionLevel: normalized.sharedPermissionLevel ?? existing.sharedPermissionLevel ?? null,
                    owner: normalized.owner ?? existing.owner ?? null, // Preserve owner object
                } : normalized;

                // Check if there are actual changes
                if (!existing || JSON.stringify(existing) !== JSON.stringify(merged)) {
                    hasChanges = true;
                }

                newMap.set(file.id, merged);
            });
            
            // Always return new Map to trigger re-renders
            return hasChanges ? newMap : prev;
        });
    }, [normalizeFile]);

    /**
     * Fetch owner information for files and update the store
     * Uses GET /user/:id to get owner details (firstName, lastName, username)
     */
    /**
     * Fetch files from endpoint and update store
     * Only triggers VIEW interaction when fetching individual file content
     */
    const fetchFiles = useCallback(async (endpoint, filters = {}) => {
        if (!token) {
            return { files: [], error: null };
        }

        const cacheKey = `${endpoint}:${JSON.stringify(filters)}`;
        setLoading(prev => ({ ...prev, [cacheKey]: true }));
        setErrors(prev => ({ ...prev, [cacheKey]: null }));

        try {
            let result;
            const filterHeaders = filters.headers || {};

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

            updateFilesInStore(result || []);

            // CRITICAL: Load missing parent folders so getFilesFromStore can compute canAccessParent
            // This is essential after Move operations where files now have new parentIds
            // without their parent folders being in the store yet
            const parentIds = new Set();
            if (result) {
                result.forEach(file => {
                    if (file.parentId && !filesMap.has(file.parentId)) {
                        parentIds.add(file.parentId);
                    }
                });
            }

            if (parentIds.size > 0) {
                try {
                    const parentFolders = await Promise.all(
                        Array.from(parentIds).map(id => filesApi.getFile(token, id))
                    );
                    updateFilesInStore(parentFolders.filter(Boolean));
                } catch (err) {
                    console.warn('[FilesContext] Failed to load some parent folders:', err);
                    // Not critical - location will show folder name as "Unknown Folder"
                }
            }

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
    }, [token, updateFilesInStore, filesMap]);

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
            await filesApi.updateFile(token, fileId, updates);
            
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
            
            // CRITICAL FIX: If file name changed and file is starred, invalidate starred cache
            // This ensures the Starred page shows the updated name without needing F5
            if (updates.name !== undefined && (originalFile.isStarred || freshFile?.isStarred)) {
                setLoadedEndpoints(prev => {
                    const newSet = new Set(prev);
                    newSet.delete('starred');
                    return newSet;
                });
            }
            
            // CRITICAL FIX: Don't invalidate all endpoints for content updates
            // Content updates (save) should NOT trigger full page refetches
            // The filesMap is already updated optimistically above (line 277-290)
            // Only notify for non-content updates that affect file lists (name, parentId, etc.)
            if (updates.content === undefined) {
                // Emit FILES_UPDATED event so all pages (including nested folders) can refresh
                notifyFilesUpdated();
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
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found' };
        }

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
     * Copy a file (UI restricts to files, backend supports folders too)
     */
    const copyFile = useCallback(async (fileId, options = {}) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        try {
            const copied = await filesApi.copyFile(token, fileId, options);
            updateFilesInStore([copied]);

            // Copy increases storage
            notifyStorageUpdated();
            notifyFilesUpdated();

            return { success: true, file: copied, error: null };
        } catch (error) {
            const errorMsg = error.message || 'Failed to copy file';
            return { success: false, error: errorMsg };
        }
    }, [token, updateFilesInStore]);

    /**
     * Move multiple files/folders to a destination parentId (null = root)
     */
    const moveFiles = useCallback(async (fileIds, parentId) => {
        if (!token) return { success: false, error: 'Not authenticated' };
        if (!Array.isArray(fileIds) || fileIds.length === 0) {
            return { success: false, error: 'No files selected' };
        }

        // Build optimistic updates for all files being moved
        const optimisticUpdates = fileIds
            .map(id => filesMap.get(id))
            .filter(Boolean)
            .map(file => ({ ...file, parentId }));
        
        // Apply optimistic updates immediately
        updateFilesInStore(optimisticUpdates);

        try {
            // Execute moves in parallel - each file gets updated individually
            const results = await Promise.all(
                fileIds.map(id => filesApi.updateFile(token, id, { parentId }))
            );
            
            // If any move failed, the optimistic update is wrong but we'll refetch
            const hasFailures = results.some(r => r?.error);
            if (hasFailures) {
                // Fetch fresh data for all files being moved to correct any failures
                const freshFiles = await Promise.all(
                    fileIds.map(id => filesApi.getFile(token, id))
                );
                updateFilesInStore(freshFiles.filter(Boolean));
                return { success: false, error: 'Some files failed to move' };
            }
            
            // CRITICAL: Fetch fresh data from server to ensure location is correct
            // This is essential because getFile() computes location dynamically
            // and we need the parent folder to be in the store for that computation
            const freshFiles = await Promise.all(
                fileIds.map(id => filesApi.getFile(token, id))
            );
            
            // Update store with fresh data - ensures location is correctly computed
            // when getFile() looks up the parent folder in filesMap
            updateFilesInStore(freshFiles.filter(Boolean));
            
            // CRITICAL: Fetch parent folder if not already in store
            // This ensures getFile() can compute location correctly
            if (parentId && !filesMap.has(parentId)) {
                try {
                    const parentFolder = await filesApi.getFile(token, parentId);
                    if (parentFolder) {
                        updateFilesInStore([parentFolder]);
                    }
                } catch (err) {
                    console.warn('[FilesContext] Failed to load parent folder:', err);
                    // Not critical - location will show folder name as "Unknown Folder"
                }
            }
            
            // Emit events to notify other parts of the app
            notifyStorageUpdated(); // Might affect storage calculations
            notifyFilesUpdated();   // Trigger refetch on other pages
            
            return { success: true, error: null };
        } catch (error) {
            const errorMsg = error.message || 'Failed to move files';
            console.error('[FilesContext] Move error:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }, [token, filesMap, updateFilesInStore]);

    /**
     * Delete file (move to trash for Owner, remove from view for Editor/Viewer)
     * Server returns { action: 'trashed' | 'hidden' } to indicate what happened
     */
    const deleteFile = useCallback(async (fileId) => {
        if (!token) return { success: false, error: 'Not authenticated' };

        const originalFile = filesMap.get(fileId);
        if (!originalFile) {
            return { success: false, error: 'File not found' };
        }

        // Optimistic: mark as trashed (will be corrected if action is 'hidden')
        const optimisticFile = { ...originalFile, isTrashed: true };
        updateFilesInStore([optimisticFile]);

        try {
            const result = await filesApi.deleteFile(token, fileId);
            
            // If action was 'hidden' (Editor/Viewer local remove), remove from map entirely
            if (result.action === 'hidden') {
                const newMap = new Map(filesMap);
                newMap.delete(fileId);
                setFilesMap(newMap);
                
                // Emit storage-updated event (delete affects storage)
                notifyStorageUpdated();
                
                // Do NOT emit files-updated - we don't want to refetch as it would re-add the file
                // The file is hidden locally via isHiddenForUser in the backend
            } else {
                // If action was 'trashed' (Owner global trash), keep the isTrashed flag
                
                // Emit storage-updated event (delete affects storage)
                notifyStorageUpdated();
                
                // Emit files-updated to trigger refetch on relevant pages
                notifyFilesUpdated();
            }
            
            return { success: true, error: null, action: result.action };
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
            
            // Fetch fresh data from server to ensure all fields are correct
            // This is especially important for nested folders to get correct star status
            try {
                const freshFile = await filesApi.getFile(token, fileId);
                if (freshFile) {
                    updateFilesInStore([freshFile]);
                }
            } catch (fetchError) {
                console.warn('Failed to fetch fresh file data after restore:', fetchError);
            }
            
            // Emit events to trigger refetches across the app
            notifyStorageUpdated(); // Storage may have changed
            
            // CRITICAL FIX: Emit FILES_UPDATED so FolderPage and all pages refetch
            // This ensures nested folders get fresh data with correct star status
            notifyFilesUpdated();
            
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
            // CRITICAL FIX: Only show files owned by current user
            // Before: showed all files with parentId=null (including shared files!)
            // After: filter by ownerId to ensure only user's own files appear
            filtered = allFiles.filter(f => !f.isTrashed && f.parentId === null && f.ownerId === user?.id);
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
                
                // Check if user can access the parent folder
                const canAccessParent = parent && (
                    parent.ownerId === user?.id || 
                    (parent.sharedPermissionLevel && ['editor', 'owner'].includes(parent.sharedPermissionLevel.toLowerCase()))
                );
                
                return {
                    ...file,
                    location: {
                        parentId: file.parentId,
                        parentName: parent?.name || file.location?.parentName || 'Unknown Folder',
                        isRoot: false
                    },
                    canAccessParent: !!canAccessParent
                };
            }
            
            // Root level files - always accessible
            return {
                ...file,
                location: {
                    parentId: null,
                    parentName: file.location?.parentName || null,
                    isRoot: true
                },
                canAccessParent: true
            };
        });
    }, [filesMap, user?.id]);

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
            
            // Check if user can access the parent folder
            // User can access if: they own it OR it's shared with editor/owner permission
            const canAccessParent = parent && (
                parent.ownerId === user?.id || 
                (parent.sharedPermissionLevel && ['editor', 'owner'].includes(parent.sharedPermissionLevel.toLowerCase()))
            );
            
            return {
                ...file,
                location: {
                    parentId: file.parentId,
                    parentName: parent?.name || 'Unknown Folder',
                    isRoot: false
                },
                canAccessParent: !!canAccessParent
            };
        }
        
        // Root level files (parentId = null) - always accessible
        return {
            ...file,
            location: {
                parentId: null,
                parentName: null,
                isRoot: true
            },
            canAccessParent: true
        };
    }, [filesMap, user?.id]);

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
        copyFile,
        moveFiles,
        
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
