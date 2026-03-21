const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

const authRoutes = require('./routes/auth');
const diaryRoutes = require('./routes/diary');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const academicRoutes = require('./routes/academic');
const eventRoutes = require('./routes/events');
const skillRoutes = require('./routes/skills');
const studentRoutes = require('./routes/student');
const sessionRoutes = require('./routes/sessions');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const responseEnvelope = require('./middleware/responseEnvelope');
const queryGuard = require('./middleware/queryGuard');
const csrf = require('./middleware/csrf');
const auth = require('./middleware/auth');
const DiaryEntry = require('./models/DiaryEntry');

const app = express();

// Trust reverse proxy (like Vite dev server) so rate limiters see the real client IP 
// instead of 127.0.0.1 for every request.
app.set('trust proxy', 1);

app.use(requestId);
app.use(responseEnvelope);

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
}));

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        const err = new Error('CORS blocked for this origin.');
        err.statusCode = 403;
        return callback(err);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
}));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize({
    allowDots: false,
    replaceWith: '_',
}));
app.use(xssClean());
app.use(queryGuard);

app.use(requestLogger);

// CSRF protection: sets csrf-token cookie on first request; validates
// X-CSRF-Token header on all mutating API requests.
app.use('/api', csrf);

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Mentoring Diaries API is running', timestamp: new Date() });
});

// Protected file endpoint — auth required; user must own the entry or be admin/mentor.
app.get('/uploads/:filename', auth, async (req, res, next) => {
    try {
        const { filename } = req.params;
        // Block path-traversal attempts before any filesystem access.
        if (/[/\\]|\.\./.test(filename)) return res.status(400).end();

        const entry = await DiaryEntry.findOne({ attachmentUrl: `/uploads/${filename}` })
            .select('student mentor');
        if (!entry) return res.status(404).end();

        const uid = req.user._id;
        const canAccess =
            entry.student?.equals(uid) ||
            entry.mentor?.equals(uid) ||
            req.user.role === 'admin';
        if (!canAccess) return res.status(403).end();

        res.sendFile(path.join(__dirname, '../uploads', filename));
    } catch (err) {
        next(err);
    }
});

app.use('/api/auth', authRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
