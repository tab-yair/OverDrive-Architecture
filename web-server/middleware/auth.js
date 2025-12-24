/**
 * Authentication middleware
 * Validates user-id header for protected routes
 */

const requireAuth = (req, res, next) => {
    const userId = req.headers['user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'User ID required in header' });
    }

    // Attach userId to request for use in controllers
    req.userId = userId;
    next();
};

module.exports = {
    requireAuth
};
