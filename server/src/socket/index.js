const queries = require('../database/queries');
const db = require('../database/db');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;
const userSocketMap = {};

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        try { cookies[key] = decodeURIComponent(val); } catch { cookies[key] = val; }
    });
    return cookies;
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

function initSocket(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const cookies = parseCookies(socket.handshake.headers.cookie || '');
            const token = cookies.accessToken;
            if (!token) return next(new Error('Unauthorized: no access token'));

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch {
                return next(new Error('Unauthorized: invalid token'));
            }

            const user = queries.findUserById(decoded.id);
            if (!user || !user.is_active) return next(new Error('Unauthorized: user not found'));

            socket.userId = String(user.id);
            socket.userRole = user.role;
            socket.accessToken = token;
            next();
        } catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        logger.info({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

        // Handshake auth is evaluated only once, so a deactivated or logged-out
        // user's existing socket would otherwise keep streaming notifications.
        // Re-validate the access token (enforces JWT expiry) and is_active flag
        // periodically, and disconnect the socket if either no longer holds.
        const revalidate = setInterval(() => {
            try {
                jwt.verify(socket.accessToken, process.env.JWT_SECRET);
                const current = queries.findUserById(Number(socket.userId));
                if (!current || !current.is_active) {
                    socket.disconnect(true);
                }
            } catch {
                socket.disconnect(true);
            }
        }, 60 * 1000);

        socket.on('join', (userId) => {
            if (userId && String(userId) === socket.userId) {
                socket.join(String(userId));
                userSocketMap[String(userId)] = socket.id;
                logger.info({ userId }, 'User joined socket room');
            }
        });

        socket.on('join-admin', () => {
            if (socket.userRole !== 'admin') return;
            socket.join('admins');
            logger.info({ userId: socket.userId }, 'Admin joined admin socket room');
        });

        socket.on('disconnect', () => {
            clearInterval(revalidate);
            Object.keys(userSocketMap).forEach((key) => {
                if (userSocketMap[key] === socket.id) delete userSocketMap[key];
            });
            logger.info({ socketId: socket.id }, 'Socket disconnected');
        });
    });

    return io;
}

function getIO() {
    if (!io) throw new Error('Socket.io not initialized');
    return io;
}

function notifyUserWithPersistence(userId, payload) {
    if (!userId || !payload?.message) return null;

    let savedId = null;
    try {
        savedId = queries.createNotification(
            Number(userId),
            payload.type || 'system:announcement',
            payload.message,
            payload.metadata?.entryId || payload.metadata?.sessionId || null
        );
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Failed to persist notification');
    }

    if (io) {
        io.to(String(userId)).emit(payload.type || 'system:announcement', {
            ...payload,
            id: savedId,
            read: false,
            timestamp: new Date(),
        });
    }

    return savedId;
}

function notifyMentor(mentorId, entry) {
    if (!mentorId) return;
    notifyUserWithPersistence(mentorId, {
        type: 'entry:submitted',
        title: 'New Diary Entry',
        message: 'A student has submitted a new diary entry.',
        metadata: {
            entryId: entry._id || entry.id,
            studentName: entry.student?.name || 'A student',
            riskLevel: entry.aiAnalysis?.riskLevel || entry.ai_risk_level,
        },
    });
}

function notifyStudent(studentId, entry) {
    if (!studentId) return;
    notifyUserWithPersistence(studentId, {
        type: 'entry:responded',
        title: 'Mentor Response',
        message: 'Your mentor has reviewed your diary entry.',
        metadata: {
            entryId: entry._id || entry.id,
            mentorName: entry.mentor?.name || 'Your mentor',
        },
    });
}

function notifyAdmins(entry) {
    const message = `High-risk diary entry flagged for ${entry.student?.name || 'a student'}.`;
    const relatedId = entry._id || entry.id || null;

    // Persist one row per admin so the alert survives an offline admin or a page
    // reload — hydrateNotifications reads these back from the notifications table.
    try {
        const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
        for (const admin of admins) {
            queries.createNotification(admin.id, 'entry:critical', message, relatedId);
        }
    } catch (error) {
        logger.error({ error: error.message }, 'Failed to persist admin risk alert');
    }

    if (!io) return;
    io.to('admins').emit('entry:critical', {
        type: 'entry:critical',
        title: 'Risk Alert',
        message,
        metadata: {
            entryId: relatedId,
            studentName: entry.student?.name,
            riskLevel: entry.aiAnalysis?.riskLevel || entry.ai_risk_level,
            riskScore: entry.aiAnalysis?.riskScore || entry.ai_risk_score,
        },
        timestamp: new Date(),
    });
}

module.exports = {
    initSocket,
    getIO,
    notifyMentor,
    notifyStudent,
    notifyAdmins,
    notifyUserWithPersistence,
};
