const { FileItem } = require('../models/FileItem.js');
const { Permission } = require('../models/Permission.js');
const { filesStore } = require('../models/filesStore.js');
const { usersStore } = require('../models/usersStore.js');
const { permissionStore } = require('../models/permissionStore.js');
const { userFileMetadataStore } = require('../models/userFileMetadataStore.js');
const { storageClient } = require('./storageClient.js');
const { generateId } = require('../utils/idGenerator.js');

// Business logic layer for file management
// Handles complex validations, storage-server communication, permission management
class FileService {
    
    // Create new file or folder
    async createFile({ name, type, ownerId, parentId = null, size = 0 }) {
        // Basic validation
        const validationError = FileItem.validate({ name, type, ownerId });
        if (validationError) {
            throw new Error(validationError);
        }

        // Check owner exists
        const owner = await usersStore.getById(ownerId);
        if (!owner) {
            throw new Error("Owner does not exist");
        }

        // Check parent if provided
        if (parentId !== null) {
            const parent = await filesStore.getById(parentId);
            if (!parent) {
                throw new Error("Parent folder does not exist");
            }
            if (parent.type !== 'folder') {
                throw new Error("Parent is not a folder");
            }
        }

        // Create file/folder
        const fileId = generateId();
        const newFile = await filesStore.create(fileId, name, type, ownerId, parentId, size);

        // Add OWNER permission to creator
        const permissionId = generateId();
        await permissionStore.create(permissionId, fileId, ownerId, 'OWNER', false, null, false, ownerId);

        return newFile;
    }

