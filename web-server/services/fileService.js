import { FileItem } from '../models/FileItem.js';
import { Permission } from '../models/Permission.js';
import { filesStore } from '../models/filesStore.js';
import { usersStore } from '../models/usersStore.js';
import { permissionStore } from '../models/permissionStore.js';
import { storageClient } from './storageClient.js';
import { generateId } from '../utils/idGenerator.js';

// Business logic layer for file management
// Handles complex validations, storage-server communication, permission management
class FileService {
    
    // Create new file or folder
    async createFile(name, type, ownerId, parentId = null, size = 0) {
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

        // Check name uniqueness in folder
        const siblings = await filesStore.getByParentId(parentId);
        const duplicateName = siblings.find(s => s.name === name && s.type === type);
        if (duplicateName) {
            throw new Error(`A ${type} named "${name}" already exists in this folder`);
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

        // Check name uniqueness at destination
        const finalName = newName || file.name;
        const siblings = await filesStore.getByParentId(newParentId);
        const duplicate = siblings.find(s => s.id !== fileId && s.name === finalName && s.type === file.type);
        if (duplicate) {
            throw new Error(`A ${file.type} named "${finalName}" already exists in destination`);
        }

        return { parentId: newParentId };
    }

    // Helper: Validate and prepare name update
    async _validateAndUpdateName(fileId, file, newName, targetParentId) {
        const parentId = targetParentId !== undefined ? targetParentId : file.parentId;
        const siblings = await filesStore.getByParentId(parentId);
        const duplicate = siblings.find(s => s.id !== fileId && s.name === newName && s.type === file.type);
        if (duplicate) {
            throw new Error(`A ${file.type} named "${newName}" already exists in this folder`);
        }

        return { name: newName };
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
                const nameUpdates = await this._validateAndUpdateName(
                    fileId,
                    file,
                    updates.name,
                    updates.parentId
                );
                Object.assign(metadataUpdates, nameUpdates);
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

    // SEARCH - Search files by name (metadata) AND content (physical files)
    async searchFiles(query, userId) {
        try {
            const matchedFiles = new Map(); // fileId -> file object

            // 1. Get all files the user has access to (efficient)
            const accessibleFileIds = await permissionStore.getAccessibleFileIds(userId);
            
            // 2. Search by file name in metadata - only among accessible files
            for (const fileId of accessibleFileIds) {
                const file = await filesStore.getById(fileId);
                if (file && file.name.includes(query)) {
                    matchedFiles.set(fileId, file);
                }
            }

            // 3. Search by content in physical files (storage-server)
            // Storage server searches ALL files (no permission filtering)
            try {
                const storageResponse = await storageClient.search(query);

                if (storageResponse.success && storageResponse.data) {
                    // Parse response - storage server returns space-separated file IDs
                    const contentMatches = storageResponse.data.split(' ').filter(id => id.trim());
                    
                    // Filter storage results: only keep files user has access to
                    for (const fileId of contentMatches) {
                        if (accessibleFileIds.includes(fileId) && !matchedFiles.has(fileId)) {
                            const file = await filesStore.getById(fileId);
                            if (file) {
                                matchedFiles.set(fileId, file);
                            }
                        }
                    }
                }
            } catch (storageError) {
                // Continue even if storage search fails - we still have metadata results
            }

            // 4. Return results
            return Array.from(matchedFiles.values());
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

    // Get file information
    async getFileInfo(fileId, userId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        const hasPermission = await this.checkPermission(userId, fileId, 'Read');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        return file;
    }
}

// Create singleton instance
const fileService = new FileService();

export { FileService, fileService };
