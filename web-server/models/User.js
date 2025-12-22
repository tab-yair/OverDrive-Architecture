import { EmailValidator } from './EmailValidator.js';

class User {
    constructor(id, username, password, displayName, profileImage) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.displayName = displayName;
        this.profileImage = profileImage;
        this.createdAt = new Date();
    }
    
    // Basic user data validation
    static validate(data) {
        // Validate email format for username using EmailValidator
        const emailResult = EmailValidator.validate(data.username);
        if (!emailResult.valid) {
            return `Invalid email: ${emailResult.reason}`;
        }
        if (!data.password || data.password.length < 4) {
            return "Password must be at least 4 characters";
        }
        if (!data.displayName) {
            return "Display name is required";
        }
        if (data.profileImage && !data.profileImage.startsWith('data:image/')) {
            return "Invalid image format. Must be Base64 image string";
        }
        if (data.profileImage && data.profileImage.length > 2 * 1024 * 1024) {
            return "Profile image exceeds size limit of 2MB";
        }
        return null;
    }

    // Convert user to safe object without password
    static toSafeObject(user) {
        if (!user) return null;
        const { password, ...safeUser } = user;
        return Object.freeze(safeUser); // now immutable
    }
}

export { User };
