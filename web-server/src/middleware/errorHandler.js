/**
 * Centralized error handling middleware
 */

/**
 * Wraps async controller functions to catch errors
 * and pass them to the error handler middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Maps error messages to appropriate HTTP status codes
 */
const getStatusFromError = (error) => {
    const message = error.message.toLowerCase();

    // 401 Unauthorized - check BEFORE 400 since "invalid username or password" contains "invalid"
    if (message.includes('invalid username or password') || message.includes('unauthorized')) {
        return 401;
    }

    // 400 Bad Request
    if (message.includes('required') || 
        message.includes('invalid') || 
        message.includes('must be') ||
        message.includes('is not in trash') ||
        message.includes('cannot modify content') ||
        message.includes('before permanent deletion')) {
        return 400;
    }

    // 403 Forbidden
    if (message.includes('permission denied') || 
        message.includes('cannot remove owner') ||
        message.includes("don't have permission") ||
        message.includes('only editors and owners') ||
        message.includes('only the owner can')) {
        return 403;
    }

    // 404 Not Found
    if (message.includes('not found') || message.includes('does not exist')) {
        return 404;
    }

    // 409 Conflict
    if (message.includes('already exists') || message.includes('already has')) {
        return 409;
    }

    // Default to 500
    return 500;
};

/**
 * Global error handler middleware
 * Must be registered after all routes
 */
const errorHandler = (err, req, res, next) => {
    // Check if error is a structured error (JSON format)
    if (err.isStructuredError) {
        try {
            const errorData = JSON.parse(err.message);
            return res.status(403).json(errorData);
        } catch (parseError) {
            // If parsing fails, continue with normal error handling
        }
    }

    // Use explicit status if set on error, otherwise derive from message
    const status = err.status || getStatusFromError(err);

    // Log error for debugging
    console.error(`[${status}] ${err.message}`);
    if (err.stack) {
        console.error(err.stack);
    }

    // Don't expose internal error details in production
    const message = status === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(status).json({ error: message });
};

module.exports = {
    asyncHandler,
    errorHandler
};
