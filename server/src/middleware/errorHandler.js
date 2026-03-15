const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let details = null;

    logger.error({
        requestId: req.requestId,
        method: req.method,
        endpoint: req.originalUrl || req.url,
        userId: req.user?._id ? String(req.user._id) : null,
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

    return res.status(statusCode).json({
        success: false,
        message,
        requestId: req.requestId,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

module.exports = errorHandler;
