const { User } = require('../models/User.js');
const { EmailValidator } = require('../models/EmailValidator.js');
const { usersStore } = require('../models/usersStore.js');
const { authStore } = require('../models/authStore.js');
const { filesStore } = require('../models/filesStore.js');
const { permissionStore } = require('../models/permissionStore.js');
const { generateId } = require('../utils/idGenerator.js');

// Business logic layer for user management
// Handles complex validations, authentication, file and permission relationships
class UserService {
    
    // Create new user
    async createUser({ username, password, firstName, lastName = null, profileImage = null }) {
        // Basic validation
        const validationError = User.validate({ username, password, firstName, lastName, profileImage });
        if (validationError) {
            throw new Error(validationError);
        }

        // Get normalized email for storage
        const emailResult = EmailValidator.validate(username);
        const normalizedEmail = emailResult.normalizedEmail;

        // Check username uniqueness (using normalized email)
        if (await usersStore.exists(normalizedEmail)) {
            throw new Error("Username already exists");
        }

        // Create user
        const userId = generateId();
        
        // Future: add password hashing here
        // const hashedPassword = await bcrypt.hash(password, 10);
        
        // Store normalized email in DB
        const newUser = await usersStore.create(userId, normalizedEmail, password, firstName, lastName, profileImage);

        // Return without password
        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    // Authenticate user (login)
    async authenticate({ username, password }) {
        // Normalize email for lookup
        const emailResult = EmailValidator.validate(username);
        if (!emailResult.valid) {
            const error = new Error("Invalid username or password");
            error.status = 401;
            throw error;
        }
        const normalizedEmail = emailResult.normalizedEmail;

        const user = await usersStore.getByUsernameWithPassword(normalizedEmail);
        
        if (!user) {
            const error = new Error("Invalid username or password");
            error.status = 401;
            throw error;
        }

        // Future: use bcrypt here
        // const isValid = await bcrypt.compare(password, user.password);
        const isValid = user.password === password;

        if (!isValid) {
            const error = new Error("Invalid username or password");
            error.status = 401;
            throw error;
        }

        // Return user with password
        return user;
    }

    // Get user by ID
    async getUserById({ userId }) {
        const user = await usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Return user without password (safe object)
        return user;
    }

    // Get user by username
    async getUserByUsername({ username }) {
        const user = await usersStore.getByUsername(username);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Return user without password (safe object)
        return user;
    }
    // Get all users
    async getAllUsers() {
        const users = await usersStore.getAll();
        
        // Return users without passwords (safe objects)
        return users;
    }

    // Update user details
    async updateUser({ userId, updates }) {
        const user = await usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Validate individual fields if provided
        if (updates.password !== undefined && updates.password.length < 8) {
            throw new Error("Password must be at least 8 characters");
        }

        if (updates.firstName !== undefined && !updates.firstName) {
            throw new Error("First name cannot be empty");
        }

        // Validate profileImage if provided (null is allowed to remove it)
        if (updates.profileImage !== undefined && updates.profileImage !== null) {
            // Allow both data:image/ Base64 strings and https:// URLs
            const isBase64 = updates.profileImage.startsWith('data:image/');
            const isUrl = updates.profileImage.startsWith('https://') || updates.profileImage.startsWith('http://');
            
            if (!isBase64 && !isUrl) {
                throw new Error("Invalid image format. Must be Base64 image string or URL");
            }
            if (updates.profileImage.length > 2 * 1024 * 1024) {
                throw new Error("Profile image exceeds size limit of 2MB");
            }
        }

        // Check username uniqueness if changing
        if (updates.username && updates.username !== user.username) {
            if (await usersStore.exists(updates.username)) {
                throw new Error("Username already exists");
            }
        }

        // Execute update
        const updatedUser = await usersStore.update(userId, updates);

        // Return user without password (safe object)
        return updatedUser;
    }

    // Change password
    async changePassword({ userId, oldPassword, newPassword }) {
        // Need to get user WITH password for verification
        const user = await usersStore.getByUsernameWithPassword(
            (await usersStore.getById(userId))?.username
        );
        
        if (!user) {
            throw new Error("User not found");
        }

        // Verify old password
        if (user.password !== oldPassword) {
            throw new Error("Current password is incorrect");
        }

        // Validate new password
        if (!newPassword || newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters");
        }

        // Update password
        await usersStore.update(userId, { password: newPassword });

        return { success: true, message: "Password changed successfully" };
    }

    // Delete user - including all files and permissions
    async deleteUser({ userId, requestingUserId }) {
        const user = await usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Check deletion permission (only own account or admin)
        if (userId !== requestingUserId) {
            throw new Error("Permission denied: You can only delete your own account");
        }

        try {
            // 1. Delete all user files - filesStore.deleteByOwnerId handles recursion and permissions
            const deletedFileIds = await filesStore.deleteByOwnerId(userId);

            // 2. Delete permissions user received on others' files
            await permissionStore.deleteAllForUser(userId);

            // 3. Delete user itself
            await usersStore.delete(userId);

            return {
                success: true,
                message: "User deleted successfully",
                deletedFilesCount: deletedFileIds.length
            };
        } catch (error) {
            throw new Error(`Failed to delete user: ${error.message}`);
        }
    }

    // Check if user exists
    async userExists({ username }) {
        return await usersStore.exists(username);
    }
}

// Create singleton instance
const userService = new UserService();

module.exports = { UserService, userService };