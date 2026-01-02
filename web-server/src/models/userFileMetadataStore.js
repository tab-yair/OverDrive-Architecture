const { UserFileMetadata } = require('./UserFileMetadata.js');

// In-memory storage for user-specific file metadata
// Key: "userId:fileId" -> UserFileMetadata

const metadataByKey = new Map();
const metadataByUser = new Map();
const metadataByFile = new Map();

const userFileMetadataStore = {
    /**
     * Get or create metadata for user+file combination
     */
    async getOrCreate(userId, fileId) {
        const key = `${userId}:${fileId}`;
        
        if (!metadataByKey.has(key)) {
            const metadata = new UserFileMetadata(userId, fileId);
            metadataByKey.set(key, metadata);
            
            // Index by user
            if (!metadataByUser.has(userId)) {
                metadataByUser.set(userId, new Map());
            }
            metadataByUser.get(userId).set(fileId, metadata);
            
            // Index by file
            if (!metadataByFile.has(fileId)) {
                metadataByFile.set(fileId, new Map());
            }
            metadataByFile.get(fileId).set(userId, metadata);
        }
        
        return { ...metadataByKey.get(key) };
    },

    /**
     * Get metadata for user+file (returns null if doesn't exist)
     */
    async get(userId, fileId) {
        const key = `${userId}:${fileId}`;
        const metadata = metadataByKey.get(key);
        return metadata ? { ...metadata } : null;
    },

    /**
     * Record a view interaction
     */
    async recordView(userId, fileId) {
        const key = `${userId}:${fileId}`;
        let metadata = metadataByKey.get(key);
        
        if (!metadata) {
            const created = await this.getOrCreate(userId, fileId);
            metadata = metadataByKey.get(key);
        }
        
        metadata.recordView();
        return { ...metadata };
    },

    /**
     * Record an edit interaction
     */
    async recordEdit(userId, fileId) {
        const key = `${userId}:${fileId}`;
        let metadata = metadataByKey.get(key);
        
        if (!metadata) {
            const created = await this.getOrCreate(userId, fileId);
            metadata = metadataByKey.get(key);
        }
        
        metadata.recordEdit();
        return { ...metadata };
    },

    /**
     * Toggle starred status
     */
    async toggleStar(userId, fileId) {
        const key = `${userId}:${fileId}`;
        let metadata = metadataByKey.get(key);
        
        if (!metadata) {
            const created = await this.getOrCreate(userId, fileId);
            metadata = metadataByKey.get(key);
        }
        
        metadata.toggleStar();
        return { ...metadata };
    },

    /**
     * Get all starred files for a user
     */
    async getStarredByUser(userId) {
        const userMetadata = metadataByUser.get(userId);
        if (!userMetadata) return [];
        
        return Array.from(userMetadata.values())
            .filter(m => m.isStarred)
            .map(m => ({ ...m }));
    },

    /**
     * Get recently accessed files for a user (sorted by last interaction)
     */
    async getRecentByUser(userId, limit = 20) {
        const userMetadata = metadataByUser.get(userId);
        if (!userMetadata) return [];
        
        return Array.from(userMetadata.values())
            .filter(m => m.lastViewedAt || m.lastEditedAt)
            .sort((a, b) => {
                const aTime = Math.max(
                    new Date(a.lastViewedAt || 0).getTime(),
                    new Date(a.lastEditedAt || 0).getTime()
                );
                const bTime = Math.max(
                    new Date(b.lastViewedAt || 0).getTime(),
                    new Date(b.lastEditedAt || 0).getTime()
                );
                return bTime - aTime; // Descending
            })
            .slice(0, limit)
            .map(m => ({ ...m }));
    },

    /**
     * Delete all metadata for a file (when file is deleted)
     */
    async deleteByFileId(fileId) {
        const fileMetadata = metadataByFile.get(fileId);
        if (!fileMetadata) return 0;
        
        let count = 0;
        for (const [userId, metadata] of fileMetadata.entries()) {
            const key = `${userId}:${fileId}`;
            metadataByKey.delete(key);
            
            const userMap = metadataByUser.get(userId);
            if (userMap) {
                userMap.delete(fileId);
                if (userMap.size === 0) {
                    metadataByUser.delete(userId);
                }
            }
            count++;
        }
        
        metadataByFile.delete(fileId);
        return count;
    },

    /**
     * Delete all metadata for a user (when user is deleted)
     */
    async deleteByUserId(userId) {
        const userMetadata = metadataByUser.get(userId);
        if (!userMetadata) return 0;
        
        let count = 0;
        for (const [fileId, metadata] of userMetadata.entries()) {
            const key = `${userId}:${fileId}`;
            metadataByKey.delete(key);
            
            const fileMap = metadataByFile.get(fileId);
            if (fileMap) {
                fileMap.delete(userId);
                if (fileMap.size === 0) {
                    metadataByFile.delete(fileId);
                }
            }
            count++;
        }
        
        metadataByUser.delete(userId);
        return count;
    }
};

module.exports = { userFileMetadataStore };
