const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

let io;
const userSocketMap = {}; // userId -> socketId

// Parse raw cookie header string into a key/value map.
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

// Mirror the same origin-parsing logic as app.js so both layers stay in sync.
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

    // Authenticate every socket connection using the same httpOnly cookie
    // that the REST API uses — no separate token handshake needed from the client.
    io.use(async (socket, next) => {
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

            const user = await User.findById(decoded.id).select('_id role isActive');
            if (!user || !user.isActive) return next(new Error('Unauthorized: user not found'));

            socket.userId = user._id.toString();
            socket.userRole = user.role;
            next();
        } catch {
            next(new Error('Unauthorized'));
        }
    });

    io.on('connection', (socket) => {
        logger.info({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

        socket.on('join', (userId) => {
            // Only allow users to join their own room — prevents impersonation.
            if (userId && userId === socket.userId) {
                socket.join(userId);
                userSocketMap[userId] = socket.id;
                logger.info({ userId }, 'User joined socket room');
            }
        });

        socket.on('join-admin', () => {
            // Only admins may join the admin broadcast room.
            if (socket.userRole !== 'admin') return;
            socket.join('admins');
            logger.info({ userId: socket.userId }, 'Admin joined admin socket room');
        });

        socket.on('disconnect', () => {
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

async function notifyUserWithPersistence(userId, payload) {
    if (!userId || !payload?.message) return null;

    let saved = null;
    try {
        saved = await Notification.create({
            user: userId,
            type: payload.type || 'system:announcement',
            title: payload.title || 'Notification',
            message: payload.message,
            metadata: payload.metadata || {},
        });
    } catch (error) {
        logger.error({ error: error.message, userId }, 'Failed to persist notification');
    }

    if (io) {
        io.to(userId.toString()).emit(payload.type || 'system:announcement', {
            ...payload,
            id: saved?._id,
            read: false,
            timestamp: saved?.createdAt || new Date(),
        });
    }

    return saved;
}

// Notify mentor when student submits an entry
function notifyMentor(mentorId, entry) {
    if (!mentorId) return;
    notifyUserWithPersistence(mentorId, {
        type: 'entry:submitted',
        title: 'New Diary Entry',
        message: 'A student has submitted a new diary entry.',
        metadata: {
            entryId: entry._id,
            studentName: entry.student?.name || 'A student',
            riskLevel: entry.aiAnalysis?.riskLevel,
        },
    });
}

// Notify student when mentor responds
function notifyStudent(studentId, entry) {
    if (!studentId) return;
    notifyUserWithPersistence(studentId, {
        type: 'entry:responded',
        title: 'Mentor Response',
        message: 'Your mentor has reviewed your diary entry.',
        metadata: {
            entryId: entry._id,
            mentorName: entry.mentor?.name || 'Your mentor',
        },
    });
}

// Notify all admins for critical/high risk entries
function notifyAdmins(entry) {
    if (!io) return;
    io.to('admins').emit('entry:critical', {
        type: 'entry:critical',
        title: 'Risk Alert',
        message: `High-risk diary entry flagged for ${entry.student?.name || 'a student'}.`,
        metadata: {
            entryId: entry._id,
            studentName: entry.student?.name,
            riskLevel: entry.aiAnalysis?.riskLevel,
            riskScore: entry.aiAnalysis?.riskScore,
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

