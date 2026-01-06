// Preference Store
// In-memory storage for user preferences with 1:1 relationship to users

class PreferenceStore {
    constructor() {
        this.preferences = new Map(); // key: userId, value: { userId, theme, landingPage }
    }

    // Create new preference for a user
    create(userId, preferenceData) {
        if (this.preferences.has(userId)) {
            throw new Error('Preference already exists for this user');
        }

        const preference = {
            userId,
            theme: preferenceData.theme || 'light',
            landingPage: preferenceData.landingPage || 'home'
        };

        this.preferences.set(userId, preference);
        return preference;
    }

    // Get preference by userId
    getByUserId(userId) {
        return this.preferences.get(userId) || null;
    }

    // Update existing preference
    update(userId, updates) {
        const preference = this.preferences.get(userId);
        
        if (!preference) {
            throw new Error('Preference not found');
        }

        // Apply updates
        if (updates.theme !== undefined) {
            preference.theme = updates.theme;
        }
        if (updates.landingPage !== undefined) {
            preference.landingPage = updates.landingPage;
        }

        this.preferences.set(userId, preference);
        return preference;
    }

    // Delete preference (for user deletion)
    delete(userId) {
        return this.preferences.delete(userId);
    }

    // Clear all preferences (for testing)
    clear() {
        this.preferences.clear();
    }

    // Get all preferences (for debugging)
    getAll() {
        return Array.from(this.preferences.values());
    }
}

// Singleton instance
const preferenceStore = new PreferenceStore();

module.exports = { preferenceStore, PreferenceStore };
