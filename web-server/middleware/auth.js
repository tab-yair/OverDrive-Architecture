/**
 * Authentication middleware
 * Validates user-id header for protected routes
 */

const { usersStore } = require('../models/usersStore.js');

const requireAuth = async (req, res, next) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required in header' });
    }

    // Validate user exists in database
    const user = await usersStore.getById(userId);
    if (!user) {
        return res.status(401).json({ error: 'Invalid user ID' });
    }

    // Attach userId to request for use in controllers
    req.userId = userId;
    next();
};

module.exports = {
    requireAuth
};
