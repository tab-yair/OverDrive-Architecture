// File or folder representation in the system
class FileItem {
    constructor(id, name, type, ownerId, parentId = null, size = 0) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.ownerId = ownerId;
        this.parentId = parentId;
        this.size = size;
        const now = new Date().toISOString(); 
        this.createdAt = now;
        this.modifiedAt = now;
    }

    // Basic file data validation
    static validate(data) {
        if (!data.name || data.name.trim().length === 0) {
            return "File name is required";
        }
        if (!['file', 'folder'].includes(data.type)) {
            return "Type must be 'file' or 'folder'";
        }
        if (!data.ownerId) {
            return "Owner ID is required";
        }
        return null;
    }
    
    // Convert from HTTP request body - sanitize and clean
    static fromRequest(body, ownerId) {
        return {
            name: body.name?.trim(),
            type: body.type,
            ownerId: ownerId,
            parentId: body.parentId || null,
            size: body.size || 0
        };
    }
}

export { FileItem };
