import { Permission } from '../models/Permission.js';
import { permissionStore } from '../models/permissionStore.js';
import { usersStore } from '../models/usersStore.js';
import { filesStore } from '../models/filesStore.js';
import { generateId } from '../utils/idGenerator.js';

// Business logic layer for permission management
// Handles complex validations, add/update/delete, permission checks, file sharing
class PermissionService {
    
    // Add new permission
    async addPermission(fileId, userId, level, customPermissions = null, requestingUserId) {
        // Prevent adding OWNER through this method - use addOwner instead
        if (level === 'OWNER') {
            throw new Error("Cannot add OWNER permission directly. Use transferOwnership instead.");
        }

        // Basic validation
        const validationError = Permission.validate({ fileId, userId, level, customPermissions });
        if (validationError) {
            throw new Error(validationError);
        }

        // Check file exists
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File does not exist");
        }

        // Check user exists
        const user = await usersStore.getById(userId);
        if (!user) {
            throw new Error("User does not exist");
        }

        // Check requester is owner or has Share permission
        const canShare = await this.canUserShareFile(requestingUserId, fileId);
        if (!canShare) {
            throw new Error("Permission denied: You cannot share this file");
        }

        // If permission already exists, it will be replaced (old one deleted automatically)
        // This allows changing permission level for existing users
        
        // Create permission (will auto-delete existing one if present)
        const permissionId = generateId();
        const newPermission = await permissionStore.create(permissionId, fileId, userId, level, customPermissions);

