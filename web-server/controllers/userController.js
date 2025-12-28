const { userService } = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/users
 * Register a new user
 */
const createUser = asyncHandler(async (req, res) => {
    const { username, password, displayName, profileImage } = req.body;

    // Validate required fields (profileImage is optional)
    if (!username || !password || !displayName) {
        const error = new Error('Username, password, and displayName are required');
        error.status = 400;
        throw error;
    }

    // Call service to create user (profileImage defaults to null if not provided)
    const user = await userService.createUser({ username, password, displayName, profileImage });

    // Return 201 Created with Location header (empty body per assignment spec)
    res.status(201)
       .location(`/api/users/${user.id}`)
       .end();
});

/**
 * GET /api/users/:id
 * Get user profile information
 */
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.userId; // Set by requireAuth middleware

    // Users can only access their own profile
    if (id !== requestingUserId) {
        const error = new Error('Access denied');
        error.status = 403;
        throw error;
    }

    // Call service to get user
    const user = await userService.getUserById(id);

    res.status(200).json(user);
});

module.exports = {
    createUser,
    getUserById
};
