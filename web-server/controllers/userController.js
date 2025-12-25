const { userService } = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/users
 * Register a new user
 */
const createUser = asyncHandler(async (req, res) => {
    const { username, password, displayName, profileImage } = req.body;

    // Validate required fields
    if (!username || !password || !displayName) {
        const error = new Error('Username, password, and displayName are required');
        error.status = 400;
        throw error;
    }

    // Call service to create user
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

    // Call service to get user
    const user = await userService.getUserById(id);

    res.status(200).json(user);
});

module.exports = {
    createUser,
    getUserById
};
