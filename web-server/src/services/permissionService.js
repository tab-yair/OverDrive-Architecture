const { Permission } = require('../models/Permission.js');
const { permissionStore } = require('../models/permissionStore.js');
const { usersStore } = require('../models/usersStore.js');
const { filesStore } = require('../models/filesStore.js');
const { generateId } = require('../utils/idGenerator.js');

// Business logic layer for permission management
// Handles complex validations, add/update/delete, permission checks, file sharing
class PermissionService {
    
    // Add new permission
    async addPermission({ fileId, userId, level, requestingUserId }) {
        // Basic validation
        const validationError = Permission.validate({ fileId, userId, level });
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

        // POST cannot transfer ownership - only PATCH can
        if (level === 'OWNER') {
            throw new Error("Cannot grant OWNER permission via POST. Use PATCH on existing permission to transfer ownership.");
        }

        // Check requester is owner or has Share permission (EDITOR or above)
        const canShare = await this.canUserShareFile({ userId: requestingUserId, fileId });
        if (!canShare) {
            throw new Error("Permission denied: Only editors and owners can share files");
        }

        // If permission already exists, it will be replaced (old one deleted automatically)
        // This allows changing permission level for existing users
        
        // Create permission (will auto-delete existing one if present)
        const permissionId = generateId();
        const newPermission = await permissionStore.create(permissionId, fileId, userId, level);

        // If this is a folder, recursively grant permission to all children
        if (file.type === 'folder') {
            await this._grantPermissionRecursively(fileId, userId, level);
        }

        return newPermission;
    }

    // Add VIEWER permission
    async addViewer({ fileId, userId, requestingUserId }) {
        return await this.addPermission({ fileId, userId, level: 'VIEWER', requestingUserId });
    }

    // Add EDITOR permission
    async addEditor({ fileId, userId, requestingUserId }) {
        return await this.addPermission({ fileId, userId, level: 'EDITOR', requestingUserId });
    }

