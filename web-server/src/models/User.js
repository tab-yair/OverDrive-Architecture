const { EmailValidator } = require('./EmailValidator.js');

class User {
    constructor(id, username, password, firstName, lastName = null, profileImage, preferences = null) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.profileImage = profileImage;
        this.storageUsed = 0; // Storage used in bytes
        const now = new Date().toISOString();
        this.createdAt = now;
        this.modifiedAt = now;
        this.preferences = preferences || { theme: 'system', startPage: 'home' };
    }
    
    // Basic user data validation
    static validate(data) {
        // Validate email format for username using EmailValidator
        const emailResult = EmailValidator.validate(data.username);
        if (!emailResult.valid) {
            return `Invalid email: ${emailResult.reason}`;
        }
        if (!data.password) {
            return "Password is required";
        }
        // Validate password strength: minimum 8 characters with at least one letter and one number
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        if (!passwordRegex.test(data.password)) {
            return "Password must contain both letters and numbers (minimum 8 characters)";
        }
        if (!data.firstName) {
            return "First name is required";
        }
        if (!data.profileImage) {
            return "Profile image is required";
        }
        if (!data.profileImage.startsWith('data:image/')) {
            return "Invalid image format. Must be Base64 image string";
        }
        if (data.profileImage.length > 2 * 1024 * 1024) {
            return "Profile image exceeds size limit of 2MB";
        }
        return null;
    }

    // Convert user to safe object without password
    static toSafeObject(user) {
        if (!user) return null;
        const { password, ...safeUser } = user;
        // Ensure preferences are included
        if (!safeUser.preferences) {
            safeUser.preferences = { theme: 'system', startPage: 'home' };
        }
        return Object.freeze(safeUser); // now immutable
    }
}

module.exports = { User };
