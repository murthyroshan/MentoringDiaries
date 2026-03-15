const crypto = require('crypto');

function requestId(req, res, next) {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.trim()
        ? incoming.trim()
        : crypto.randomBytes(8).toString('hex');

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
}

module.exports = requestId;
