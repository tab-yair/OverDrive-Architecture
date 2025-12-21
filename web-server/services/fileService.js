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
            const response = await storageClient.post(fileId, content, {
                ...metadata,
                fileName: file.name,
                ownerId: file.ownerId
            });

            if (!response.success) {
                throw new Error(response.error || "Failed to upload file to storage");
            }

            // Update file size if received
            if (response.data && response.data.size) {
                await filesStore.update(fileId, { size: response.data.size });
            }

            return response;
        } catch (error) {
            throw new Error(`Upload failed: ${error.message}`);
        }
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
                    console.error(`Failed to delete ${fid} from storage:`, err.message);
                })
            );
            
            await Promise.all(deletePromises);

            return { success: true, deletedFiles: physicalFilesToDelete };
        } catch (error) {
            throw new Error(`Delete failed: ${error.message}`);
        }
    }

    // SEARCH - Search files
    async searchFiles(query, userId, filters = {}) {
        try {
            // Search on storage-server
            const storageResponse = await storageClient.search(query, filters);

            if (!storageResponse.success) {
                throw new Error(storageResponse.error || "Search failed");
            }

            // Filter results by user permissions
            const fileIds = storageResponse.data?.results || [];
            const accessibleFiles = [];

            for (const fileId of fileIds) {
                const file = await filesStore.getById(fileId);
                if (file) {
                    const hasPermission = await this.checkPermission(userId, fileId, 'Read');
                    if (hasPermission) {
                        accessibleFiles.push(file);
                    }
                }
            }

            return accessibleFiles;
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

    // Move file/folder to another location
    async moveFile(fileId, newParentId, userId) {
        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check write permission on file being moved
        const hasPermission = await this.checkPermission(userId, fileId, 'Write');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Check destination parent
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
        const siblings = await filesStore.getByParentId(newParentId);
        const duplicate = siblings.find(s => s.id !== fileId && s.name === file.name && s.type === file.type);
        if (duplicate) {
            throw new Error(`A ${file.type} named "${file.name}" already exists in destination`);
        }

        // Execute move
        return await filesStore.update(fileId, { parentId: newParentId });
    }

    // Rename file/folder
    async renameFile(fileId, newName, userId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        const hasPermission = await this.checkPermission(userId, fileId, 'Write');
        if (!hasPermission) {
            throw new Error("Permission denied");
        }

        // Check name uniqueness
        const siblings = await filesStore.getByParentId(file.parentId);
        const duplicate = siblings.find(s => s.id !== fileId && s.name === newName && s.type === file.type);
        if (duplicate) {
            throw new Error(`A ${file.type} named "${newName}" already exists in this folder`);
        }

        return await filesStore.update(fileId, { name: newName });
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
