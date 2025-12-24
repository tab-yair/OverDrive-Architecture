const { FileItem } = require('./FileItem.js');

// In-memory file storage with indexing for efficient lookups
// Can be replaced with MongoDB in future iterations

const filesById = new Map();
const filesByParent = new Map();
const filesByOwner = new Map();

// Dependency injection for permission cleanup
let _permissionStore = null;

const filesStore = {
    _setPermissionStore(store) {
        _permissionStore = store;
    },
    
    async create(id, name, type, ownerId, parentId = null, size = 0) {
        const newItem = new FileItem(id, name, type, ownerId, parentId, size);
        
        filesById.set(id, newItem);

        if (!filesByParent.has(parentId)) {
            filesByParent.set(parentId, new Map());
        }
        filesByParent.get(parentId).set(id, newItem);

        if (!filesByOwner.has(ownerId)) {
            filesByOwner.set(ownerId, new Map());
        }
        filesByOwner.get(ownerId).set(id, newItem);

        return { ...newItem };
    },

    async getById(id) {
        const file = filesById.get(id);
        return file ? { ...file } : null;
    },

    async getByParentId(parentId) {
        const folderMap = filesByParent.get(parentId);
        if (!folderMap) return [];
        return Array.from(folderMap.values()).map(f => ({ ...f }));
    },

    async getByOwnerId(ownerId) {
        const ownerMap = filesByOwner.get(ownerId);
        if (!ownerMap) return [];
        return Array.from(ownerMap.values()).map(f => ({ ...f }));
    },

    async getAll() {
        return Array.from(filesById.values()).map(f => ({ ...f }));
    },

    async update(id, updates, expectedUpdatedAt = null) {
        const file = filesById.get(id);
        if (!file) return null;

        // Optimistic locking: check if file was modified since it was read
        if (expectedUpdatedAt !== null && file.updatedAt !== expectedUpdatedAt) {
            throw new Error('CONFLICT: File was modified by another process');
        }

        if (updates.parentId !== undefined && updates.parentId !== file.parentId) {
            const oldParentMap = filesByParent.get(file.parentId);
            if (oldParentMap) {
                oldParentMap.delete(id);
                if (oldParentMap.size === 0) {
                    filesByParent.delete(file.parentId);
                }
            }
            
            if (!filesByParent.has(updates.parentId)) {
                filesByParent.set(updates.parentId, new Map());
            }
            filesByParent.get(updates.parentId).set(id, file);
        }

        if (updates.ownerId !== undefined && updates.ownerId !== file.ownerId) {
            const oldOwnerMap = filesByOwner.get(file.ownerId);
            if (oldOwnerMap) {
                oldOwnerMap.delete(id);
                if (oldOwnerMap.size === 0) {
                    filesByOwner.delete(file.ownerId);
                }
            }
            
            if (!filesByOwner.has(updates.ownerId)) {
                filesByOwner.set(updates.ownerId, new Map());
            }
            filesByOwner.get(updates.ownerId).set(id, file);
        }

        Object.assign(file, updates);
        file.modifiedAt = new Date().toISOString();
        
        return { ...file };
    },

    // Recursive atomic deletion - returns physicalFileIds for storage cleanup
    async delete(id) {
        const file = filesById.get(id);
        if (!file) return [];

        const physicalFileIdsToDelete = [];
        const stack = [file];

        while (stack.length > 0) {
            const current = stack.pop();

            if (current.type === 'folder') {
                const childrenMap = filesByParent.get(current.id);
                if (childrenMap) {
                    for (const child of childrenMap.values()) {
                        stack.push(child);
                    }
                }
            } else {
                physicalFileIdsToDelete.push(current.id);
            }

            // Permission cleanup via DI
            if (_permissionStore) {
                await _permissionStore.deleteAllForFile(current.id);
            }

            const parentMap = filesByParent.get(current.parentId);
            if (parentMap) {
                parentMap.delete(current.id);
                if (parentMap.size === 0) {
                    filesByParent.delete(current.parentId);
                }
            }

            const ownerMap = filesByOwner.get(current.ownerId);
            if (ownerMap) {
                ownerMap.delete(current.id);
                if (ownerMap.size === 0) {
                    filesByOwner.delete(current.ownerId);
                }
            }

            filesById.delete(current.id);
        }

        return physicalFileIdsToDelete;
    },

    // Delete all files owned by user - returns physicalFileIds
    async deleteByOwnerId(ownerId) {
        const ownerMap = filesByOwner.get(ownerId);
        if (!ownerMap) return [];

        const allFileIds = Array.from(ownerMap.keys());
        const allPhysicalIds = [];

        for (const fid of allFileIds) {
            const physicalIds = await filesStore.delete(fid);
            allPhysicalIds.push(...physicalIds);
        }

        return allPhysicalIds;
    },

    async getAllDescendants(parentId) {
        const descendants = [];
        const stack = [parentId];

        while (stack.length > 0) {
            const currentParentId = stack.pop();
            const children = filesByParent.get(currentParentId);
            
            if (children) {
                for (const child of children.values()) {
                    descendants.push({ ...child });
                    if (child.type === 'folder') {
                        stack.push(child.id);
                    }
                }
            }
        }

        return descendants;
    }
};

// Initialize DI
const { permissionStore } = require('./permissionStore.js');
filesStore._setPermissionStore(permissionStore);

module.exports = { filesStore };
