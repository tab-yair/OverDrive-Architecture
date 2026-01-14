const { userService } = require('../services/userService');
const { preferenceService } = require('../services/preferenceService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/users
 * Register a new user
 */
const createUser = asyncHandler(async (req, res) => {
    const { username, password, firstName, lastName, profileImage, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['username', 'password', 'firstName', 'lastName', 'profileImage'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        const error = new Error(`Invalid fields: ${invalidFields.join(', ')}. Only username, password, firstName, lastName, and profileImage are allowed`);
        error.status = 400;
        throw error;
    }

    // Validate required fields
    if (!username || !password || !firstName || !profileImage) {
        const error = new Error('Username, password, firstName, and profileImage are required');
        error.status = 400;
        throw error;
    }

    // Normalize optional fields: set to null if not provided
    const normalizedLastName = lastName !== undefined ? lastName : null;

    // Call service to create user
    const user = await userService.createUser({ 
        username, 
        password, 
        firstName, 
        lastName: normalizedLastName, 
        profileImage 
    });

    // Automatically create default preferences for the new user
    await preferenceService.createDefaultPreference(user.id);

    // Return 201 Created with user (without password for security)
    res.status(201)
       .location(`/api/users/${user.id}`)
       .json(user);
});

/**
 * GET /api/users/search
 * Search user by email and return user ID
 * Used for Share functionality to resolve email to UUID
 */
const searchUserByEmail = asyncHandler(async (req, res) => {
    const { email } = req.query;

    if (!email) {
        const error = new Error('Email parameter is required');
        error.status = 400;
        throw error;
    }

    try {
        // Call service to get user by email/username
        const user = await userService.getUserByUsername({ username: email });

        // Return limited user info for sharing
        res.status(200).json({
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.profileImage
        });
    } catch (error) {
        // User not found
        if (error.message === 'User not found') {
            const notFoundError = new Error('User not found');
            notFoundError.status = 404;
            throw notFoundError;
        }
        throw error;
    }
});

/**
 * GET /api/users/:id
 * Get user profile information
 * - Owner: Full profile (id, username, firstName, lastName, profileImage, storageUsed, createdAt, modifiedAt)
 * - Non-owner: Limited profile (id, firstName, lastName, username, profileImage)
 */
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.userId; // Set by requireAuth middleware

    // Call service to get user
    const user = await userService.getUserById({ userId: id });

    // If requester is the owner, return full profile
    if (id === requestingUserId) {
        res.status(200).json(user);
        return;
    }

    // If requester is not the owner, return limited profile
    const limitedProfile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        profileImage: user.profileImage
    };

    res.status(200).json(limitedProfile);
});

/**
 * PATCH /api/users/:id
 * Update user profile information
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.userId; // Set by requireAuth middleware

    // Users can only update their own profile
    if (id !== requestingUserId) {
        const error = new Error('Access denied');
        error.status = 403;
        throw error;
    }

    const { password, firstName, lastName, profileImage, ...extraFields } = req.body;

    // Check for unexpected fields (username cannot be updated)
    const allowedFields = ['password', 'firstName', 'lastName', 'profileImage'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        const error = new Error(`Invalid fields: ${invalidFields.join(', ')}. Only password, firstName, lastName, and profileImage can be updated`);
        error.status = 400;
        throw error;
    }

    // At least one field must be provided
    if (password === undefined && firstName === undefined && lastName === undefined && profileImage === undefined) {
        const error = new Error('At least one field (password, firstName, lastName, profileImage) must be provided');
        error.status = 400;
        throw error;
    }

    // Build updates object with only provided fields
    const updates = {};
    if (password !== undefined) updates.password = password;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    // Call service to update user
    await userService.updateUser({ userId: id, updates });

    // Return 204 No Content
    res.status(204).end();
});

module.exports = {
    createUser,
    searchUserByEmail,
    getUserById,
    updateUser
};
