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
const attendanceRoutes = require('./routes/attendance');
const marksRoutes = require('./routes/marks');
const achievementsRoutes = require('./routes/achievements');
const sessionRoutes = require('./routes/sessions');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');
const requestLogger = require('./middleware/requestLogger');
const responseEnvelope = require('./middleware/responseEnvelope');
const queryGuard = require('./middleware/queryGuard');
const csrf = require('./middleware/csrf');
const auth = require('./middleware/auth');
const queries = require('./database/queries');
const db = require('./database/db');

const app = express();

app.set('trust proxy', 1);
app.use(requestId);
app.use(responseEnvelope);

const isProd = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    contentSecurityPolicy: isProd ? {
        directives: {
            defaultSrc:     ["'self'"],
            scriptSrc:      ["'self'"],
            styleSrc:       ["'self'", "'unsafe-inline'"],
            imgSrc:         ["'self'", 'data:', 'https:'],
            connectSrc:     ["'self'", ...allowedOrigins],
            fontSrc:        ["'self'"],
            objectSrc:      ["'none'"],
            frameSrc:       ["'none'"],
            upgradeInsecureRequests: [],
        },
    } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(compression({
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    },
}));

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

const isTest = process.env.NODE_ENV === 'test';

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 10000 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(mongoSanitize({ allowDots: false, replaceWith: '_' }));
app.use(xssClean());
app.use(queryGuard);

app.use(requestLogger);
app.use('/api', csrf);

app.get('/api/health', (req, res) => {
    let dbOk = false;
    try {
        db.prepare('SELECT 1').get();
        dbOk = true;
    } catch { }
    res.status(dbOk ? 200 : 503).json({
        status:    dbOk ? 'ok' : 'degraded',
        uptime:    process.uptime(),
        timestamp: new Date(),
        db:        dbOk ? 'connected' : 'error',
    });
});

// Protected file endpoint
app.get('/uploads/:filename', auth, (req, res, next) => {
    try {
        const { filename } = req.params;
        if (/[/\\]|\.\./.test(filename)) return res.status(400).end();

        const entry = db.prepare('SELECT student_id FROM diary_entries WHERE attachment_url = ?')
            .get(`/uploads/${filename}`);
        if (!entry) return res.status(404).end();

        const uid = req.user.id;
        const student = queries.findUserById(entry.student_id);
        const canAccess =
            entry.student_id === uid ||
            (student && student.mentor_id === uid) ||
            req.user.role === 'admin';
        if (!canAccess) return res.status(403).end();

        res.sendFile(path.join(__dirname, '../uploads', filename));
    } catch (err) {
        next(err);
    }
});

app.use('/api/auth',          authRoutes);
app.use('/api/diary',         diaryRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/attendance',    attendanceRoutes);
app.use('/api/marks',         marksRoutes);
app.use('/api/achievements',  achievementsRoutes);
app.use('/api/sessions',      sessionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',        adminRoutes);

if (isProd) {
    const clientBuildPath = path.resolve(__dirname, '../public');
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    app.use('*', (req, res) => {
        res.status(404).json({ success: false, message: 'Route not found' });
    });
}

app.use(errorHandler);

module.exports = app;
