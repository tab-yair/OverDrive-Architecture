import crypto from 'crypto';

class Permission {
    constructor(pid, fileId, userId, level, customPermissions = null) {
        this.pid = pid;
        this.fileId = fileId;
        this.userId = userId;
        this.level = level; // 'VIEWER', 'EDITOR', 'OWNER', 'CUSTOM'
        this.customPermissions = customPermissions; // Only if level === 'CUSTOM'
        this.createdAt = new Date();
    }

    // Predefined permission levels
    static LEVELS = {
        'VIEWER': { canRead: true, canWrite: false, canDelete: false, canShare: false },
        'EDITOR': { canRead: true, canWrite: true, canDelete: false, canShare: true },
        'OWNER':  { canRead: true, canWrite: true, canDelete: true,  canShare: true }
    };

    static can(permissionObj, action) {
        if (!permissionObj) return false;
        const actionKey = `can${action}`;
        if (permissionObj.level === 'CUSTOM') {
            return permissionObj.customPermissions?.[actionKey] || false;
        }
        return Permission.LEVELS[permissionObj.level]?.[actionKey] || false;
    }

    static validate(data) {
        if (!data.fileId) return "File ID is required";
        if (!data.userId) return "User ID is required";

        const validLevels = ['VIEWER', 'EDITOR', 'OWNER', 'CUSTOM'];
        if (!validLevels.includes(data.level)) return "Invalid permission level";

        if (data.level === 'CUSTOM' && !data.customPermissions) return "Custom permissions required for CUSTOM level";

        return null;
    }
}

// Indexes for O(1) lookups
const permissionsById = new Map();      // pid -> permission
const permissionsByUser = new Map();    // userId -> Map(pid -> permission)
const permissionsByFile = new Map();    // fileId -> Map(pid -> permission)
const permissionsByUserFile = new Map(); // "userId:fileId" -> permission

// Helper to remove a permission from a grouped Map
function _removeFromMap(map, key, pid) {
    const subMap = map.get(key);
    if (!subMap) return;
    subMap.delete(pid);
    if (subMap.size === 0) map.delete(key);
}

const permissionStore = {
    create: (fileId, userId, level, customPermissions = null) => {
        // Validate inputs
        const fileExists = filesStore.getByID(fileId);
        if (!fileExists) throw new Error("File does not exist");

        const userExists = usersStore.getByID(userId);
        if (!userExists) throw new Error("User does not exist");

        // Check for duplicate
        const key = `${userId}:${fileId}`;
        if (permissionsByUserFile.has(key)) throw new Error("Permission already exists for this user and file");

        const pid = crypto.randomUUID();
        const newPermission = new Permission(pid, fileId, userId, level, customPermissions);

        // Add to O(1) indexes
        permissionsById.set(pid, newPermission);
        permissionsByUserFile.set(key, newPermission);

        if (!permissionsByUser.has(userId)) permissionsByUser.set(userId, new Map());
        permissionsByUser.get(userId).set(pid, newPermission);

        if (!permissionsByFile.has(fileId)) permissionsByFile.set(fileId, new Map());
        permissionsByFile.get(fileId).set(pid, newPermission);

        return { ...newPermission };
    },

    addEditor: (fileId, userId) => permissionStore.create(fileId, userId, 'EDITOR'),
    addViewer: (fileId, userId) => permissionStore.create(fileId, userId, 'VIEWER'),
    addOwner:  (fileId, userId) => permissionStore.create(fileId, userId, 'OWNER'),
    addCustom: (fileId, userId, customPermissions) => permissionStore.create(fileId, userId, 'CUSTOM', customPermissions),

    getByID: (pid) => {
        const perm = permissionsById.get(pid);
        return perm ? { ...perm } : null;
    },

    getByFileId: (fileId) => {
        const map = permissionsByFile.get(fileId);
        return map ? Array.from(map.values()).map(p => ({ ...p })) : [];
    },

    getByUserId: (userId) => {
        const map = permissionsByUser.get(userId);
        return map ? Array.from(map.values()).map(p => ({ ...p })) : [];
    },

    getAccessibleFileIds: (userId) => {
        const map = permissionsByUser.get(userId);
        return map ? Array.from(map.values()).map(p => p.fileId) : [];
    },

    getUserPermissionForFile: (userId, fileId) => {
        const key = `${userId}:${fileId}`;
        const perm = permissionsByUserFile.get(key);
        return perm ? { ...perm } : null;
    },

    update: (pid, updates) => {
        const perm = permissionsById.get(pid);
        if (!perm) return null;
        Object.assign(perm, updates);
        return { ...perm };
    },

    delete: (pid) => {
        const perm = permissionsById.get(pid);
        if (!perm) return false;

        const { userId, fileId } = perm;

        permissionsById.delete(pid);
        permissionsByUserFile.delete(`${userId}:${fileId}`);
        _removeFromMap(permissionsByUser, userId, pid);
        _removeFromMap(permissionsByFile, fileId, pid);

        return true;
    },

    deleteAllForFile: (fileId) => {
        const map = permissionsByFile.get(fileId);
        if (!map) return 0;
        const pids = Array.from(map.keys());
        pids.forEach(pid => permissionStore.delete(pid));
        return pids.length;
    },

    deleteByUserId: (userId) => {
        const map = permissionsByUser.get(userId);
        if (!map) return 0;
        const pids = Array.from(map.keys());
        pids.forEach(pid => permissionStore.delete(pid));
        return pids.length;
    },

    getAll: () => Array.from(permissionsById.values()).map(p => ({ ...p }))
};

export { Permission, permissionStore };
