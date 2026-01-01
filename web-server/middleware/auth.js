/**
 * Authentication middleware
 * Validates JWT token for protected routes
 */

const { authStore } = require('../models/authStore.js');

const requireAuth = async (req, res, next) => {
    // Get token from Authorization header (Bearer token)
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please provide a valid JWT token' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Verify and decode token
        const decoded = authStore.verifyToken(token);

        // Attach userId to request for use in controllers
        req.userId = decoded.userId;
        req.user = decoded; // Attach full decoded token data

        next();
    } catch (error) {
        return res.status(401).json({ error: error.message || 'Invalid or expired token' });
    }
};

module.exports = {
    requireAuth
};
