const crypto = require('crypto');

// Accept UUIDs (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx) or hex strings up to 64 chars.
// Anything else gets replaced with a server-generated value to prevent log injection.
const SAFE_ID_RE = /^[0-9a-f-]{8,36}$/i;

function requestId(req, res, next) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && SAFE_ID_RE.test(incoming.trim())
        ? incoming.trim()
        : crypto.randomBytes(8).toString('hex');

    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
}

module.exports = requestId;
