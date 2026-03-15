const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Prefer httpOnly cookie, fall back to Authorization header
        const token =
            req.cookies?.accessToken ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.split(' ')[1]
                : null);

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // ─── Distinct error messages for different JWT failures ───
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired. Please log in again.',
                    code: 'TOKEN_EXPIRED',
                });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token.',
                    code: 'TOKEN_INVALID',
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Token verification failed.',
                code: 'TOKEN_ERROR',
            });
        }

        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = auth;
