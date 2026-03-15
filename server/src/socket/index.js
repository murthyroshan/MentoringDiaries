const Notification = require('../models/Notification');

let io;
const userSocketMap = {}; // userId -> socketId

function initSocket(server) {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('join', (userId) => {
            if (userId) {
                socket.join(userId);
                userSocketMap[userId] = socket.id;
                console.log(`User ${userId} joined room`);
            }
        });

        socket.on('join-admin', () => {
            socket.join('admins');
            console.log(`Admin ${socket.id} joined admin room`);
        });

        socket.on('disconnect', () => {
            Object.keys(userSocketMap).forEach((key) => {
                if (userSocketMap[key] === socket.id) delete userSocketMap[key];
            });
            console.log(`Socket disconnected: ${socket.id}`);
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
        console.error('Failed to persist notification:', error.message);
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

