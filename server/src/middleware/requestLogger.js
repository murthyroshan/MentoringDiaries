const logger = require('../utils/logger');

function requestLogger(req, res, next) {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;

        logger.info({
            requestId: req.requestId,
            method: req.method,
            endpoint: req.originalUrl || req.url,
            userId: req.user?._id ? String(req.user._id) : null,
            userRole: req.user?.role || null,
            statusCode: res.statusCode,
            durationMs: Math.round(durationMs * 100) / 100,
        }, 'request completed');
    });

    next();
}

module.exports = requestLogger;
