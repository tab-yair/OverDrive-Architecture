const { FileItem } = require('../models/FileItem.js');
const { Permission } = require('../models/Permission.js');
const { filesStore } = require('../models/filesStore.js');
const { usersStore } = require('../models/usersStore.js');
const { permissionStore } = require('../models/permissionStore.js');
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
        await permissionStore.create(permissionId, fileId, ownerId, 'OWNER');

        return newFile;
    }

    // POST - Upload file to storage server
    async uploadFile(fileId, content, metadata = {}) {
        // Check file exists in metadata
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        if (file.type !== 'file') {
            throw new Error("Cannot upload content to a folder");
        }

        try {
            // Send file to storage-server
            const response = await storageClient.post(fileId, content);

            if (!response.success) {
                throw new Error(response.error || "Failed to upload file to storage");
            }

            // Update file metadata
            const updates = { 
                updatedAt: new Date().toISOString()
            };
            
            // Update size if content is provided
            if (content) {
                const contentSize = Buffer.isBuffer(content) ? content.length : Buffer.byteLength(content);
                updates.size = contentSize;
            }
            
            await filesStore.update(fileId, updates);

            return response;
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }

    // Helper: Validate and update file content
    async _validateAndUpdateContent(fileId, file, content) {
        if (file.type !== 'file') {
            throw new Error("Cannot update content of a folder");
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

        // Calculate and return new size
        const contentSize = Buffer.isBuffer(content) 
            ? content.length 
            : Buffer.byteLength(content);
        
        return { size: contentSize };
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
            const hasDestPermission = await this.checkPermission(userId, newParentId, 'Write');
            if (!hasDestPermission) {
                throw new Error("Permission denied for destination folder");
            }
        }

        return { parentId: newParentId };
    }

    // PATCH - Update file/folder (name, parent, content, or any combination)
    async updateFile(fileId, updates, userId) {
        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Save original updatedAt for optimistic locking
        const expectedUpdatedAt = file.updatedAt;

        // Check write permission
        const hasPermission = await this.checkPermission(userId, fileId, 'Write');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        const metadataUpdates = { updatedAt: new Date().toISOString() };
        let contentUpdated = false;

        try {
            // 1. Update content (if provided)
            if (updates.content !== undefined) {
                const contentUpdates = await this._validateAndUpdateContent(fileId, file, updates.content);
                Object.assign(metadataUpdates, contentUpdates);
                contentUpdated = true;
            }

            // 2. Update parent (move)
            if (updates.parentId !== undefined) {
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
            const updatedFile = await filesStore.update(fileId, metadataUpdates, expectedUpdatedAt);

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
    async updateFileContent(fileId, content, userId) {
        return await this.updateFile(fileId, { content }, userId);
    }

    // Deprecated: Use updateFile instead  
    async moveFile(fileId, newParentId, userId) {
        return await this.updateFile(fileId, { parentId: newParentId }, userId);
    }

    // Deprecated: Use updateFile instead
    async renameFile(fileId, newName, userId) {
        return await this.updateFile(fileId, { name: newName }, userId);
    }

    // DELETE - Remove file or folder (recursive)
    async deleteFile(fileId, userId) {
        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check delete permission
        const hasPermission = await this.checkPermission(userId, fileId, 'Delete');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        try {
            // filesStore.delete handles recursion, permission cleanup, and returns physicalFileIds
            const physicalFilesToDelete = await filesStore.delete(fileId);

            // Delete from storage-server
            const deletePromises = physicalFilesToDelete.map(fid => 
                storageClient.delete(fid).catch(err => {
                    // Silently ignore storage deletion failures
                })
            );
            
            await Promise.all(deletePromises);

            return { success: true, deletedFiles: physicalFilesToDelete };
        } catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    // SEARCH - Search files by name (metadata) AND content (C++ storage server)
    async searchFiles({ query, userId }) {
        try {
            // Get all files the user has access to - convert to Set for O(1) lookups
            const accessibleFileIdsArray = await permissionStore.getAccessibleFileIds(userId);
            const accessibleFileIds = new Set(accessibleFileIdsArray);

            // If user has no accessible files, return empty early
            if (accessibleFileIds.size === 0) {
                return [];
            }

            // ===== Stage 1: Parallel Search =====
            // Search metadata (name) and content (C++ server) in parallel
            const metadataMatches = new Set();
            const storageMatches = new Set();

            // 1A. Search by logical name in metadata
            const metadataSearchPromise = (async () => {
                const promises = Array.from(accessibleFileIds).map(async (fileId) => {
                    const file = await filesStore.getById(fileId);
                    if (file && file.name.includes(query)) {
                        return fileId;
                    }
                    return null;
                });
                const results = await Promise.all(promises);
                results.forEach(fileId => {
                    if (fileId !== null) {
                        metadataMatches.add(fileId);
                    }
                });
            })();

            // 1B. Search by content via C++ storage server SEARCH command
            const storageSearchPromise = (async () => {
                try {
                    const searchResponse = await storageClient.search(query);
                    if (searchResponse.success && searchResponse.data) {
                        // C++ server returns space-separated file IDs
                        // Clean any newlines or extra whitespace first
                        const cleanedData = searchResponse.data.replace(/\s+/g, ' ').trim();
                        const matchedIds = cleanedData
                            .split(' ')
                            .map(id => id.trim())
                            .filter(id => id.length > 0);

                        // Only include IDs user has access to (security filter)
                        for (const id of matchedIds) {
                            if (accessibleFileIds.has(id)) {
                                storageMatches.add(id);
                            }
                        }
                    }
                } catch (error) {
                    // Storage server search failed - continue with metadata only
                }
            })();

            // Wait for both searches to complete
            await Promise.all([metadataSearchPromise, storageSearchPromise]);

            // ===== Stage 2: Merge & Return =====
            // Union of both sets
            const allMatchedIds = new Set([...metadataMatches, ...storageMatches]);

            // Fetch full file objects for all matched IDs
            const validatedFiles = [];
            for (const fileId of allMatchedIds) {
                const file = await filesStore.getById(fileId);
                if (file) {
                    validatedFiles.push(file);
                }
            }

            return validatedFiles;
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    // Get files in folder
    async getFilesInFolder(parentId, userId) {
        // If parentId is null, returns top-level files
        const files = await filesStore.getByParentId(parentId);
        
        // Filter by permissions
        const accessibleFiles = [];
        for (const file of files) {
            const hasPermission = await this.checkPermission(userId, file.id, 'Read');
            if (hasPermission) {
                accessibleFiles.push(file);
            }
        }

        return accessibleFiles;
    }

    // Check user permission on file
    async checkPermission(userId, fileId, action) {
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) {
            return false;
        }
        
        return Permission.can(permission, action);
    }

    // Get file information with content from storage-server
    async getFileInfo(fileId, userId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        const hasPermission = await this.checkPermission(userId, fileId, 'Read');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // If it's a folder, return with children metadata (without their content)
        if (file.type === 'folder') {
            const childrenFiles = await filesStore.getByParentId(fileId);
            
            // Filter children by permissions and return only metadata
            const accessibleChildren = [];
            for (const child of childrenFiles) {
                const hasChildPermission = await this.checkPermission(userId, child.id, 'Read');
                if (hasChildPermission) {
                    // Return only metadata - no content for files, no children for folders
                    accessibleChildren.push(child);
                }
            }
            
            return {
                ...file,
                children: accessibleChildren
            };
        }

        // For files, fetch content from storage-server
        try {
            const storageResponse = await storageClient.get(fileId);
            if (storageResponse.success && storageResponse.data) {
                return {
                    ...file,
                    content: storageResponse.data
                };
            }
        } catch (error) {
            // If file doesn't exist on storage server, continue without content
            // This can happen if file metadata exists but content hasn't been uploaded yet
        }

        // Return file metadata without content if storage fetch failed
        return file;
    }
}

// Create singleton instance
const fileService = new FileService();

module.exports = { FileService, fileService };
