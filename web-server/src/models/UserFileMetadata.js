// User-specific metadata for files (starred, recently viewed, etc.)
class UserFileMetadata {
    constructor(userId, fileId, isStarred = false) {
        this.userId = userId;
        this.fileId = fileId;
        this.isStarred = isStarred;
        this.lastViewedAt = null;
        this.lastEditedAt = null;
        this.lastInteractionType = null; // 'VIEW' | 'EDIT'
        this.viewCount = 0;
        this.editCount = 0;
        this.createdAt = new Date().toISOString();
        this.modifiedAt = new Date().toISOString();
    }

    // Update interaction timestamp
    recordView() {
        this.lastViewedAt = new Date().toISOString();
        this.lastInteractionType = 'VIEW';
        this.viewCount++;
        this.modifiedAt = new Date().toISOString();
    }

    recordEdit() {
        this.lastEditedAt = new Date().toISOString();
        this.lastInteractionType = 'EDIT';
        this.editCount++;
        this.modifiedAt = new Date().toISOString();
    }

    toggleStar() {
        this.isStarred = !this.isStarred;
        this.modifiedAt = new Date().toISOString();
    }

    // Validation
    static validate(data) {
        if (!data.userId) return "User ID is required";
        if (!data.fileId) return "File ID is required";
        return null;
    }
}

module.exports = { UserFileMetadata };