    // Transfer ownership to a new user
    async transferOwnership({ fileId, newOwnerId, requestingUserId }) {
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
            await permissionStore.update(oldOwnerPermission.pid, { level: 'EDITOR' });
        } else if (!oldOwnerPermission) {
            // Create EDITOR permission for old owner if they don't have any permission yet
            const oldOwnerPermId = generateId();
            await permissionStore.create(oldOwnerPermId, fileId, requestingUserId, 'EDITOR');
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

   

    // Update existing permission level only
    async updatePermission({ permissionId, updates, requestingUserId }) {
        const permission = await permissionStore.getById(permissionId);

        if (!permission) {
            throw new Error("Permission not found");
        }

        const file = await filesStore.getById(permission.fileId);
        if (!file) {
            throw new Error("Associated file not found");
        }

        // Check requester has permission to modify this permission
        const canShare = await this.canUserShareFile({ userId: requestingUserId, fileId: permission.fileId });
        if (!canShare) {
            throw new Error("Permission denied: You cannot modify this permission");
        }

        // Check if permission is inherited - cannot modify directly
        if (permission.isInherited) {
            // Check if user has permission to edit the source folder
            const sourceFolder = await filesStore.getById(permission.inheritedFrom);
            const canEditSource = await this.canUserWrite({ userId: requestingUserId, fileId: permission.inheritedFrom });
            
            const error = {
                error: "Cannot modify inherited permission directly",
                message: "This permission is inherited from a parent folder. To modify it, please change the permission on the parent folder.",
                canEditSource: canEditSource,
                sourceFolder: sourceFolder ? {
                    id: sourceFolder.id,
                    name: sourceFolder.name,
                    path: sourceFolder.path
                } : null
            };
            
            // Return structured error as JSON for client to handle
            const err = new Error(JSON.stringify(error));
            err.isStructuredError = true;
            throw err;
        }

        // Only allow level changes (not userId changes)
        if (!updates.level) {
            throw new Error("Only permission level can be updated via PATCH");
        }

        // Validate level
        const validLevels = ['VIEWER', 'EDITOR', 'OWNER'];
        if (!validLevels.includes(updates.level)) {
            throw new Error("Invalid permission level");
        }

        // Special handling for OWNER level - this is ownership transfer
        if (updates.level === 'OWNER') {
            // Transfer ownership to the user who has this permission
            // transferOwnership will validate that requester is the current owner
            return await this.transferOwnership({ fileId: permission.fileId, newOwnerId: permission.userId, requestingUserId });
        }

        // Cannot change owner's permission level to something else
        if (permission.level === 'OWNER') {
            throw new Error("Cannot change owner's permission level. Transfer ownership first.");
        }

        const updatedPermission = await permissionStore.update(permissionId, { level: updates.level });
        
        // If this is a folder, update all inherited permissions recursively
        if (file.type === 'folder') {
            await this._updateInheritedPermissionsRecursively(file.id, permission.userId, updates.level);
        }
        
        return updatedPermission;
    }

    // Remove permission
    async removePermission({ permissionId, requestingUserId }) {
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
        const canShare = await this.canUserShareFile({ userId: requestingUserId, fileId: permission.fileId });
        if (!canShare && permission.userId !== requestingUserId) {
            throw new Error("Permission denied: You cannot remove this permission");
        }

        // Cannot remove the current owner's permission
        if (file.ownerId === permission.userId) {
            throw new Error("Cannot remove owner's permission. Transfer ownership first.");
        }

        const success = await permissionStore.delete(permissionId);

        // If this is a folder, recursively remove inherited permissions
        // but keep direct permissions that were granted before
        if (file.type === 'folder') {
            await this._removeInheritedPermissionsRecursively(permission.fileId, permission.userId, permissionId);
        }

        return { success, message: "Permission removed successfully" };
    }

    // Get all permissions for a file
    async getFilePermissions({ fileId, requestingUserId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check requester can view permissions
        const canView = await this.canUserAccessFile({ userId: requestingUserId, fileId });
        if (!canView) {
            throw new Error("Permission denied");
        }

        // Check if user has share permission (EDITOR or above)
        const canShare = await this.canUserShareFile({ userId: requestingUserId, fileId });
        if (!canShare) {
            throw new Error("You don't have permission to view sharing details for this file");
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
                        firstName: user.firstName,
                        lastName: user.lastName
                    } : null
                };
            })
        );

        return enrichedPermissions;
    }

    // Get all files user can access
    async getUserAccessibleFiles({ userId }) {
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
    async canUserAccessFile({ userId, fileId }) {
        const permission = await this._getEffectivePermission(userId, fileId);
        return permission !== null;
    }

    // Get effective permission (strongest between direct and inherited)
    async _getEffectivePermission(userId, fileId) {
        const allPerms = await permissionStore.getAllPermissionsForUserFile(userId, fileId);
        if (!allPerms || allPerms.length === 0) return null;
        
        // Select the strongest permission (direct or inherited)
        return Permission.selectStrongest(allPerms);
    }

    // Check if user can share file
    async canUserShareFile({ userId, fileId }) {
        const file = await filesStore.getById(fileId);
        if (!file) return false;

        // Owner can always share
        if (file.ownerId === userId) return true;

        // Check for Share permission (use effective permission)
        const permission = await this._getEffectivePermission(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Share');
    }

    // Check if user can read file
    async canUserRead({ userId, fileId }) {
        const permission = await this._getEffectivePermission(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Read');
    }

    // Check if user can write to file
    async canUserWrite({ userId, fileId }) {
        const permission = await this._getEffectivePermission(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Write');
    }

    // Check if user can delete file
    async canUserDelete({ userId, fileId }) {
        const permission = await this._getEffectivePermission(userId, fileId);
        if (!permission) return false;

        return Permission.can(permission, 'Delete');
    }

    // Share file with multiple users at once
    async shareWithMultipleUsers({ fileId, userIds, level, requestingUserId }) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Check requester can share
        const canShare = await this.canUserShareFile({ userId: requestingUserId, fileId });
        if (!canShare) {
            throw new Error("Permission denied: You cannot share this file");
        }

        const results = {
            successful: [],
            failed: []
        };

        for (const userId of userIds) {
            try {
                const permission = await this.addPermission({ fileId, userId, level, requestingUserId });
                results.successful.push({ userId, permission });
            } catch (error) {
                results.failed.push({ userId, error: error.message });
            }
        }

        return results;
    }

    // ===== RECURSIVE PERMISSION HELPERS =====

    /**
     * Recursively grant permission to all files/folders within a folder
     * Used when granting permission on a folder
     * 
     * Logic: Always create inherited permission, even if direct permission exists
     * In practice, user will get the strongest between direct and inherited
     */
    async _grantPermissionRecursively(folderId, userId, level) {
        // Get all children of this folder
        const children = await filesStore.getByParentId(folderId);
        
        for (const child of children) {
            // Always create inherited permission
            // If direct permission exists, store will delete previous inherited and create new one
            const childPermId = generateId();
            await permissionStore.create(
                childPermId, 
                child.id, 
                userId, 
                level, 
                true, // isInherited
                folderId // inheritedFrom
            );
            
            // If child is also a folder, recurse
            if (child.type === 'folder') {
                await this._grantPermissionRecursively(child.id, userId, level);
            }
        }
    }

    /**
     * Recursively remove inherited permissions from folder children
     * Keeps direct permissions that were granted directly to the file
     * 
     * Logic: Delete only inherited permissions that came from this folder
     * If direct permission exists - it stays
     */
    async _removeInheritedPermissionsRecursively(folderId, userId, parentPermissionId) {
        // Get all children of this folder
        const children = await filesStore.getByParentId(folderId);
        
        for (const child of children) {
            // Delete only inherited permissions from this folder
            await permissionStore.deleteInheritedPermissions(userId, child.id, folderId);
            
            // If child is a folder, recurse
            if (child.type === 'folder') {
                await this._removeInheritedPermissionsRecursively(child.id, userId, parentPermissionId);
            }
        }
    }

    /**
     * Recursively update inherited permissions when parent permission changes
     * Updates level of all inherited permissions from this folder
     */
    async _updateInheritedPermissionsRecursively(folderId, userId, newLevel) {
        // Get all children of this folder
        const children = await filesStore.getByParentId(folderId);
        
        for (const child of children) {
            // Update only inherited permissions from this folder
            const allPerms = await permissionStore.getAllPermissionsForUserFile(userId, child.id);
            const inheritedPerm = allPerms.find(p => p.isInherited && p.inheritedFrom === folderId);
            
            if (inheritedPerm) {
                await permissionStore.update(inheritedPerm.pid, { level: newLevel });
            }
            
            // If child is a folder, recurse
            if (child.type === 'folder') {
                await this._updateInheritedPermissionsRecursively(child.id, userId, newLevel);
            }
        }
    }

}

// Create singleton instance
const permissionService = new PermissionService();

module.exports = { PermissionService, permissionService };
