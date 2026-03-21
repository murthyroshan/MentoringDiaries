const crypto = require('crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE = 'csrf-token';

/**
 * Double-submit cookie CSRF protection.
 *
 * Flow:
 *  1. Any request that doesn't already have the cookie gets one set (non-httpOnly
 *     so the browser JS can read it).
 *  2. For mutating methods (POST/PUT/PATCH/DELETE) the middleware verifies that the
 *     `X-CSRF-Token` request header matches the cookie value.
 *
 * This defeats CSRF because an attacker's cross-origin page can send the auth
 * cookie automatically, but cannot read the csrf-token cookie value to include
 * in the header (same-origin policy blocks it).
 */
function csrfMiddleware(req, res, next) {
    // Skip CSRF checks in test environment so Supertest suites don't need to
    // fetch and replay the token on every mutating request.
    if (process.env.NODE_ENV === 'test') return next();

    let token = req.cookies?.[CSRF_COOKIE];

    if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        res.cookie(CSRF_COOKIE, token, {
            httpOnly: false, // must be JS-readable for the client to copy into the header
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
    }

    if (SAFE_METHODS.has(req.method)) return next();

    const headerToken = req.headers['x-csrf-token'];
    if (!headerToken || headerToken !== token) {
        return res.status(403).json({ success: false, message: 'CSRF token missing or invalid.' });
    }

    next();
}

module.exports = csrfMiddleware;
