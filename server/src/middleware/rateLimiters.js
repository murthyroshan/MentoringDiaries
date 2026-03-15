const rateLimit = require('express-rate-limit');

// In development increase the limit to avoid lockouts from hot reloads / silentRefresh
const isDev = process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.NODE_ENV === 'development' ? 100 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many auth requests. Please try again in 1 minute.' },
});

module.exports = { authLimiter };
