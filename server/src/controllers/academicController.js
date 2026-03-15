const AcademicRecord = require('../models/AcademicRecord');
const { canAccessStudentData, idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');

// POST /api/academic - Create new academic record
exports.createRecord = async (req, res, next) => {
    try {
        const { semester, academicYear, examType, subjects, endsemSubjects, finalCgpa } = req.body;

        // ── Check for existing record (unique per student+semester+examType) ───
        const existing = await AcademicRecord.findOne({
            student: req.user._id, semester, examType,
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `You already have a ${examType.toUpperCase()} record for Semester ${semester}. Use update instead.`,
            });
        }

        // ── Exam-type-specific validation ────────────────────────────────────
        if (examType === 'endsem') {
            if (!endsemSubjects || !Array.isArray(endsemSubjects) || endsemSubjects.length === 0) {
                return res.status(400).json({ success: false, message: 'End-semester record requires subject grades.' });
            }
            const validGrades = ['F', 'C', 'B', 'B+', 'A', 'A+', 'O'];
            for (const s of endsemSubjects) {
                if (!validGrades.includes(s.grade)) {
                    return res.status(400).json({ success: false, message: `Invalid grade "${s.grade}". Must be one of: ${validGrades.join(', ')}.` });
                }
            }
            const cgpa = Number(finalCgpa);
            if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
                return res.status(400).json({ success: false, message: 'finalCgpa must be between 0 and 10.' });
            }
        } else {
            // Midterm (mid1 / mid2)
            if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
                return res.status(400).json({ success: false, message: 'Midterm record requires at least one subject.' });
            }
            for (const s of subjects) {
                const m = Number(s.marks);
                if (isNaN(m) || m < 0 || m > 40) {
                    return res.status(400).json({ success: false, message: `Marks for "${s.name}" must be between 0 and 40.` });
                }
            }
        }

        const payload = {
            student: req.user._id,
            semester: Number(semester),
            academicYear: academicYear || '2024-25',
            examType,
        };

        if (examType === 'endsem') {
            payload.endsemSubjects = endsemSubjects;
            payload.finalCgpa = Number(finalCgpa);
        } else {
            payload.subjects = subjects.map(s => ({ name: s.name, marks: Number(s.marks), maxMarks: 40 }));
        }

        const record = await AcademicRecord.create(payload);
        res.status(201).json({ success: true, message: 'Academic record submitted.', data: record });
    } catch (error) {
        next(error);
    }
};

// GET /api/academic
exports.getRecords = async (req, res, next) => {
    try {
        const { semester, studentId } = req.query;
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

        if (semester) filter.semester = Number(semester);

        const records = await AcademicRecord.find(filter)
            .sort({ semester: 1, examType: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await AcademicRecord.countDocuments(filter);
        res.json({
            success: true,
            data: records,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/academic/:id
exports.getRecord = async (req, res, next) => {
    try {
        const record = await AcademicRecord.findById(req.params.id).lean();
        if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });

        const allowed = await canAccessStudentData(req.user, record.student);
        if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });

        res.json({ success: true, data: record });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/academic/:id
exports.updateRecord = async (req, res, next) => {
    try {
        const record = await AcademicRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });

        if (req.user.role === 'student' && !idsEqual(record.student, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (req.user.role === 'mentor') {
            const allowed = await canAccessStudentData(req.user, record.student);
            if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (record.locked) {
            return res.status(403).json({ success: false, message: 'This record is locked and cannot be edited without mentor approval.' });
        }

        const { subjects, endsemSubjects, finalCgpa, mentorNotes, locked, mentorApprovalStatus } = req.body;

        if (record.examType === 'endsem') {
            if (endsemSubjects) record.endsemSubjects = endsemSubjects;
            if (finalCgpa !== undefined) {
                const cgpa = Number(finalCgpa);
                if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
                    return res.status(400).json({ success: false, message: 'finalCgpa must be between 0 and 10.' });
                }
                record.finalCgpa = cgpa;
            }
        } else {
            if (subjects) {
                for (const s of subjects) {
                    const m = Number(s.marks);
                    if (isNaN(m) || m < 0 || m > 40) {
                        return res.status(400).json({ success: false, message: `Marks for "${s.name}" must be between 0 and 40.` });
                    }
                }
                record.subjects = subjects.map(s => ({ name: s.name, marks: Number(s.marks), maxMarks: 40 }));
            }
        }

        if (req.user.role !== 'student') {
            if (mentorNotes !== undefined) record.mentorNotes = mentorNotes;
            if (mentorApprovalStatus) record.mentorApprovalStatus = mentorApprovalStatus;
            if (locked !== undefined) record.locked = locked;
        }

        await record.save();
        res.json({ success: true, message: 'Record updated.', data: record });
    } catch (error) {
        next(error);
    }
};

// POST /api/academic/:id/request-edit
exports.requestEdit = async (req, res, next) => {
    try {
        const record = await AcademicRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: 'Record not found.' });
        if (String(record.student) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        record.mentorApprovalRequired = true;
        record.mentorApprovalStatus = 'pending';
        await record.save();
        res.json({ success: true, message: 'Edit request submitted to mentor.' });
    } catch (error) {
        next(error);
    }
};
