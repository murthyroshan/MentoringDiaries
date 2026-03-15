const MentoringSession = require('../models/MentoringSession');
const { canAccessStudentData, isMentorAssignedToStudent, idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');
const { notifyUserWithPersistence } = require('../socket');

exports.createSession = async (req, res, next) => {
    try {
        const { student, date, agenda, discussionNotes, actionItems, followUpDate } = req.body;

        if (!student) {
            return res.status(400).json({ success: false, message: 'student is required.' });
        }
        if (!date) {
            return res.status(400).json({ success: false, message: 'date is required.' });
        }

        if (req.user.role === 'mentor') {
            const assigned = await isMentorAssignedToStudent(req.user._id, student);
            if (!assigned) {
                return res.status(403).json({ success: false, message: 'Access denied for this student.' });
            }
        }
        if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied for this student.' });
        }

        const session = await MentoringSession.create({
            mentor: req.user.role === 'mentor' ? req.user._id : (req.body.mentor || req.user._id),
            student,
            date: new Date(date),
            agenda: agenda || '',
            discussionNotes: discussionNotes || '',
            actionItems: Array.isArray(actionItems) ? actionItems : [],
            followUpDate: followUpDate ? new Date(followUpDate) : null,
        });

        await session.populate('mentor', 'name email');
        await session.populate('student', 'name email department batch');

        notifyUserWithPersistence(session.student._id, {
            type: 'session:update',
            title: 'Mentoring Session Scheduled',
            message: `A mentoring session has been scheduled for ${session.date.toLocaleDateString('en-IN')}.`,
            metadata: { sessionId: session._id },
        });

        return res.status(201).json({ success: true, data: session, message: 'Session created.' });
    } catch (error) {
        next(error);
    }
};

exports.updateSession = async (req, res, next) => {
    try {
        const session = await MentoringSession.findById(req.params.id);
        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

        if (req.user.role === 'mentor' && !idsEqual(session.mentor, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the owning mentor can update this session.' });
        }
        if (req.user.role === 'student' && !idsEqual(session.student, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const allowedFields = ['date', 'agenda', 'discussionNotes', 'actionItems', 'followUpDate'];
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                if (field === 'date' || field === 'followUpDate') {
                    session[field] = req.body[field] ? new Date(req.body[field]) : null;
                } else {
                    session[field] = req.body[field];
                }
            }
        });

        await session.save();
        await session.populate('mentor', 'name email');
        await session.populate('student', 'name email department batch');

        notifyUserWithPersistence(session.student._id, {
            type: 'session:update',
            title: 'Mentoring Session Updated',
            message: 'Your mentoring session details were updated.',
            metadata: { sessionId: session._id },
        });

        return res.json({ success: true, data: session, message: 'Session updated.' });
    } catch (error) {
        next(error);
    }
};

exports.getSessions = async (req, res, next) => {
    try {
        const { studentId } = req.query;
        const query = {};
        const { page, limit, skip } = getPagination(req.query);

        if (req.user.role === 'student') {
            query.student = req.user._id;
        } else if (req.user.role === 'mentor') {
            if (studentId) {
                const allowed = await canAccessStudentData(req.user, studentId);
                if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });
                query.student = studentId;
            } else {
                query.mentor = req.user._id;
            }
        } else if (req.user.role === 'admin') {
            if (studentId) query.student = studentId;
        }

        const [sessions, total] = await Promise.all([
            MentoringSession.find(query)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('mentor', 'name email')
                .populate('student', 'name email department batch'),
            MentoringSession.countDocuments(query),
        ]);

        return res.json({
            success: true,
            data: sessions,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};
