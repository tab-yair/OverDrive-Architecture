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

    // 400 Bad Request
    if (message.includes('required') || message.includes('invalid') || message.includes('must be')) {
        return 400;
    }

    // 401 Unauthorized
    if (message.includes('unauthorized') || message.includes('invalid username or password')) {
        return 401;
    }

    // 403 Forbidden
    if (message.includes('permission denied') || message.includes('cannot remove owner')) {
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
    const status = getStatusFromError(err);

    // Log error for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
        console.error(`[${status}] ${err.message}`);
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
