const { userService } = require('../services/userService');
const { authStore } = require('../models/authStore');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * POST /api/tokens
 * Authenticate user (login)
 * Returns JWT token if successful
 */
const login = asyncHandler(async (req, res) => {
    const { username, password, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['username', 'password'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        const error = new Error(`Invalid fields: ${invalidFields.join(', ')}. Only username and password are allowed`);
        error.status = 400;
        throw error;
    }

    // Validate input
    if (!username || !password) {
        const error = new Error('Username and password are required');
        error.status = 400;
        throw error;
    }

    // Call service to authenticate
    const user = await userService.authenticate({ username, password });

    // Generate JWT token
    const token = authStore.generateToken({
        userId: user.id,
        username: user.username
    });

    // Return JWT token
    res.status(200).json({ token });
});

module.exports = {
    login
};
