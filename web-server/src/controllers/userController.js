const { userService } = require('../services/userService');
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

    // Validate required fields (lastName and profileImage are optional)
    if (!username || !password || !firstName) {
        const error = new Error('Username, password, and firstName are required');
        error.status = 400;
        throw error;
    }

    // Call service to create user (lastName and profileImage default to null if not provided)
    const user = await userService.createUser({ username, password, firstName, lastName, profileImage });

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
