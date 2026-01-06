// Preference Controller
// HTTP handlers for preference endpoints

const { preferenceService } = require('../services/preferenceService');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * GET /api/users/:id/preference
 * Get user's preferences
 */
const getUserPreference = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const requestingUserId = req.userId; // Set by requireAuth middleware

    const preference = await preferenceService.getUserPreference({ 
        userId, 
        requestingUserId 
    });

    res.status(200).json(preference);
});

/**
 * PATCH /api/users/:id/preference
 * Update user's preferences (partial update)
 */
const updateUserPreference = asyncHandler(async (req, res) => {
    const { id: userId } = req.params;
    const requestingUserId = req.userId; // Set by requireAuth middleware
    const { theme, landingPage, ...extraFields } = req.body;

    // Check for unexpected fields
    const allowedFields = ['theme', 'landingPage'];
    const receivedFields = Object.keys(req.body);
    const invalidFields = receivedFields.filter(field => !allowedFields.includes(field));
    
    if (invalidFields.length > 0) {
        const error = new Error(`Invalid fields: ${invalidFields.join(', ')}. Only theme and landingPage can be updated`);
        error.status = 400;
        throw error;
    }

    // Build updates object (only include provided fields)
    const updates = {};
    if (theme !== undefined) updates.theme = theme;
    if (landingPage !== undefined) updates.landingPage = landingPage;

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
        const error = new Error('At least one field (theme or landingPage) must be provided');
        error.status = 400;
        throw error;
    }

    await preferenceService.updateUserPreference({ 
        userId, 
        updates, 
        requestingUserId 
    });

    // Return 204 No Content (standard for PATCH success)
    res.status(204).end();
});

module.exports = {
    getUserPreference,
    updateUserPreference
};
