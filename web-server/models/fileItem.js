import crypto from 'crypto';
import { usersStore } from './usersStore'; // הנחה שיש לך usersStore
import { permissionStore } from './permissionStore'; // הנחה שיש לך permissionStore

class FileItem {
    constructor(id, name, type, ownerId, parentId = null, size = 0) {
        this.id = id;
        this.name = name;
        this.type = type;       // 'file' or 'folder'
        this.ownerId = ownerId;
        this.parentId = parentId;
        this.size = size; // bytes
        const now = new Date().toISOString(); 
        this.createdAt = now;
        this.modifiedAt = now;
    }

    static validate(data) {
        if (!data.name || data.name.trim().length === 0) return "File name is required";
        if (!['file', 'folder'].includes(data.type)) return "Type must be 'file' or 'folder'";
        if (!data.ownerId) return "Owner ID is required";
        return null;
    }
}

// ---------- STORAGE ----------
const filesById = new Map();        // id -> FileItem
const filesByParent = new Map();    // parentId -> Map<fileId, FileItem>
const filesByOwner = new Map();     // ownerId -> Map<fileId, FileItem>

// ---------- INTERNAL HELPERS ----------
const _updateFileParentIndex = (fileId, fileRef, oldParentId, newParentId) => {
    const oldMap = filesByParent.get(oldParentId);
    if (oldMap) {
        oldMap.delete(fileId);
        if (oldMap.size === 0) filesByParent.delete(oldParentId);
    }

    if (!filesByParent.has(newParentId)) filesByParent.set(newParentId, new Map());
    filesByParent.get(newParentId).set(fileId, fileRef);
};

const _updateFileOwnerIndex = (fileId, fileRef, oldOwnerId, newOwnerId) => {
    const oldMap = filesByOwner.get(oldOwnerId);
    if (oldMap) {
        oldMap.delete(fileId);
        if (oldMap.size === 0) filesByOwner.delete(oldOwnerId);
    }
    if (!filesByOwner.has(newOwnerId)) filesByOwner.set(newOwnerId, new Map());
    filesByOwner.get(newOwnerId).set(fileId, fileRef);
};

