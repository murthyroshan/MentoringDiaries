const { body, validationResult } = require('express-validator');

// ─── Core validate middleware ────────────────────────────────────────────────
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

// ─── Auth Validators ─────────────────────────────────────────────────────────

const registerValidation = [
    body('name')
        .trim().notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name too long'),
    body('email')
        .trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail()
        .custom((email, { req }) => {
            // Students must use institutional email
            const role = req.body.role || 'student';
            if (role === 'student' && !email.endsWith('@gcet.edu.in')) {
                throw new Error('Students must register with an @gcet.edu.in email address');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('role')
        .optional().isIn(['student', 'mentor']).withMessage('Role must be student or mentor'),
    body('rollNumber')
        .if(body('role').equals('student'))
        .trim()
        .notEmpty().withMessage('Roll number is required for students')
        .matches(/^\d{2}[a-zA-Z0-9]+$/).withMessage('Roll number must start with 2 digits followed by alphanumeric characters')
        .isLength({ min: 6, max: 10 }).withMessage('Roll number must be 6-10 characters'),
    body('department').optional().trim(),
    body('batch').optional().trim(),
    body('year')
        .if(body('role').equals('student'))
        .optional()
        .isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
    validate,
];

const loginValidation = [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
];

// ─── Weekly Diary Validators ─────────────────────────────────────────────────

const createEntryValidation = [
    body('content')
        .trim().notEmpty().withMessage('Content (Section A) is required')
        .isLength({ min: 50 }).withMessage('Content must be at least 50 characters'),
    body('startDate')
        .optional()
        .isISO8601().withMessage('startDate must be a valid date (ISO 8601)'),
    body('endDate')
        .optional()
        .isISO8601().withMessage('endDate must be a valid date (ISO 8601)'),
    body('emotionalRating')
        .optional().isInt({ min: 1, max: 5 }).withMessage('Emotional rating must be 1-5'),
    body('attendancePercentage')
        .optional().isFloat({ min: 0, max: 100 }).withMessage('Attendance must be 0-100'),
    body('attendanceExplanation')
        .if(body('attendancePercentage').isFloat({ max: 74.9 }))
        .notEmpty().withMessage('Explanation required when attendance is below 75%'),
    body('academicYear')
        .optional().matches(/^\d{4}-\d{2}$/).withMessage('Academic year format: 2024-25'),
    body('subjectRatings')
        .optional().custom((val) => {
            const arr = typeof val === 'string' ? JSON.parse(val) : val;
            if (!Array.isArray(arr)) throw new Error('subjectRatings must be an array');
            arr.forEach((s, i) => {
                if (!s.name) throw new Error(`subjectRatings[${i}].name is required`);
                if (!s.rating || s.rating < 1 || s.rating > 5) throw new Error(`subjectRatings[${i}].rating must be 1-5`);
            });
            return true;
        }),
    validate,
];

// ─── Mentor Validators ───────────────────────────────────────────────────────

const mentorResponseValidation = [
    body('response')
        .trim().notEmpty().withMessage('Response is required')
        .isLength({ min: 10 }).withMessage('Response must be at least 10 characters'),
    validate,
];

// ─── User Validators ─────────────────────────────────────────────────────────

const assignMentorValidation = [
    body('mentorId').notEmpty().withMessage('mentorId is required').isMongoId().withMessage('Invalid mentor ID'),
    validate,
];

const updateUserValidation = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('department').optional().trim(),
    body('batch').optional().trim(),
    body('year').optional().isInt({ min: 1, max: 4 }).withMessage('Year must be 1-4'),
    validate,
];

// ─── Academic Record Validators ──────────────────────────────────────────────

const createAcademicRecordValidation = [
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be 1-8'),
    body('examType').isIn(['mid1', 'mid2', 'endsem']).withMessage('examType must be mid1, mid2, or endsem'),
    // Midterm-only: subjects array with numeric marks
    body('subjects')
        .if(body('examType').not().equals('endsem'))
        .isArray({ min: 1 }).withMessage('At least one subject is required for midterm'),
    body('subjects.*.name')
        .if(body('examType').not().equals('endsem'))
        .trim().notEmpty().withMessage('Subject name is required'),
    body('subjects.*.marks')
        .if(body('examType').not().equals('endsem'))
        .isFloat({ min: 0, max: 40 }).withMessage('Midterm marks must be between 0 and 40'),
    // Endsem-only: endsemSubjects array with grade
    body('endsemSubjects')
        .if(body('examType').equals('endsem'))
        .isArray({ min: 1 }).withMessage('At least one subject grade is required for end-semester'),
    body('endsemSubjects.*.name')
        .if(body('examType').equals('endsem'))
        .trim().notEmpty().withMessage('Subject name is required'),
    body('endsemSubjects.*.grade')
        .if(body('examType').equals('endsem'))
        .isIn(['F', 'C', 'B', 'B+', 'A', 'A+', 'O']).withMessage('Grade must be one of: F, C, B, B+, A, A+, O'),
    body('finalCgpa')
        .if(body('examType').equals('endsem'))
        .isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0.0 and 10.0'),
    validate,
];

// ─── Event Validators ────────────────────────────────────────────────────────

const createEventValidation = [
    body('eventName').trim().notEmpty().withMessage('Event name is required'),
    body('eventType').isIn(['technical', 'cultural', 'sports', 'workshop', 'hackathon', 'seminar', 'other'])
        .withMessage('Invalid event type'),
    body('achievement').isIn(['participated', 'winner', 'runner-up', 'special-mention', 'coordinator', 'volunteer', 'other'])
        .withMessage('Invalid achievement'),
    body('date').isISO8601().withMessage('Valid event date is required'),
    validate,
];

// ─── Skill Validators ────────────────────────────────────────────────────────

const createSkillValidation = [
    body('skillName').trim().notEmpty().withMessage('Skill name is required'),
    body('skillCategory').isIn(['Technical', 'Communication', 'Leadership', 'Soft Skills', 'Other'])
        .withMessage('Invalid skill category'),
    body('ratingBefore').isInt({ min: 1, max: 5 }).withMessage('Rating before must be 1-5'),
    body('ratingAfter').isInt({ min: 1, max: 5 }).withMessage('Rating after must be 1-5'),
    validate,
];

module.exports = {
    registerValidation,
    loginValidation,
    createEntryValidation,
    mentorResponseValidation,
    assignMentorValidation,
    updateUserValidation,
    createAcademicRecordValidation,
    createEventValidation,
    createSkillValidation,
};
