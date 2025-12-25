const { User } = require('../models/User.js');
const { EmailValidator } = require('../models/EmailValidator.js');
const { usersStore } = require('../models/usersStore.js');
const { filesStore } = require('../models/filesStore.js');
const { permissionStore } = require('../models/permissionStore.js');
const { generateId } = require('../utils/idGenerator.js');

// Business logic layer for user management
// Handles complex validations, authentication, file and permission relationships
class UserService {
    
    // Create new user
    async createUser({ username, password, displayName, profileImage = null }) {
        // Basic validation
        const validationError = User.validate({ username, password, displayName, profileImage });
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
        const newUser = await usersStore.create(userId, normalizedEmail, password, displayName, profileImage);

        // Return without password
        const { password: _, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }

    // Authenticate user (login)
    async authenticate(username, password) {
        // Normalize email for lookup
        const emailResult = EmailValidator.validate(username);
        if (!emailResult.valid) {
            throw new Error("Invalid username or password");
        }
        const normalizedEmail = emailResult.normalizedEmail;
        
        const user = await usersStore.getByUsername(normalizedEmail);
        
        if (!user) {
            throw new Error("Invalid username or password");
        }

        // Future: use bcrypt here
        // const isValid = await bcrypt.compare(password, user.password);
        const isValid = user.password === password;

        if (!isValid) {
            throw new Error("Invalid username or password");
        }

        // Return without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Get user by ID
    async getUserById(userId) {
        const user = await usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Return without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Get user by username
    async getUserByUsername(username) {
        const user = await usersStore.getByUsername(username);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Return without password
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    // Get all users
    async getAllUsers() {
        const users = usersStore.getAll();
        
        // Return without passwords
        return users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
    }

    // Update user details
    async updateUser(userId, updates) {
        const user = usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Validate updates
        if (updates.username || updates.password || updates.displayName || updates.profileImage !== undefined) {
            const validationData = {
                username: updates.username || user.username,
                password: updates.password || user.password,
                displayName: updates.displayName || user.displayName,
                profileImage: updates.profileImage !== undefined ? updates.profileImage : user.profileImage
            };
            
            const validationError = User.validate(validationData);
            if (validationError) {
                throw new Error(validationError);
            }
        }

        // Check username uniqueness if changing
        if (updates.username && updates.username !== user.username) {
            if (usersStore.exists(updates.username)) {
                throw new Error("Username already exists");
            }
        }

        // Execute update
        const updatedUser = usersStore.update(userId, updates);

        // Return without password
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }

    // Change password
    async changePassword(userId, oldPassword, newPassword) {
        const user = usersStore.getById(userId);
        
        if (!user) {
            throw new Error("User not found");
        }

        // Verify old password
        if (user.password !== oldPassword) {
            throw new Error("Current password is incorrect");
        }

        // Validate new password
        if (!newPassword || newPassword.length < 4) {
            throw new Error("Password must be at least 4 characters");
        }

        // Update password
        usersStore.update(userId, { password: newPassword });

        return { success: true, message: "Password changed successfully" };
    }

    // Delete user - including all files and permissions
    async deleteUser(userId, requestingUserId) {
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
    async userExists(username) {
        return usersStore.exists(username);
    }
}

// Create singleton instance
const userService = new UserService();

module.exports = { UserService, userService };