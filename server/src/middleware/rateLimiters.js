const rateLimit = require('express-rate-limit');

// In development increase the limit to avoid lockouts from hot reloads / silentRefresh
const isDev = process.env.NODE_ENV === 'development';

const relaxed = ['development', 'test'].includes(process.env.NODE_ENV);

// Login / register — deliberately strict to blunt credential stuffing.
const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: relaxed ? 10000 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth requests. Please try again in 1 minute.' },
});

// Token refresh gets its own, more generous budget. Silent-refresh traffic
// (multiple tabs, each 401→refresh) must not exhaust the login limiter and
// lock a legitimate user out of signing in.
const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: relaxed ? 10000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many refresh requests. Please try again shortly.' },
});

module.exports = { authLimiter, refreshLimiter };
