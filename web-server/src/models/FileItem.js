// File or folder representation in the system
class FileItem {
    constructor(id, name, type, ownerId, parentId = null, size = 0, isTrashed = false) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.ownerId = ownerId;
        this.parentId = parentId;
        this.size = size;
        this.isTrashed = isTrashed; // Owner's trash flag - affects all users
        const now = new Date().toISOString(); 
        this.createdAt = now;
        this.modifiedAt = now;
    }

    // Basic file data validation
    static validate(data) {
        if (!data.name || data.name.trim().length === 0) {
            return "File name is required";
        }
        if (!['folder', 'docs', 'pdf', 'image'].includes(data.type)) {
            return "Type must be 'folder', 'docs', 'pdf', or 'image'";
        }
        if (!data.ownerId) {
            return "Owner ID is required";
        }
        return null;
    }
}

module.exports = { FileItem };