// ---------- FILES STORE ----------
const filesStore = {
    // ---------------- CREATE ----------------
    create: (name, type, ownerId, parentId = null, size = 0) => {
        // Validate owner
        const ownerExists = usersStore.getByID(ownerId);
        if (!ownerExists) throw new Error("Owner does not exist");

        // Validate parent
        if (parentId !== null) {
            const parent = filesById.get(parentId);
            if (!parent) throw new Error("Parent folder does not exist");
            if (parent.type !== 'folder') throw new Error("Parent is not a folder");
        }

        // Validate name uniqueness
        const siblingsMap = filesByParent.get(parentId);
        if (siblingsMap) {
            for (const sibling of siblingsMap.values()) {
                if (sibling.name === name && sibling.type === type) {
                    throw new Error(`A ${type} named "${name}" already exists in this folder`);
                }
            }
        }

        // Create file
        const id = crypto.randomUUID();
        const newItem = new FileItem(id, name, type, ownerId, parentId, size);
        filesById.set(id, newItem);

        // Update parent index
        if (!filesByParent.has(parentId)) filesByParent.set(parentId, new Map());
        filesByParent.get(parentId).set(id, newItem);

        // Update owner index
        if (!filesByOwner.has(ownerId)) filesByOwner.set(ownerId, new Map());
        filesByOwner.get(ownerId).set(id, newItem);

        return { ...newItem };
    },

    // ---------------- GET ----------------
    getByID: (id) => {
        const file = filesById.get(id);
        return file ? { ...file } : null;
    },

    getAccessible: (accessibleFileIdsSet, parentId = null) => {
        const folderMap = filesByParent.get(parentId);
        if (!folderMap) return [];
        const result = [];
        for (const f of folderMap.values()) {
            if (accessibleFileIdsSet.has(f.id)) result.push({ ...f });
        }
        return result;
    },

    // ---------------- UPDATE ----------------
    update: (id, updates) => {
        const file = filesById.get(id);
        if (!file) return null;

        const nextName = updates.name !== undefined ? updates.name : file.name;
        const nextType = updates.type !== undefined ? updates.type : file.type;
        const nextParentId = updates.parentId !== undefined ? updates.parentId : file.parentId;
        const nextOwnerId = updates.ownerId !== undefined ? updates.ownerId : file.ownerId;

        // Validate owner change
        if (updates.ownerId !== undefined && updates.ownerId !== file.ownerId) {
            if (!usersStore.getByID(nextOwnerId)) throw new Error("Target owner does not exist");
        }

        // Validate parent change
        if (updates.parentId !== undefined && updates.parentId !== file.parentId) {
            if (nextParentId !== null) {
                const targetParent = filesById.get(nextParentId);
                if (!targetParent) throw new Error("Destination folder does not exist");
                if (targetParent.type !== 'folder') throw new Error("Destination is not a folder");
            }
        }

        // Check name/type conflicts in new parent
        if (updates.name || updates.type || updates.parentId !== undefined) {
            const destMap = filesByParent.get(nextParentId);
            if (destMap) {
                for (const sibling of destMap.values()) {
                    if (sibling.id !== id && sibling.name === nextName && sibling.type === nextType) {
                        throw new Error(`A ${nextType} named "${nextName}" already exists in the destination`);
                    }
                }
            }
        }

        // Update indices
        if (updates.parentId !== undefined && updates.parentId !== file.parentId) {
            _updateFileParentIndex(id, file, file.parentId, updates.parentId);
        }
        if (updates.ownerId !== undefined && updates.ownerId !== file.ownerId) {
            _updateFileOwnerIndex(id, file, file.ownerId, updates.ownerId);
        }

        // Apply updates
        Object.assign(file, updates);
        file.modifiedAt = new Date().toISOString();

        return { ...file };
    },

    // ---------------- DELETE ----------------
    // Inside filesStore

    // Inside filesStore
    delete: (id) => {
        const file = filesById.get(id);
        if (!file) return [];

        const physicalFileIdsToDelete = [];
        const stack = [file]; // Start with the item itself

        while (stack.length > 0) {
            const current = stack.pop();

            if (current.type === 'folder') {
                // 1. If it's a folder, add all its children to the stack to be processed
                const childrenMap = filesByParent.get(current.id);
                if (childrenMap) {
                    for (const child of childrenMap.values()) {
                        stack.push(child);
                    }
                }
            } else {
                // 2. If it's a file, it has a physical representation in C++
                physicalFileIdsToDelete.push(current.id);
            }

            // 3. Metadata Cleanup (The logical part we already wrote)
            
            // Clean Permissions
            permissionStore.deleteAllForFile(current.id);

            // Clean Parent Index
            const parentMap = filesByParent.get(current.parentId);
            if (parentMap) {
                parentMap.delete(current.id);
                if (parentMap.size === 0) filesByParent.delete(current.parentId);
            }

            // Clean Owner Index
            const ownerMap = filesByOwner.get(current.ownerId);
            if (ownerMap) {
                ownerMap.delete(current.id);
                if (ownerMap.size === 0) filesByOwner.delete(current.ownerId);
            }

            // Final removal from main Map
            filesById.delete(current.id);
        }

        // Return the list of UUIDs that the Controller must tell C++ to delete
        return physicalFileIdsToDelete;
    }

    // ---------------- DELETE BY OWNER ----------------
    deleteByOwnerId: (ownerId) => {
        const ownerMap = filesByOwner.get(ownerId);
        if (!ownerMap) return [];

        return Array.from(ownerMap.keys())
            .flatMap(fid => filesStore.delete(fid));
    }
};

export { FileItem, filesStore };