        return newPermission;
    }

    // Add VIEWER permission
    async addViewer(fileId, userId, requestingUserId) {
        return await this.addPermission(fileId, userId, 'VIEWER', null, requestingUserId);
    }

    // Add EDITOR permission
    async addEditor(fileId, userId, requestingUserId) {
        return await this.addPermission(fileId, userId, 'EDITOR', null, requestingUserId);
    }

    // Transfer ownership to a new user
    async transferOwnership(fileId, newOwnerId, requestingUserId) {
        // Only current owner can transfer ownership
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File does not exist");
        }

        if (file.ownerId !== requestingUserId) {
            throw new Error("Only the owner can transfer ownership");
        }

        if (newOwnerId === requestingUserId) {
            throw new Error("You are already the owner of this file");
        }

        // Check new owner exists
        const newOwner = await usersStore.getById(newOwnerId);
        if (!newOwner) {
            throw new Error("New owner user does not exist");
        }

        // Downgrade old owner's permission from OWNER to EDITOR
        const oldOwnerPermission = await permissionStore.getUserPermissionForFile(requestingUserId, fileId);
        if (oldOwnerPermission && oldOwnerPermission.level === 'OWNER') {
            await permissionStore.update(oldOwnerPermission.pid, { level: 'EDITOR', customPermissions: null });
        } else if (!oldOwnerPermission) {
            // Create EDITOR permission for old owner if they don't have any permission yet
            const oldOwnerPermId = generateId();
            await permissionStore.create(oldOwnerPermId, fileId, requestingUserId, 'EDITOR', null);
        }

        // Remove new owner's existing permission (if exists) to replace it with OWNER
        const existingPermission = await permissionStore.getUserPermissionForFile(newOwnerId, fileId);
        if (existingPermission) {
            await permissionStore.delete(existingPermission.pid);
        }

        // Update file's ownerId
        await filesStore.update(fileId, { ownerId: newOwnerId });

        // Create OWNER permission for new owner
        const permissionId = generateId();
        const newOwnerPermission = await permissionStore.create(permissionId, fileId, newOwnerId, 'OWNER', null);

        return {
            success: true,
            newOwner: newOwnerPermission,
            previousOwnerDowngradedTo: 'EDITOR',
            message: "Ownership transferred successfully"
        };
    }

    // Add custom permission
    async addCustomPermission(fileId, userId, customPermissions, requestingUserId) {
        // Validate custom permissions
        const requiredKeys = ['canRead', 'canWrite', 'canDelete', 'canShare'];
        const hasAllKeys = requiredKeys.every(key => typeof customPermissions[key] === 'boolean');
        
        if (!hasAllKeys) {
            throw new Error("Custom permissions must include: canRead, canWrite, canDelete, canShare");
        }

        return await this.addPermission(fileId, userId, 'CUSTOM', customPermissions, requestingUserId);
    }

    // Update existing permission level
    async updatePermission(permissionId, updates, requestingUserId) {
        const permission = await permissionStore.getById(permissionId);
        
        if (!permission) {
            throw new Error("Permission not found");
        }

        // Check requester can modify this permission
        const canShare = await this.canUserShareFile(requestingUserId, permission.fileId);
        if (!canShare) {
            throw new Error("Permission denied: You cannot modify this permission");
        }

        // Validate updates
        if (updates.level) {
            const validLevels = ['VIEWER', 'EDITOR', 'OWNER', 'CUSTOM'];
            if (!validLevels.includes(updates.level)) {
                throw new Error("Invalid permission level");
            }

            if (updates.level === 'CUSTOM' && !updates.customPermissions) {
                throw new Error("Custom permissions required for CUSTOM level");
            }
        }

        const updatedPermission = await permissionStore.update(permissionId, updates);
        return updatedPermission;
    }

    // Remove permission
    async removePermission(permissionId, requestingUserId) {
        const permission = await permissionStore.getById(permissionId);
        
        if (!permission) {
            throw new Error("Permission not found");
        }

        // Check requester can delete this permission
        const file = await filesStore.getById(permission.fileId);
        if (!file) {
            throw new Error("Associated file not found");
        }

        // Only owner or user with Share permission can delete permissions
        const canShare = await this.canUserShareFile(requestingUserId, permission.fileId);
        if (!canShare && permission.userId !== requestingUserId) {
            throw new Error("Permission denied: You cannot remove this permission");
        }

        // Cannot remove the current owner's permission
        if (file.ownerId === permission.userId) {
            throw new Error("Cannot remove owner's permission. Transfer ownership first.");
        }

        const success = await permissionStore.delete(permissionId);
        return { success, message: "Permission removed successfully" };
    }

    // Get all permissions for a file
    async getFilePermissions(fileId, requestingUserId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check requester can view permissions
        const canView = await this.canUserAccessFile(requestingUserId, fileId);
        if (!canView) {
            throw new Error("Permission denied");
        }

        const permissions = await permissionStore.getByFileId(fileId);
        
        // Enrich data with user details
        const enrichedPermissions = await Promise.all(
            permissions.map(async (perm) => {
                const user = await usersStore.getById(perm.userId);
                return {
                    ...perm,
                    user: user ? {
                        id: user.id,
                        username: user.username,
                        displayName: user.displayName
                    } : null
                };
            })
        );

        return enrichedPermissions;
    }

    // Get all files user can access
    async getUserAccessibleFiles(userId) {
        const user = await usersStore.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const permissions = await permissionStore.getByUserId(userId);
        
        // Enrich data with file details
        const enrichedPermissions = await Promise.all(
            permissions.map(async (perm) => {
                const file = await filesStore.getById(perm.fileId);
                return {
                    ...perm,
                    file: file || null
                };
            })
        );
        
        const accessibleFiles = enrichedPermissions.filter(item => item.file !== null);

        return accessibleFiles;
    }

    // Check if user can access file
    async canUserAccessFile(userId, fileId) {
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        return permission !== null;
    }

    // Check if user can share file
    async canUserShareFile(userId, fileId) {
        const file = await filesStore.getById(fileId);
        if (!file) return false;

        // Owner can always share
        if (file.ownerId === userId) return true;

        // Check for Share permission
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Share');
    }

    // Check if user can read file
    async canUserRead(userId, fileId) {
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Read');
    }

    // Check if user can write to file
    async canUserWrite(userId, fileId) {
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Write');
    }

    // Check if user can delete file
    async canUserDelete(userId, fileId) {
        const permission = await permissionStore.getUserPermissionForFile(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Delete');
    }

    // Share file with multiple users at once
    async shareWithMultipleUsers(fileId, userIds, level, requestingUserId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check requester can share
        const canShare = await this.canUserShareFile(requestingUserId, fileId);
        if (!canShare) {
            throw new Error("Permission denied: You cannot share this file");
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                const permission = await this.addPermission(fileId, userId, level, null, requestingUserId);
                results.successful.push({ userId, permission });
            } catch (error) {
                results.failed.push({ userId, error: error.message });
            }
        }

        return results;
    }

}

// Create singleton instance
const permissionService = new PermissionService();

export { PermissionService, permissionService };
