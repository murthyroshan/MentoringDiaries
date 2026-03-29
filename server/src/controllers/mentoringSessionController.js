const queries = require('../database/queries');
const db = require('../database/db');
const { notifyUserWithPersistence } = require('../socket');
const { getPagination } = require('../utils/pagination');

function formatSession(row) {
    if (!row) return null;
    return {
        ...row,
        action_items: (() => { try { return JSON.parse(row.action_items || '[]'); } catch { return []; } })(),
        mentor: { id: row.mentor_id, name: row.mentor_name, email: row.mentor_email },
        student: { id: row.student_id, name: row.student_name, email: row.student_email, department: row.student_department },
    };
}

exports.createSession = (req, res, next) => {
    try {
        const { student_id, student, scheduled_at, date, duration_mins, location, notes, action_items } = req.body;
        const studentId = Number(student_id || student);
        const scheduledAt = scheduled_at || date;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'student_id is required.' });
        }
        if (!scheduledAt) {
            return res.status(400).json({ success: false, message: 'scheduled_at is required.' });
        }

        if (req.user.role === 'mentor') {
            const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(studentId);
            if (!s || s.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied for this student.' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only mentors and admins can create sessions.' });
        }

        const mentorId = req.user.role === 'mentor' ? req.user.id : Number(req.body.mentor_id || req.user.id);

        const sessionId = queries.createSession({
            mentor_id: mentorId,
            student_id: studentId,
            scheduled_at: new Date(scheduledAt).toISOString(),
            duration_mins: duration_mins ? Number(duration_mins) : null,
            location: location || null,
            notes: notes || null,
            action_items: JSON.stringify(Array.isArray(action_items) ? action_items : []),
            status: 'scheduled',
        });

        const sessionRow = queries.getSessionById(sessionId);

        notifyUserWithPersistence(studentId, {
            type: 'session:update',
            title: 'Mentoring Session Scheduled',
            message: `A mentoring session has been scheduled.`,
            metadata: { sessionId },
        });

        return res.status(201).json({ success: true, data: formatSession(sessionRow), message: 'Session created.' });
    } catch (error) {
        next(error);
    }
};

exports.updateSession = (req, res, next) => {
    try {
        const sessionId = Number(req.params.id);
        const sessionRow = queries.getSessionById(sessionId);
        if (!sessionRow) return res.status(404).json({ success: false, message: 'Session not found.' });

        if (req.user.role === 'mentor' && sessionRow.mentor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Only the owning mentor can update this session.' });
        }
        if (req.user.role === 'student' && sessionRow.student_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const updates = {};
        const { scheduled_at, date, duration_mins, location, notes, action_items, status } = req.body;
        if (scheduled_at || date) updates.scheduled_at = new Date(scheduled_at || date).toISOString();
        if (duration_mins !== undefined) updates.duration_mins = Number(duration_mins);
        if (location !== undefined) updates.location = location;
        if (notes !== undefined) updates.notes = notes;
        if (action_items !== undefined) updates.action_items = JSON.stringify(Array.isArray(action_items) ? action_items : []);
        if (status !== undefined) updates.status = status;

        queries.updateSession(sessionId, updates);

        const updated = queries.getSessionById(sessionId);

        notifyUserWithPersistence(sessionRow.student_id, {
            type: 'session:update',
            title: 'Mentoring Session Updated',
            message: 'Your mentoring session details were updated.',
            metadata: { sessionId },
        });

        return res.json({ success: true, data: formatSession(updated), message: 'Session updated.' });
    } catch (error) {
        next(error);
    }
};

exports.getSessions = (req, res, next) => {
    try {
        const { studentId } = req.query;
        const { page, limit, skip } = getPagination(req.query);
        const filters = { limit, offset: skip };

        let rows;
        if (req.user.role === 'student') {
            rows = queries.getSessionsByStudent(req.user.id, filters);
        } else if (req.user.role === 'mentor') {
            if (studentId) {
                const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(Number(studentId));
                if (!s || s.mentor_id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Access denied.' });
                }
                filters.student_id = Number(studentId);
            }
            rows = queries.getSessionsByMentor(req.user.id, filters);
        } else {
            if (studentId) filters.student_id = Number(studentId);
            rows = queries.getAllSessions(filters);
        }

        const total = rows.length; // simple count for now
        return res.json({
            success: true,
            data: rows.map(formatSession),
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};
