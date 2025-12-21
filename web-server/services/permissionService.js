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

        // Check permission doesn't already exist
        if (await permissionStore.exists(userId, fileId)) {
            throw new Error("Permission already exists for this user and file");
        }

        // Create permission
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

    // Add OWNER permission (transfer ownership)
    async addOwner(fileId, userId, requestingUserId) {
        // Only owner can add additional owners
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File does not exist");
        }

        if (file.ownerId !== requestingUserId) {
            throw new Error("Only the owner can add other owners");
        }

        return await this.addPermission(fileId, userId, 'OWNER', null, requestingUserId);
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

        // Cannot remove owner's permission
        if (permission.level === 'OWNER' && file.ownerId === permission.userId) {
            throw new Error("Cannot remove owner's permission");
        }

        const success = await await permissionStore.delete(permissionId);
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
        const enrichedPermissions = permissions.map(perm => {
            const user = await usersStore.getById(perm.userId);
            return {
                ...perm,
                user: user ? {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName
                } : null
            };
        });

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
        const accessibleFiles = permissions.map(perm => {
            const file = await filesStore.getById(perm.fileId);
            return {
                ...perm,
                file: file || null
            };
        }).filter(item => item.file !== null);

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

    // Revoke sharing from all users (except owner)
    async revokeAllSharing(fileId, requestingUserId) {
        const file = await filesStore.getById(fileId);
        if (!file) {
            throw new Error("File not found");
        }

        // Only owner can revoke all sharing
        if (file.ownerId !== requestingUserId) {
            throw new Error("Only the owner can revoke all sharing");
        }

        const permissions = await permissionStore.getByFileId(fileId);
        let revokedCount = 0;

        for (const perm of permissions) {
            // Don't delete owner's permission
            if (perm.userId !== file.ownerId) {
                await await permissionStore.delete(perm.pid);
                revokedCount++;
            }
        }

        return {
            success: true,
            revokedCount,
            message: `${revokedCount} permission(s) revoked`
        };
    }

    // Get user permission summary
    async getUserPermissionSummary(userId) {
        const user = await usersStore.getById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const allPermissions = await permissionStore.getByUserId(userId);
        
        const summary = {
            total: allPermissions.length,
            byLevel: {
                OWNER: 0,
                EDITOR: 0,
                VIEWER: 0,
                CUSTOM: 0
            },
            filesOwned: 0,
            filesSharedWithMe: 0
        };

        allPermissions.forEach(perm => {
            summary.byLevel[perm.level]++;
            
            const file = await filesStore.getById(perm.fileId);
            if (file) {
                if (file.ownerId === userId) {
                    summary.filesOwned++;
                } else {
                    summary.filesSharedWithMe++;
                }
            }
        });

        return summary;
    }
}

// Create singleton instance
const permissionService = new PermissionService();

export { PermissionService, permissionService };
