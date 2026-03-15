const Event = require('../models/Event');
const { canAccessStudentData, idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');

// POST /api/events
exports.createEvent = async (req, res, next) => {
    try {
        const { semester, academicYear, eventName, organizedBy, eventType, achievement, date, description } = req.body;
        const event = await Event.create({
            student: req.user._id,
            semester,
            academicYear: academicYear || '2024-25',
            eventName,
            organizedBy,
            eventType,
            achievement,
            date,
            description,
            certificateUrl: req.file ? `/uploads/${req.file.filename}` : '',
            certificateName: req.file ? req.file.originalname : '',
        });
        res.status(201).json({ success: true, message: 'Event added to portfolio.', data: event });
    } catch (error) {
        next(error);
    }
};

// GET /api/events
exports.getEvents = async (req, res, next) => {
    try {
        const { studentId, eventType, semester } = req.query;
        const filter = {};
        const { page, limit, skip } = getPagination(req.query);

        if (req.user.role === 'student') {
            filter.student = req.user._id;
        } else if (req.user.role === 'mentor') {
            if (!studentId) {
                return res.status(400).json({ success: false, message: 'studentId is required for mentor access.' });
            }
            const allowed = await canAccessStudentData(req.user, studentId);
            if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });
            filter.student = studentId;
        } else if (req.user.role === 'admin' && studentId) {
            filter.student = studentId;
        }

        if (eventType) filter.eventType = eventType;
        if (semester) filter.semester = Number(semester);

        const [events, total] = await Promise.all([
            Event.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
            Event.countDocuments(filter),
        ]);
        res.json({
            success: true,
            data: events,
            total,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/events/:id
exports.updateEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        if (!idsEqual(event.student, req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        const allowed = ['eventName', 'organizedBy', 'eventType', 'achievement', 'date', 'description'];
        allowed.forEach(f => { if (req.body[f] !== undefined) event[f] = req.body[f]; });
        if (req.file) {
            event.certificateUrl = `/uploads/${req.file.filename}`;
            event.certificateName = req.file.originalname;
        }
        await event.save();
        res.json({ success: true, message: 'Event updated.', data: event });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
        if (!idsEqual(event.student, req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        await event.deleteOne();
        res.json({ success: true, message: 'Event removed from portfolio.' });
    } catch (error) {
        next(error);
    }
};
