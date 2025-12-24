const userService = require('../services/userService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/tokens
 * Authenticate user (login)
 * Returns user-id if successful (will change to JWT in Exercise 4)
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        const error = new Error('Username and password are required');
        error.status = 400;
        throw error;
    }

    // Call service to authenticate
    const user = await userService.authenticate(username, password);

    // Return user-id (temporary - will be token in Exercise 4)
    res.status(200).json({ 'user-id': user.id });
});

module.exports = {
    login
};
