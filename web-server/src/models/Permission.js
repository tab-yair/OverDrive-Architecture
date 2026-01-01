// Permission for user on file
class Permission {
    constructor(pid, fileId, userId, level, isInherited = false, inheritedFrom = null) {
        this.pid = pid;
        this.fileId = fileId;
        this.userId = userId;
        this.level = level;
        this.isInherited = isInherited; // Whether permission was inherited from parent folder
        this.inheritedFrom = inheritedFrom; // Which folder this permission was inherited from (if isInherited=true)
        const now = new Date().toISOString();
        this.createdAt = now;
        this.modifiedAt = now;
    }

    // Predefined permission levels
    static LEVELS = {
        'VIEWER': { canRead: true, canWrite: false, canDelete: false, canShare: false },
        'EDITOR': { canRead: true, canWrite: true, canDelete: false, canShare: true },
        'OWNER':  { canRead: true, canWrite: true, canDelete: true,  canShare: true }
    };

    // Check if user can edit based on permission level
    static canEdit(level) {
        return level === 'EDITOR' || level === 'OWNER';
    }

    // Get permission strength (for comparing)
    static getStrength(level) {
        const strengths = { 'VIEWER': 1, 'EDITOR': 2, 'OWNER': 3 };
        return strengths[level] || 0;
    }

    // Select strongest permission from array of permissions
    static selectStrongest(permissions) {
        if (!permissions || permissions.length === 0) return null;
        if (permissions.length === 1) return permissions[0];
        
        // Select the strongest permission
        return permissions.reduce((strongest, current) => {
            const strongestLevel = Permission.getStrength(strongest.level);
            const currentLevel = Permission.getStrength(current.level);
            return currentLevel > strongestLevel ? current : strongest;
        });
    }

    // Check if user has permission for specific action
    static can(permissionObj, action) {
        if (!permissionObj) return false;
        const actionKey = `can${action}`;
        return Permission.LEVELS[permissionObj.level]?.[actionKey] || false;
    }

    // Basic permission data validation
    static validate(data) {
        if (!data.fileId) return "File ID is required";
        if (!data.userId) return "User ID is required";

        const validLevels = ['VIEWER', 'EDITOR', 'OWNER'];
        if (!validLevels.includes(data.level)) return "Invalid permission level";

        return null;
    }
}

module.exports = { Permission };
