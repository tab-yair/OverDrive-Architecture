// Preference Model
// Represents user preferences with validation

class Preference {
    constructor({ userId, theme = 'light', landingPage = 'home' }) {
        // Validate userId
        if (!userId) {
            throw new Error('User ID is required for preference');
        }

        // Validate theme
        const validThemes = ['light', 'dark', 'system'];
        if (!validThemes.includes(theme)) {
            throw new Error(`Invalid theme: ${theme}. Must be one of: ${validThemes.join(', ')}`);
        }

        // Validate landingPage
        const validLandingPages = ['home', 'storage'];
        if (!validLandingPages.includes(landingPage)) {
            throw new Error(`Invalid landingPage: ${landingPage}. Must be one of: ${validLandingPages.join(', ')}`);
        }

        this.userId = userId;
        this.theme = theme;
        this.landingPage = landingPage;
    }

    // Static method for validation before creation/update
    static validate(data) {
        const { userId, theme, landingPage } = data;

        // Validate userId if provided
        if (userId !== undefined && !userId) {
            return 'User ID is required';
        }

        // Validate theme if provided
        if (theme !== undefined) {
            const validThemes = ['light', 'dark', 'system'];
            if (!validThemes.includes(theme)) {
                return `Invalid theme: ${theme}. Must be one of: ${validThemes.join(', ')}`;
            }
        }

        // Validate landingPage if provided
        if (landingPage !== undefined) {
            const validLandingPages = ['home', 'storage'];
            if (!validLandingPages.includes(landingPage)) {
                return `Invalid landingPage: ${landingPage}. Must be one of: ${validLandingPages.join(', ')}`;
            }
        }

        return null; // No errors
    }

    // Get default preferences
    static getDefaults() {
        return {
            theme: 'light',
            landingPage: 'home'
        };
    }
}

module.exports = Preference;
