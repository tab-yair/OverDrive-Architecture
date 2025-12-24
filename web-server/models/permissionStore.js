const { Permission } = require('./Permission.js');

// In-memory permission storage with multi-key indexing
// Can be replaced with MongoDB in future iterations

const permissionsById = new Map();
const permissionsByUser = new Map();
const permissionsByFile = new Map();
const permissionsByUserFile = new Map();

// Helper for deleting from nested map
const _removeFromMap = (map, key, pid) => {
    const subMap = map.get(key);
    if (!subMap) return;
    subMap.delete(pid);
    if (subMap.size === 0) {
        map.delete(key);
    }
};

const permissionStore = {
    async create(pid, fileId, userId, level, customPermissions = null) {
        // Check if permission already exists for this user+file combination
        const existingKey = `${userId}:${fileId}`;
        const existingPerm = permissionsByUserFile.get(existingKey);
        
        // If exists, delete it first to prevent memory leak
        if (existingPerm) {
            await permissionStore.delete(existingPerm.pid);
        }
        
        const newPermission = new Permission(pid, fileId, userId, level, customPermissions);

        // Save in indexes
        permissionsById.set(pid, newPermission);
        permissionsByUserFile.set(existingKey, newPermission);

        if (!permissionsByUser.has(userId)) {
            permissionsByUser.set(userId, new Map());
        }
        permissionsByUser.get(userId).set(pid, newPermission);

        if (!permissionsByFile.has(fileId)) {
            permissionsByFile.set(fileId, new Map());
        }
        permissionsByFile.get(fileId).set(pid, newPermission);

        return { ...newPermission };
    },

    async getById(pid) {
        const perm = permissionsById.get(pid);
        return perm ? { ...perm } : null;
    },

    async getByFileId(fileId) {
        const map = permissionsByFile.get(fileId);
        return map ? Array.from(map.values()).map(p => ({ ...p })) : [];
    },

    async getByUserId(userId) {
        const map = permissionsByUser.get(userId);
        return map ? Array.from(map.values()).map(p => ({ ...p })) : [];
    },

    async getUserPermissionForFile(userId, fileId) {
        const key = `${userId}:${fileId}`;
        const perm = permissionsByUserFile.get(key);
        return perm ? { ...perm } : null;
    },

    async getAccessibleFileIds(userId) {
        const map = permissionsByUser.get(userId);
        return map ? Array.from(map.values()).map(p => p.fileId) : [];
    },

    async exists(userId, fileId) {
        return permissionsByUserFile.has(`${userId}:${fileId}`);
    },

    async update(pid, updates) {
        const perm = permissionsById.get(pid);
        if (!perm) return null;
        
        Object.assign(perm, updates);
        return { ...perm };
    },

    async delete(pid) {
        const perm = permissionsById.get(pid);
        if (!perm) return false;

        const { userId, fileId } = perm;

        permissionsById.delete(pid);
        permissionsByUserFile.delete(`${userId}:${fileId}`);
        _removeFromMap(permissionsByUser, userId, pid);
        _removeFromMap(permissionsByFile, fileId, pid);

        return true;
    },

    async deleteAllForFile(fileId) {
        const map = permissionsByFile.get(fileId);
        if (!map) return 0;
        
        const pids = Array.from(map.keys());
        for (const pid of pids) {
            await permissionStore.delete(pid);
        }
        return pids.length;
    },

    async deleteAllForUser(userId) {
        const map = permissionsByUser.get(userId);
        if (!map) return 0;
        
        const pids = Array.from(map.keys());
        for (const pid of pids) {
            await permissionStore.delete(pid);
        }
        return pids.length;
    },

    async getAll() {
        return Array.from(permissionsById.values()).map(p => ({ ...p }));
    }
};

module.exports = { permissionStore };