    // POST - Upload file to storage server
    async uploadFile({ fileId, content, metadata = {} }) {
        // Check file exists in metadata
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        if (file.type === 'folder') {
            throw new Error("Cannot upload content to a folder");
        }

        try {
            // Calculate new content size
            const newSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
            
            // Check storage limit before upload
            const storageLimit = (process.env.STORAGE_LIMIT_MB || 100) * 1024 * 1024; // Convert MB to bytes
            const currentStorageUsed = await usersStore.getStorageUsed(file.ownerId);
            const oldSize = file.size || 0;
            const storageChange = newSize - oldSize;
            
            if (currentStorageUsed + storageChange > storageLimit) {
                const availableSpace = storageLimit - currentStorageUsed;
                throw new Error(`Storage limit exceeded. Available: ${Math.floor(availableSpace / 1024)} KB, Required: ${Math.floor(storageChange / 1024)} KB`);
            }

            // Send file to storage-server
            const response = await storageClient.post(fileId, content);

            if (!response.success) {
                throw new Error(response.error || "Failed to upload file to storage");
            }

            // Update file metadata
            const updates = { 
                modifiedAt: new Date().toISOString(),
                size: newSize
            };
            
            await filesStore.update(fileId, updates);

            // Update owner's storage usage
            await usersStore.updateStorageUsed(file.ownerId, storageChange);

            return response;
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    // Helper: Validate and update file content
    async _validateAndUpdateContent(fileId, file, content) {
        if (file.type === 'folder') {
            throw new Error("Cannot update content of a folder");
        }

        // Calculate new content size
        const newSize = Buffer.isBuffer(content) 
            ? content.length 
            : Buffer.byteLength(content);
        
        // Check storage limit before update
        const storageLimit = (process.env.STORAGE_LIMIT_MB || 100) * 1024 * 1024; // Convert MB to bytes
        const currentStorageUsed = await usersStore.getStorageUsed(file.ownerId);
        const oldSize = file.size || 0;
        const storageChange = newSize - oldSize;
        
        if (currentStorageUsed + storageChange > storageLimit) {
            const availableSpace = storageLimit - currentStorageUsed;
            throw new Error(`Storage limit exceeded. Available: ${Math.floor(availableSpace / 1024)} KB, Required: ${Math.floor(storageChange / 1024)} KB`);
        }

        // Delete old content from storage-server
        await storageClient.delete(fileId).catch(err => {
            // Ignore if file doesn't exist on storage server
        });

        // Upload new content
        const response = await storageClient.post(fileId, content);
        if (!response.success) {
            throw new Error(response.error || "Failed to update file content");
        }

        // Update owner's storage usage
        await usersStore.updateStorageUsed(file.ownerId, storageChange);

        return { size: newSize };
    }

    // Helper: Validate circular references when moving folders
    async _validateNoCircularReference(fileId, file, newParentId) {
        // Prevent moving to itself
        if (newParentId === fileId) {
            throw new Error("Cannot move file/folder into itself");
        }

        // Prevent moving folder into its own descendants
        if (file.type === 'folder' && newParentId !== null) {
            let currentParent = await filesStore.getById(newParentId);
            while (currentParent) {
                if (currentParent.id === fileId) {
                    throw new Error("Cannot move folder into its own subfolder");
                }
                if (currentParent.parentId === null) {
                    break;
                }
                currentParent = await filesStore.getById(currentParent.parentId);
            }
        }
    }

    // Helper: Validate and prepare parent update
    async _validateAndUpdateParent(fileId, file, newParentId, newName, userId) {
        await this._validateNoCircularReference(fileId, file, newParentId);

        // Check destination parent exists and is a folder
        if (newParentId !== null) {
            const targetParent = await filesStore.getById(newParentId);
            if (!targetParent) {
                throw new Error("Destination folder does not exist");
            }
            if (targetParent.type !== 'folder') {
                throw new Error("Destination is not a folder");
            }

            // Check write permission on destination folder
            const hasDestPermission = await this.checkPermission({ userId, fileId: newParentId, action: 'Write' });
            if (!hasDestPermission) {
                throw new Error("Permission denied for destination folder");
            }
        }

        return { parentId: newParentId };
    }

    // PATCH - Update file/folder (name, parent, content, or any combination)
    async updateFile({ fileId, updates, userId }) {
        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Save original modifiedAt for optimistic locking
        const expectedModifiedAt = file.modifiedAt;

        // Check write permission
        const hasPermission = await this.checkPermission({ userId, fileId, action: 'Write' });
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        const metadataUpdates = { modifiedAt: new Date().toISOString() };
        let contentUpdated = false;

        try {
            // 1. Update content (if provided)
            if (updates.content !== undefined) {
                const contentUpdates = await this._validateAndUpdateContent(fileId, file, updates.content);
                Object.assign(metadataUpdates, contentUpdates);
                contentUpdated = true;
            }

            // 2. Update parent (move)
            let parentChange = null;
            if (updates.parentId !== undefined) {
                parentChange = { oldParentId: file.parentId, newParentId: updates.parentId };
                const parentUpdates = await this._validateAndUpdateParent(
                    fileId,
                    file,
                    updates.parentId,
                    updates.name,
                    userId
                );
                Object.assign(metadataUpdates, parentUpdates);
            }

            // 3. Update name (rename)
            if (updates.name !== undefined) {
                metadataUpdates.name = updates.name;
            }

            // 4. Update metadata in store with optimistic locking
            const updatedFile = await filesStore.update(fileId, metadataUpdates, expectedModifiedAt);

            // After final update, synchronize permissions if parent changed
            if (parentChange) {
                const { permissionService } = require('./permissionService');
                await permissionService.syncPermissionsOnMove(fileId, parentChange.oldParentId, parentChange.newParentId);
            }

            // Record edit interaction ONLY for files (not folders)
            // Recent files should only track document interactions (docs, pdf, image)
            if (file.type !== 'folder') {
                await userFileMetadataStore.recordEdit(userId, fileId);
            }

            return {
                success: true,
                file: updatedFile,
                contentUpdated
            };
        } catch (error) {
            // Check if it's a conflict error
            if (error.message.includes('CONFLICT')) {
                throw new Error('File was modified by another user. Please refresh and try again.');
            }
            throw new Error(`Update failed: ${error.message}`);
        }
    }

    // Deprecated: Use updateFile instead
    async updateFileContent({ fileId, content, userId }) {
        return await this.updateFile({ fileId, updates: { content }, userId });
    }

    // Deprecated: Use updateFile instead  
    async moveFile({ fileId, newParentId, userId }) {
        return await this.updateFile({ fileId, updates: { parentId: newParentId }, userId });
    }

    // Deprecated: Use updateFile instead
    async renameFile({ fileId, newName, userId }) {
        return await this.updateFile({ fileId, updates: { name: newName }, userId });
    }

    // DELETE - Remove file or folder (now delegates to removeFile for trash logic)
    async deleteFile({ fileId, userId }) {
        // Use the new removeFile which handles trash/hide logic
        return await this.removeFile({ fileId, userId });
    }

    // Helper: Collect all files recursively (for storage tracking before deletion)
    async _collectFilesRecursive(fileId) {
        const files = [];
        const stack = [fileId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            const current = await filesStore.getById(currentId);
            
            if (!current) continue;

            files.push(current);

            if (current.type === 'folder') {
                const children = await filesStore.getByParentId(currentId);
                for (const child of children) {
                    stack.push(child.id);
                }
            }
        }

        return files;
    }

    // SEARCH - Advanced search with filters
    // Filters: searchName, searchContent, type, owner, dateRange, sharedWith, isStarred
    async searchFiles({ searchName = null, searchContent = null, type = null, owner = null, dateRange = null, sharedWith = null, isStarred = null, userId }) {
        try {
            // Get all files the user has access to
            const accessibleFileIdsArray = await permissionStore.getAccessibleFileIds(userId);
            const accessibleFileIds = new Set(accessibleFileIdsArray);

            // If user has no accessible files, return empty early
            if (accessibleFileIds.size === 0) {
                return [];
            }

            // ===== Stage 1: Parallel Search =====
            const metadataMatches = new Set();
            const contentMatches = new Set();

            // 1A. Search by name in metadata (if provided)
            if (searchName) {
                const nameQuery = searchName.trim().toLowerCase();
                for (const fileId of accessibleFileIds) {
                    const file = await filesStore.getById(fileId);
                    if (file && file.name.toLowerCase().includes(nameQuery)) {
                        metadataMatches.add(fileId);
                    }
                }
            }

            // 1B. Search by content via storage server (if provided)
            if (searchContent) {
                const contentQuery = searchContent.trim().toLowerCase();
                for (const fileId of accessibleFileIds) {
                    const file = await filesStore.getById(fileId);
                    if (file && file.type === 'docs') {
                        try {
                            const storageResponse = await storageClient.get(fileId);
                            if (storageResponse.success && storageResponse.data) {
                                if (storageResponse.data.toLowerCase().includes(contentQuery)) {
                                    contentMatches.add(fileId);
                                }
                            }
                        } catch (error) {
                            // Skip files that don't have content
                            continue;
                        }
                    }
                }
            }

            // ===== Stage 2: Combine search results =====
            let candidateIds;
            
            if (searchName && searchContent) {
                // Both name and content search: union of results
                candidateIds = new Set([...metadataMatches, ...contentMatches]);
            } else if (searchName) {
                candidateIds = metadataMatches;
            } else if (searchContent) {
                candidateIds = contentMatches;
            } else {
                // No search query: all accessible files are candidates
                candidateIds = accessibleFileIds;
            }

            // ===== Stage 3: Apply filters =====
            const results = [];
            
            for (const fileId of candidateIds) {
                const file = await filesStore.getById(fileId);
                if (!file) continue;

                // Skip trashed files
                const inTrash = await this._isInTrash(fileId);
                if (inTrash) continue;

                // Filter by type
                if (type && type.length > 0) {
                    if (!type.includes(file.type)) {
                        continue;
                    }
                }

                // Filter by owner
                if (owner === 'owned') {
                    if (file.ownerId !== userId) continue;
                } else if (owner === 'shared') {
                    // Must not be owned by user AND must have permissions on it
                    if (file.ownerId === userId) continue;
                    // Verify user actually has permissions (not just owner)
                    const permissions = await permissionStore.getByFileId(fileId);
                    const hasPermission = permissions.some(p => 
                        p.userId === userId && (p.level === 'VIEWER' || p.level === 'EDITOR')
                    );
                    if (!hasPermission) continue;
                }

                // Filter by date range
                if (dateRange) {
                    const modifiedDate = new Date(file.modifiedAt || file.createdAt);
                    if (dateRange.start && modifiedDate < dateRange.start) continue;
                    if (dateRange.end && modifiedDate > dateRange.end) continue;
                }

                // Filter by sharedWith
                if (sharedWith) {
                    const permissions = await permissionStore.getByFileId(fileId);
                    const hasSharedUser = permissions.some(p => 
                        p.userId === sharedWith && (p.level === 'VIEWER' || p.level === 'EDITOR')
                    );
                    if (!hasSharedUser) continue;
                }

                // Filter by starred status
                if (isStarred !== null) {
                    const metadata = await userFileMetadataStore.get(userId, fileId);
                    const fileIsStarred = metadata ? metadata.isStarred : false;
                    if (isStarred && !fileIsStarred) continue;
                    if (!isStarred && fileIsStarred) continue;
                }

                // Get user metadata
                const metadata = await userFileMetadataStore.get(userId, fileId);
                results.push({
                    ...file,
                    isStarred: metadata ? metadata.isStarred : false,
                    lastViewedAt: metadata ? metadata.lastViewedAt : null,
                    lastEditedAt: metadata ? metadata.lastEditedAt : null
                });
            }

            return results;
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    // Get files in folder
    async getFilesInFolder({ parentId, userId }) {
        // If parentId is null, returns top-level files
        const files = await filesStore.getByParentId(parentId);
        
        // Filter by permissions and exclude trashed files
        const accessibleFiles = [];
        for (const file of files) {
            // Skip files in trash (they should only appear in trash endpoint)
            const inTrash = await this._isInTrash(file.id);
            if (inTrash) {
                continue;
            }
            
            const hasPermission = await this.checkPermission({ userId, fileId: file.id, action: 'Read' });
            if (hasPermission) {
                accessibleFiles.push(file);
            }
        }

        return accessibleFiles;
    }

    // Check user permission on file
    async checkPermission({ userId, fileId, action }) {
        // Check if user is the owner first
        const file = await filesStore.getById(fileId);
        if (!file) {
            return false;
        }
        
        const isOwner = file.ownerId === userId;
        
        // Check if file or any parent is in trash
        const inTrash = await this._isInTrash(fileId);
        
        if (inTrash) {
            // Only owner can access files in trash
            if (!isOwner) {
                return false;
            }
            // Owner can access their trashed files
            return true;
        }
        
        // Not in trash - normal permission check
        if (isOwner) {
            return true; // Owner has all permissions
        }
        
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) {
            return false;
        }
        
        // Check if permission is hidden for this user
        if (permission.isHiddenForUser) {
            return false;
        }
        
        return Permission.can(permission, action);
    }

    // Get file information with content from storage-server
    async getFileInfo({ fileId, userId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        const hasPermission = await this.checkPermission({ userId, fileId, action: 'Read' });
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Record view interaction ONLY for files (not folders)
        // Recent files should only track document interactions (docs, pdf, image)
        if (file.type !== 'folder') {
            await userFileMetadataStore.recordView(userId, fileId);
        }

        // Get user-specific metadata after recording the view (if applicable)
        // Includes: isStarred, lastViewedAt, lastEditedAt, lastInteractionType, 
        // viewCount, editCount, createdAt, modifiedAt
        const metadata = await userFileMetadataStore.get(userId, fileId);

        // Helper to attach all metadata fields
        const attachMetadata = (fileObj) => {
            const result = { ...fileObj };
            
            // Add all user-specific metadata fields if metadata exists
            if (metadata) {
                result.isStarred = metadata.isStarred;
                result.lastViewedAt = metadata.lastViewedAt;
                result.lastEditedAt = metadata.lastEditedAt;
                result.lastInteractionType = metadata.lastInteractionType;
                result.viewCount = metadata.viewCount;
                result.editCount = metadata.editCount;
                result.metadataCreatedAt = metadata.createdAt;
                result.metadataModifiedAt = metadata.modifiedAt;
            }
            
            return result;
        };

        // If it's a folder, return with children metadata (without their content)
        if (file.type === 'folder') {
            const childrenFiles = await filesStore.getByParentId(fileId);
            
            // Filter children by permissions and exclude trashed files
            const accessibleChildren = [];
            for (const child of childrenFiles) {
                // Skip files in trash (they should only appear in trash endpoint)
                const inTrash = await this._isInTrash(child.id);
                if (inTrash) {
                    continue;
                }
                
                const hasChildPermission = await this.checkPermission({ userId, fileId: child.id, action: 'Read' });
                if (hasChildPermission) {
                    // Return only metadata - no content for files, no children for folders
                    accessibleChildren.push(child);
                }
            }
            
            return attachMetadata({
                ...file,
                children: accessibleChildren
            });
        }

        // For files, fetch content from storage-server
        try {
            const storageResponse = await storageClient.get(fileId);
            if (storageResponse.success && storageResponse.data) {
                return attachMetadata({
                    ...file,
                    content: storageResponse.data
                });
            }
        } catch (error) {
            // If file doesn't exist on storage server, continue without content
            // This can happen if file metadata exists but content hasn't been uploaded yet
        }

        // Return file metadata without content if storage fetch failed
        return attachMetadata(file);
    }

    // Get starred files for user
    async getStarredFiles({ userId }) {
        // Get all starred metadata
        const starredMetadata = await userFileMetadataStore.getStarredByUser(userId);
        
        // Fetch actual file objects
        const files = [];
        for (const metadata of starredMetadata) {
            const file = await filesStore.getById(metadata.fileId);
            if (file) {
                // Skip files in trash
                const inTrash = await this._isInTrash(file.id);
                if (inTrash) {
                    continue;
                }
                
                // Check permission
                const hasPermission = await this.checkPermission({ userId, fileId: file.id, action: 'Read' });
                if (hasPermission) {
                    files.push({
                        ...file,
                        isStarred: metadata.isStarred,
                        lastViewedAt: metadata.lastViewedAt,
                        lastEditedAt: metadata.lastEditedAt,
                        lastInteractionType: metadata.lastInteractionType,
                        viewCount: metadata.viewCount,
                        editCount: metadata.editCount,
                        metadataCreatedAt: metadata.createdAt,
                        metadataModifiedAt: metadata.modifiedAt
                    });
                }
            }
        }
        
        return files;
    }

    // Get recently accessed files for user
    async getRecentFiles({ userId, limit = 20 }) {
        // Get recent metadata
        const recentMetadata = await userFileMetadataStore.getRecentByUser(userId, limit);
        
        // Fetch actual file objects
        const files = [];
        for (const metadata of recentMetadata) {
            const file = await filesStore.getById(metadata.fileId);
            if (file) {
                // Skip files in trash
                const inTrash = await this._isInTrash(file.id);
                if (inTrash) {
                    continue;
                }
                
                // Skip folders - only return docs, pdf, image
                if (file.type === 'folder') {
                    continue;
                }
                
                // Check permission
                const hasPermission = await this.checkPermission({ userId, fileId: file.id, action: 'Read' });
                if (hasPermission) {
                    files.push({
                        ...file,
                        isStarred: metadata.isStarred,
                        lastViewedAt: metadata.lastViewedAt,
                        lastEditedAt: metadata.lastEditedAt,
                        lastInteractionType: metadata.lastInteractionType,
                        viewCount: metadata.viewCount,
                        editCount: metadata.editCount,
                        metadataCreatedAt: metadata.createdAt,
                        metadataModifiedAt: metadata.modifiedAt
                    });
                }
            }
        }
        
        return files;
    }

    // Toggle star status for a file
    async toggleStarFile({ fileId, userId }) {
        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check read permission
        const hasPermission = await this.checkPermission({ userId, fileId, action: 'Read' });
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Toggle star
        const metadata = await userFileMetadataStore.toggleStar(userId, fileId);
        
        return {
            fileId,
            isStarred: metadata.isStarred
        };
    }

    // Copy a file or folder (with deep copy for folders)
    async copyFile({ fileId, userId, options = {} }) {
        // Check source file exists
        const sourceFile = await filesStore.getById(fileId);
        if (!sourceFile) {
            throw new Error("File not found");
        }

        // Check read permission on source
        const hasPermission = await this.checkPermission({ userId, fileId, action: 'Read' });
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Determine parent and name for the copy
        const parentId = options.parentId !== undefined ? options.parentId : sourceFile.parentId;
        const newName = options.newName || `Copy of ${sourceFile.name}`;

        // If parent specified, check write permission on target parent
        if (parentId) {
            const hasWritePermission = await this.checkPermission({ userId, fileId: parentId, action: 'Write' });
            if (!hasWritePermission) {
                throw new Error("Permission denied: Cannot copy to target folder");
            }
        }

        // Calculate total size needed for copy (only files user owns after copy)
        const totalSizeNeeded = await this._calculateCopySize(fileId, userId);
        
        // Check storage limit
        const storageLimit = (process.env.STORAGE_LIMIT_MB || 100) * 1024 * 1024;
        const currentStorageUsed = await usersStore.getStorageUsed(userId);
        
        if (currentStorageUsed + totalSizeNeeded > storageLimit) {
            const availableSpace = storageLimit - currentStorageUsed;
            throw new Error(`Storage limit exceeded. Available: ${Math.floor(availableSpace / 1024)} KB, Required: ${Math.floor(totalSizeNeeded / 1024)} KB`);
        }

        // Recursive helper for deep copying folders
        const copyRecursive = async (sourceId, targetParentId) => {
            const source = await filesStore.getById(sourceId);
            
            // Create the copy with new owner
            const copyName = sourceId === fileId ? newName : source.name;
            const copyId = generateId();
            const copy = await filesStore.create(
                copyId,
                copyName,
                source.type,
                userId, // User becomes owner of the copy
                targetParentId,
                source.size
            );

            // If it's a file (not folder), copy content from storage server
            if (source.type !== 'folder') {
                try {
                    const sourceContent = await storageClient.get(sourceId);
                    if (sourceContent.success && sourceContent.data) {
                        await storageClient.post(copy.id, sourceContent.data);
                        // Update storage usage for new owner
                        await usersStore.updateStorageUsed(userId, source.size || 0);
                    }
                } catch (error) {
                    // If content doesn't exist, continue without it
                }
            }

            // If it's a folder, recursively copy children
            if (source.type === 'folder') {
                const children = await filesStore.getByParentId(sourceId);
                for (const child of children) {
                    // Only copy children the user has access to
                    const hasChildPermission = await this.checkPermission({ userId, fileId: child.id, action: 'Read' });
                    if (hasChildPermission) {
                        await copyRecursive(child.id, copy.id);
                    }
                }
            }

            return copy;
        };

        // Perform the copy
        const copiedFile = await copyRecursive(fileId, parentId);

        return copiedFile;
    }

    // Helper: Calculate total size needed for copy operation
    async _calculateCopySize(fileId, userId) {
        let totalSize = 0;
        const stack = [fileId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            const current = await filesStore.getById(currentId);
            
            if (!current) continue;

            // Check if user has permission to copy this file
            const hasPermission = await this.checkPermission({ userId, fileId: currentId, action: 'Read' });
            if (!hasPermission) continue;

            if (current.type !== 'folder') {
                totalSize += (current.size || 0);
            } else if (current.type === 'folder') {
                const children = await filesStore.getByParentId(currentId);
                for (const child of children) {
                    stack.push(child.id);
                }
            }
        }

        return totalSize;
    }

    // Get files shared with user (where user has permission but is not owner)
    async getSharedFiles({ userId }) {
        // Get all permissions for this user
        const permissions = await permissionStore.getByUserId(userId);
        
        // Filter to only VIEWER and EDITOR (not OWNER), and only DIRECT permissions (not inherited)
        const sharedPermissions = permissions.filter(p => 
            (p.level === 'VIEWER' || p.level === 'EDITOR') && !p.isInherited
        );

        // Fetch the actual files with metadata
        const files = [];
        for (const permission of sharedPermissions) {
            const file = await filesStore.getById(permission.fileId);
            if (file && file.ownerId !== userId) {
                // Get user-specific metadata
                const metadata = await userFileMetadataStore.get(userId, permission.fileId);
                
                // Add permission level and user metadata to file
                files.push({
                    ...file,
                    sharedPermissionLevel: permission.level,
                    isStarred: metadata?.isStarred || false,
                    lastViewedAt: metadata?.lastViewedAt || null,
                    lastEditedAt: metadata?.lastEditedAt || null,
                    lastInteractionType: metadata?.lastInteractionType || null,
                    viewCount: metadata?.viewCount || 0,
                    editCount: metadata?.editCount || 0,
                    metadataCreatedAt: metadata?.createdAt || null,
                    metadataModifiedAt: metadata?.modifiedAt || null
                });
            }
        }

        return files;
    }

    // ========== TRASH MANAGEMENT ==========

    /**
     * Helper: Check if file is in trash (either directly or via parent chain)
     * Recursively checks parent hierarchy for trashed items
     */
    async _isInTrash(fileId) {
        let current = await filesStore.getById(fileId);
        
        while (current) {
            if (current.isTrashed) {
                return true;
            }
            
            if (current.parentId === null) {
                break;
            }
            
            current = await filesStore.getById(current.parentId);
        }
        
        return false;
    }

    /**
     * Helper: Check if user can see a file
     * Considers trash status and hidden status
     */
    async _canSeeFile(userId, fileId) {
        const file = await filesStore.getById(fileId);
        if (!file) return false;

        // Check if in trash (only owner can see trashed items in trash view)
        const inTrash = await this._isInTrash(fileId);
        
        // If file is trashed and user is not owner, they can't see it
        if (inTrash && file.ownerId !== userId) {
            return false;
        }

        // Check if hidden for this user (Editor/Viewer local hide)
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (permission && permission.isHiddenForUser) {
            return false;
        }

        return true;
    }

    /**
     * REMOVE operation (Move to trash for owner, hide for Editor/Viewer)
     * DELETE /api/files/:id
     */
    async removeFile({ fileId, userId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check if user has any permission on this file
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        const isOwner = file.ownerId === userId;
        
        if (!isOwner && !permission) {
            throw new Error("Permission denied");
        }

        if (isOwner) {
            // OWNER: Move to trash (global flag, preserve parentId)
            await filesStore.update(fileId, { 
                isTrashed: true,
                modifiedAt: new Date().toISOString()
            });

            return { 
                success: true, 
                action: 'trashed',
                message: 'File moved to trash. All users lost access.'
            };
        } else {
            // EDITOR/VIEWER: Local hide (set isHiddenForUser flag)
            await permissionStore.update(permission.pid, { 
                isHiddenForUser: true 
            });

            return { 
                success: true, 
                action: 'hidden',
                message: 'File removed from your view'
            };
        }
    }

    /**
     * Get trash items (only top-level trashed items owned by user)
     * GET /api/files/trash
     */
    async getTrashItems({ userId }) {
        // Get all files owned by this user
        const allOwnedFiles = await filesStore.getByOwnerId(userId);
        
        // Filter to only top-level trashed items
        // Top-level = directly trashed (not trashed via parent)
        const trashItems = [];
        
        for (const file of allOwnedFiles) {
            if (file.isTrashed) {
                // Check if parent is also trashed
                let isTopLevel = true;
                
                if (file.parentId !== null) {
                    const parent = await filesStore.getById(file.parentId);
                    if (parent && parent.isTrashed) {
                        isTopLevel = false;
                    }
                }
                
                if (isTopLevel) {
                    trashItems.push(file);
                }
            }
        }
        
        return trashItems;
    }

    /**
     * Permanent delete (only owner, only from trash)
     * DELETE /api/files/trash/:id
     */
    async permanentDeleteFile({ fileId, userId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Only owner can permanently delete
        if (file.ownerId !== userId) {
            throw new Error("Only the owner can permanently delete files");
        }

        // File must be in trash
        if (!file.isTrashed) {
            throw new Error("File must be in trash before permanent deletion");
        }

        // Collect all files to be deleted
        const allFilesToDelete = await this._collectFilesForPermanentDelete(fileId, userId);
        
        // Calculate storage to free per owner
        const storageByOwner = new Map();
        for (const f of allFilesToDelete) {
            if (f.type !== 'folder') {
                const currentSize = storageByOwner.get(f.ownerId) || 0;
                storageByOwner.set(f.ownerId, currentSize + (f.size || 0));
            }
        }

        // Delete the file and all owned children recursively
        const physicalFilesToDelete = await this._permanentDeleteRecursive(fileId, userId);

        // Delete from storage-server
        const deletePromises = physicalFilesToDelete.map(fid => 
            storageClient.delete(fid).catch(err => {
                // Silently ignore storage deletion failures
            })
        );
        
        await Promise.all(deletePromises);

        // Update storage usage
        for (const [ownerId, sizeToFree] of storageByOwner.entries()) {
            await usersStore.updateStorageUsed(ownerId, -sizeToFree);
        }

        return { 
            success: true, 
            deletedCount: physicalFilesToDelete.length 
        };
    }

    /**
     * Helper: Recursively delete file and owned children
     * Orphan children owned by others (set parentId = null)
     */
    async _permanentDeleteRecursive(fileId, ownerId) {
        const file = await filesStore.getById(fileId);
        if (!file) return [];

        const physicalFilesToDelete = [];
        
        // Get all children
        const children = await filesStore.getByParentId(fileId);
        
        for (const child of children) {
            if (child.ownerId === ownerId) {
                // Recursively delete owned children
                const childPhysicalIds = await this._permanentDeleteRecursive(child.id, ownerId);
                physicalFilesToDelete.push(...childPhysicalIds);
            } else {
                // Orphan children owned by others (set parentId = null)
                await filesStore.update(child.id, { parentId: null });
            }
        }

        // Delete this file
        if (file.type !== 'folder') {
            physicalFilesToDelete.push(file.id);
        }

        // Delete permissions
        await permissionStore.deleteAllForFile(fileId);
        
        // Remove from indices
        const parentMap = await filesStore.getByParentId(file.parentId);
        await filesStore.delete(fileId);

        return physicalFilesToDelete;
    }

    /**
     * Helper: Collect all files for permanent delete (for storage calculation)
     */
    async _collectFilesForPermanentDelete(fileId, ownerId) {
        const files = [];
        const stack = [fileId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            const current = await filesStore.getById(currentId);
            
            if (!current) continue;

            if (current.ownerId === ownerId) {
                files.push(current);

                if (current.type === 'folder') {
                    const children = await filesStore.getByParentId(currentId);
                    for (const child of children) {
                        if (child.ownerId === ownerId) {
                            stack.push(child.id);
                        }
                    }
                }
            }
        }

        return files;
    }

    /**
     * Restore file from trash (only owner)
     * POST /api/files/trash/:id/restore
     */
    async restoreFile({ fileId, userId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Only owner can restore
        if (file.ownerId !== userId) {
            throw new Error("Only the owner can restore files");
        }

        // File must be in trash
        if (!file.isTrashed) {
            throw new Error("File is not in trash");
        }

        // Restore the file (set isTrashed = false)
        // ParentID was preserved, so it returns to original location
        await filesStore.update(fileId, { 
            isTrashed: false,
            modifiedAt: new Date().toISOString()
        });

        // Recursively restore all children owned by this user
        await this._restoreChildrenRecursive(fileId, userId);

        return { 
            success: true, 
            message: 'File restored to original location'
        };
    }

    /**
     * Helper: Recursively restore children
     */
    async _restoreChildrenRecursive(fileId, ownerId) {
        const children = await filesStore.getByParentId(fileId);
        
        for (const child of children) {
            if (child.ownerId === ownerId && child.isTrashed) {
                await filesStore.update(child.id, { 
                    isTrashed: false,
                    modifiedAt: new Date().toISOString()
                });
                
                if (child.type === 'folder') {
                    await this._restoreChildrenRecursive(child.id, ownerId);
                }
            }
        }
    }

    /**
     * Empty trash (bulk permanent delete)
     * DELETE /api/files/trash
     */
    async emptyTrash({ userId }) {
        // Get all top-level trash items
        const trashItems = await this.getTrashItems({ userId });
        
        let totalDeleted = 0;
        
        // Permanently delete each top-level item (which handles recursion)
        for (const item of trashItems) {
            const result = await this.permanentDeleteFile({ fileId: item.id, userId });
            totalDeleted += result.deletedCount;
        }

        return { 
            success: true, 
            deletedCount: totalDeleted,
            message: `Permanently deleted ${totalDeleted} file(s) from trash`
        };
    }

    /**
     * Restore all trash items (bulk restore)
     * POST /api/files/trash/restore
     */
    async restoreAllTrash({ userId }) {
        // Get all top-level trash items
        const trashItems = await this.getTrashItems({ userId });
        
        let totalRestored = 0;
        
        // Restore each top-level item (which handles recursion)
        for (const item of trashItems) {
            await this.restoreFile({ fileId: item.id, userId });
            totalRestored++;
        }

        return { 
            success: true, 
            restoredCount: totalRestored,
            message: `Restored ${totalRestored} item(s) from trash`
        };
    }

    // Download file or export folder (flattened recursive)
    async downloadFile({ fileId, userId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check minimum VIEWER permission
        const hasPermission = await this.checkPermission({ userId, fileId, action: 'Read' });
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Case A: Single file download
        if (file.type !== 'folder') {
            return await this._downloadSingleFile(file);
        }

        // Case B: Folder export (flattened recursive)
        return await this._exportFolderFlattened(file, userId);
    }

    // Helper: Download single file with proper decoding
    async _downloadSingleFile(file) {
        // Fetch content from storage server (uncompressed)
        const response = await storageClient.get(file.id);
        if (!response.success) {
            throw new Error(response.error || "Failed to retrieve file from storage");
        }

        let content = response.data || '';
        
        // IMPORTANT: Storage may return JSON-escaped string - unescape it
        if (content.startsWith('"') && content.endsWith('"')) {
            try {
                content = JSON.parse(content);
            } catch (e) {
                // Ignore parse errors, use content as-is
            }
        }

        // Decode based on file type
        let buffer;
        let contentType;
        
        if (file.type === 'image' || file.type === 'pdf') {
            // Images & PDFs may be stored as data URLs: data:image/png;base64,iVBORw0KG...
            if (content.startsWith('data:')) {
                // Extract MIME type and base64 data
                const match = content.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    contentType = match[1]; // e.g., "image/png" or "application/pdf"
                    const base64Data = match[2];
                    buffer = Buffer.from(base64Data, 'base64');
                } else {
                    throw new Error('Invalid data URL format');
                }
            } else {
                // Plain base64 (legacy format)
                buffer = Buffer.from(content, 'base64');
                contentType = file.type === 'pdf' ? 'application/pdf' : 'image/jpeg';
            }
        } else if (file.type === 'docs') {
            // Docs: Plain text → UTF8
            buffer = Buffer.from(content, 'utf8');
            contentType = 'text/plain';
        } else {
            // Fallback for unknown types
            buffer = Buffer.from(content, 'utf8');
            contentType = 'application/octet-stream';
        }

        return {
            type: 'file',
            fileName: file.name,
            contentType,
            buffer,
            size: buffer.length
        };
    }

    // Helper: Export folder as flattened array
    async _exportFolderFlattened(folder, userId) {
        const allFiles = [];
        
        // DFS traversal to collect all files
        await this._collectFilesRecursive(folder.id, userId, '', allFiles);

        // Fetch content for each file
        const filesWithContent = [];
        for (const fileEntry of allFiles) {
            const response = await storageClient.get(fileEntry.id);
            const content = response.success ? (response.data || '') : '';

            filesWithContent.push({
                id: fileEntry.id,
                name: fileEntry.name,
                type: fileEntry.type,
                path: fileEntry.path,
                size: fileEntry.size,
                content: content, // Uncompressed content
                modifiedAt: fileEntry.modifiedAt,
                createdAt: fileEntry.createdAt
            });
        }

        return {
            type: 'folder',
            folderName: folder.name,
            files: filesWithContent
        };
    }

    // Helper: Recursive DFS to collect all files with relative paths
    async _collectFilesRecursive(folderId, userId, currentPath, result) {
        const children = await filesStore.getByParentId(folderId);

        for (const child of children) {
            // Check read permission for each child
            const hasPermission = await this.checkPermission({ userId, fileId: child.id, action: 'Read' });
            if (!hasPermission) {
                continue; // Skip files user doesn't have access to
            }

            // Skip trashed items
            if (child.isTrashed) {
                continue;
            }

            const childPath = currentPath ? `${currentPath}/${child.name}` : child.name;

            if (child.type === 'folder') {
                // Recurse into subfolder
                await this._collectFilesRecursive(child.id, userId, childPath, result);
            } else {
                // Add file to result (exclude folders from final list)
                result.push({
                    id: child.id,
                    name: child.name,
                    type: child.type,
                    path: childPath,
                    size: child.size,
                    modifiedAt: child.modifiedAt,
                    createdAt: child.createdAt
                });
            }
        }
    }
}

// Create singleton instance
const fileService = new FileService();

module.exports = { FileService, fileService };
