const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let details = null;

    logger.error({
        requestId: req.requestId,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        userId: req.user?.id != null ? String(req.user.id) : null,
        userRole: req.user?.role || null,
        errorName: err.name,
        errorMessage: err.message,
    }, 'request failed');

    if (err.name === 'CastError') {
        message = 'Resource not found (invalid ID format).';
        return res.status(404).json({ success: false, message, requestId: req.requestId });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
        return res.status(409).json({ success: false, message, requestId: req.requestId });
    }

    // better-sqlite3 constraint violations (e.g. UNIQUE email, FK) — return 409
    // with a generic message instead of a 500 that leaks the raw SQL.
    if (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({
            success: false,
            message: 'That record already exists or violates a data constraint.',
            requestId: req.requestId,
        });
    }

    if (err.name === 'ValidationError') {
        message = 'Validation failed';
        details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        return res.status(400).json({ success: false, message, details, requestId: req.requestId });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB.',
            requestId: req.requestId,
        });
    }

    if (err.name === 'MulterError') {
        return res.status(400).json({ success: false, message: err.message, requestId: req.requestId });
    }

    // Never leak raw internal error text (SQLite messages, filesystem paths,
    // upstream API errors) to clients on 5xx. Explicit client errors (4xx set
    // via err.statusCode) may keep their curated message.
    const isServerError = statusCode >= 500;
    const clientMessage = isServerError ? 'Internal server error' : message;

    return res.status(statusCode).json({
        success: false,
        message: clientMessage,
        requestId: req.requestId,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
