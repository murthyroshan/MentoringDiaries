const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const queries = require('../database/queries');
const db = require('../database/db');

const VALID_SECTIONS = {
    CSE:  ['A', 'B', 'C', 'D'],
    AIML: ['A', 'B'],
    CS:   ['A', 'B'],
    DS:   ['A', 'B'],
};

function generateTokens(userId) {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    return { accessToken, refreshToken };
}

function setTokenCookies(res, accessToken, refreshToken) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
}

function safeUser(u) {
    if (!u) return null;
    const { password_hash, refresh_token, ...safe } = u;
    return safe;
}

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role, department, section, roll_number, batch } = req.body;

        // Email domain check
        const normEmail = (email || '').trim().toLowerCase();
        if (!normEmail.endsWith('@gcet.edu.in')) {
            return res.status(400).json({ success: false, message: 'Only @gcet.edu.in email addresses are allowed.' });
        }

        // Role whitelist
        const userRole = ['student', 'mentor', 'admin'].includes(role) ? role : 'student';

        if (userRole === 'student') {
            if (!department || !VALID_SECTIONS[department]) {
                return res.status(400).json({ success: false, message: `Department must be one of: ${Object.keys(VALID_SECTIONS).join(', ')}.` });
            }
            if (!section || !VALID_SECTIONS[department].includes(section)) {
                return res.status(400).json({ success: false, message: `Section must be one of: ${VALID_SECTIONS[department].join(', ')} for department ${department}.` });
            }
            const roll = Number(roll_number);
            if (!roll || roll < 1 || roll > 10 || !Number.isInteger(roll)) {
                return res.status(400).json({ success: false, message: 'Roll number must be an integer between 1 and 10.' });
            }
        }

        // Unique email check
        const existing = queries.findUserByEmail(normEmail);
        if (existing) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Password strength
        if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters, contain an uppercase letter and a number.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const stmt = db.prepare(`
            INSERT INTO users (email, password_hash, name, role, department, section, roll_number, batch, current_semester, is_active)
            VALUES (@email, @password_hash, @name, @role, @department, @section, @roll_number, @batch, @current_semester, 1)
        `);
        const result = stmt.run({
            email: normEmail,
            password_hash: passwordHash,
            name: (name || '').trim(),
            role: userRole,
            department: department || null,
            section: section || null,
            roll_number: userRole === 'student' ? Number(roll_number) : null,
            batch: batch || null,
            current_semester: userRole === 'student' ? 1 : null,
        });

        const userId = result.lastInsertRowid;
        const { accessToken, refreshToken } = generateTokens(userId);

        queries.updateUserRefreshToken(userId, refreshToken);
        queries.updateUserLastLogin(userId);
        setTokenCookies(res, accessToken, refreshToken);

        const user = queries.findUserById(userId);

        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: { user: safeUser(user) },
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normEmail = (email || '').trim().toLowerCase();

        const user = queries.findUserByEmailWithPassword(normEmail);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.is_active) {
            return res.status(401).json({ success: false, message: 'Account is deactivated.' });
        }

        const { accessToken, refreshToken } = generateTokens(user.id);
        queries.updateUserRefreshToken(user.id, refreshToken);
        queries.updateUserLastLogin(user.id);
        setTokenCookies(res, accessToken, refreshToken);

        return res.json({
            success: true,
            message: 'Login successful',
            data: { user: safeUser(queries.findUserById(user.id)) },
        });
    } catch (error) {
        next(error);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({ success: false, message: 'No refresh token.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
        }

        const user = db.prepare('SELECT id, refresh_token, is_active FROM users WHERE id = ?').get(decoded.id);
        if (!user || user.refresh_token !== token) {
            return res.status(401).json({ success: false, message: 'Refresh token mismatch.' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);
        queries.updateUserRefreshToken(user.id, newRefreshToken);
        setTokenCookies(res, accessToken, newRefreshToken);

        return res.json({ success: true, message: 'Token refreshed' });
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        if (req.user) {
            queries.updateUserRefreshToken(req.user.id, null);
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = queries.findUserById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Attach mentor info if student
        let mentorInfo = null;
        if (user.mentor_id) {
            mentorInfo = queries.findUserById(user.mentor_id);
        }

        return res.json({
            success: true,
            data: { user: { ...safeUser(user), mentor: mentorInfo ? safeUser(mentorInfo) : null } },
        });
    } catch (error) {
        next(error);
    }
};
