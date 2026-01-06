// Preference Service
// Business logic for user preferences

const Preference = require('../models/Preference');
const { preferenceStore } = require('./preferenceStore');
const { usersStore } = require('../models/usersStore.js');

class PreferenceService {
    
    // Create preference with defaults for a user
    async createDefaultPreference(userId) {
        // Verify user exists
        const user = await usersStore.getById(userId);
        if (!user) {
            throw new Error('User does not exist');
        }

        // Check if preference already exists
        const existing = await preferenceStore.getByUserId(userId);
        if (existing) {
            throw new Error('Preference already exists for this user');
        }

        // Create with defaults
        const defaults = Preference.getDefaults();
        const preference = preferenceStore.create(userId, defaults);
        
        return preference;
    }

    // Get user's preference
    async getUserPreference({ userId, requestingUserId }) {
        // User can only access their own preferences
        if (userId !== requestingUserId) {
            const error = new Error('Access denied');
            error.status = 403;
            throw error;
        }

        // Verify user exists
        const user = await usersStore.getById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        const preference = await preferenceStore.getByUserId(userId);
        
        if (!preference) {
            const error = new Error('Preference not found');
            error.status = 404;
            throw error;
        }

        return preference;
    }

    // Update user's preference
    async updateUserPreference({ userId, updates, requestingUserId }) {
        // User can only update their own preferences
        if (userId !== requestingUserId) {
            const error = new Error('Access denied');
            error.status = 403;
            throw error;
        }

        // Verify user exists
        const user = await usersStore.getById(userId);
        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        // Validate updates
        const validationError = Preference.validate(updates);
        if (validationError) {
            const error = new Error(validationError);
            error.status = 400;
            throw error;
        }

        // Check if preference exists
        const existing = await preferenceStore.getByUserId(userId);
        if (!existing) {
            const error = new Error('Preference not found');
            error.status = 404;
            throw error;
        }

        // Update preference
        const updatedPreference = preferenceStore.update(userId, updates);
        
        return updatedPreference;
    }
}

const preferenceService = new PreferenceService();

module.exports = { preferenceService, PreferenceService };
