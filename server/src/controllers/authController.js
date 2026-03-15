const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    return { accessToken, refreshToken };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
    });
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

exports.register = async (req, res, next) => {
    try {
        const { name, email, password, role, department, batch, rollNumber, year } = req.body;

        // SECURITY: Only student and mentor can self-register. Admins must be promoted by existing admin.
        const allowedRoles = ['student', 'mentor'];
        const userRole = allowedRoles.includes(role) ? role : 'student';

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        // Auto-calculate semester from year (odd semester default)
        const parsedYear = year ? Number(year) : null;
        const autoSemester = parsedYear ? (parsedYear - 1) * 2 + 1 : undefined;

        const user = await User.create({
            name,
            email,
            password,
            role: userRole,
            department,
            batch,
            rollNumber,
            year: parsedYear || undefined,
            semester: autoSemester,
            // ID card photo uploaded via multer (optional)
            idCardPhoto: req.file ? `/uploads/${req.file.filename}` : '',
        });

        const { accessToken, refreshToken } = generateTokens(user._id);

        // Save refresh token
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        setTokenCookies(res, accessToken, refreshToken);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                batch: user.batch,
                initials: user.initials,
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password +refreshToken');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (!user.isActive) {
            return res.status(401).json({ success: false, message: 'Account is deactivated.' });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        setTokenCookies(res, accessToken, refreshToken);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                batch: user.batch,
                rollNumber: user.rollNumber,
                assignedMentor: user.assignedMentor,
                initials: user.initials,
                lastLogin: user.lastLogin,
            },
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

        const user = await User.findById(decoded.id).select('+refreshToken');
        if (!user || user.refreshToken !== token) {
            return res.status(401).json({ success: false, message: 'Refresh token mismatch.' });
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        setTokenCookies(res, accessToken, newRefreshToken);

        res.json({ success: true, message: 'Token refreshed' });
    } catch (error) {
        next(error);
    }
};

exports.logout = async (req, res, next) => {
    try {
        if (req.user) {
            await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('assignedMentor', 'name email department')
            .populate('assignedStudents', 'name email department batch');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (error) {
        next(error);
    }
};
