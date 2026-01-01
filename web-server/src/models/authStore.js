const jwt = require('jsonwebtoken');

// In-memory token blacklist for logout functionality
// In production, use Redis or database
const tokenBlacklist = new Set();

const authStore = {
    /**
     * Generate JWT token for user
     * @param {Object} payload - User data to encode in token
     * @returns {string} JWT token
     */
    generateToken(payload) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured in environment');
        }

        const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
        
        return jwt.sign(payload, secret, { expiresIn });
    },

    /**
     * Verify and decode JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} Decoded payload
     * @throws {Error} If token is invalid or blacklisted
     */
    verifyToken(token) {
        // Check if token is blacklisted
        if (tokenBlacklist.has(token)) {
            throw new Error('Token has been revoked');
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET not configured in environment');
        }

        try {
            return jwt.verify(token, secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid token');
            }
            throw error;
        }
    },

    /**
     * Revoke a token (add to blacklist)
     * @param {string} token - Token to revoke
     */
    revokeToken(token) {
        tokenBlacklist.add(token);
    },

    /**
     * Check if token is blacklisted
     * @param {string} token - Token to check
     * @returns {boolean}
     */
    isRevoked(token) {
        return tokenBlacklist.has(token);
    },

    /**
     * Clear expired tokens from blacklist (cleanup utility)
     * Note: This is a simple implementation. In production, use a more sophisticated approach
     */
    cleanupBlacklist() {
        // Simple size-based cleanup
        if (tokenBlacklist.size > 10000) {
            tokenBlacklist.clear();
        }
    }
};

module.exports = { authStore };
