const crypto = require('crypto');

/**
 * Central ID generation utility
 * Can be easily modified to use different ID generation strategies
 */

// Generate unique ID for entities
function generateId() {
    return crypto.randomUUID();
}

module.exports = { generateId };
