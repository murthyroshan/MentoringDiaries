const { body, validationResult } = require('express-validator');

const VALID_SECTIONS = {
    CSE:  ['A', 'B', 'C', 'D'],
    AIML: ['A', 'B'],
    CS:   ['A', 'B'],
    DS:   ['A', 'B'],
};

// ─── Core validate middleware ─────────────────────────────────────────────────
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

// ─── Auth Validators ──────────────────────────────────────────────────────────
const registerValidation = [
    body('name')
        .trim().notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name too long'),
    body('email')
        .trim().isEmail().withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    // Public registration always provisions a student; any `role` in the body
    // is ignored by the controller, so student fields are always required.
    body('department')
        .notEmpty().withMessage('Department is required')
        .isIn(Object.keys(VALID_SECTIONS)).withMessage(`Department must be one of: ${Object.keys(VALID_SECTIONS).join(', ')}`),
    body('section')
        .notEmpty().withMessage('Section is required')
        .custom((section, { req }) => {
            const dept = req.body.department;
            if (dept && VALID_SECTIONS[dept] && !VALID_SECTIONS[dept].includes(section)) {
                throw new Error(`Section must be one of: ${VALID_SECTIONS[dept].join(', ')} for department ${dept}`);
            }
            return true;
        }),
    body('roll_number')
        .notEmpty().withMessage('Roll number is required')
        .isInt({ min: 1, max: 20 }).withMessage('Roll number must be between 1 and 20'),
    body('batch').optional().trim(),
    validate,
];

const loginValidation = [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
];

// ─── Weekly Diary Validators ──────────────────────────────────────────────────
const createEntryValidation = [
    body('reflection')
        .trim().notEmpty().withMessage('Reflection is required')
        .isLength({ min: 20 }).withMessage('Reflection must be at least 20 characters'),
    body('week_number')
        .optional().isInt({ min: 1, max: 52 }).withMessage('Week number must be 1-52'),
    body('mood')
        .optional().isInt({ min: 1, max: 5 }).withMessage('Mood must be 1-5'),
    body('weekly_difficulty')
        .optional().isInt({ min: 1, max: 10 }).withMessage('Weekly difficulty must be 1-10'),
    body('attendance_explanation')
        .optional().trim(),
    body('academic_year')
        .optional().matches(/^\d{4}-\d{2}$/).withMessage('Academic year format: 2024-25'),
    body('subjectRatings')
        .optional().custom((val) => {
            const arr = typeof val === 'string' ? JSON.parse(val) : val;
            if (!Array.isArray(arr)) throw new Error('subjectRatings must be an array');
            arr.forEach((s, i) => {
                if (!s.name && !s.subject_name) throw new Error(`subjectRatings[${i}].name is required`);
                if (!s.rating || s.rating < 1 || s.rating > 5) throw new Error(`subjectRatings[${i}].rating must be 1-5`);
            });
            return true;
        }),
    validate,
];

// ─── Mentor Validators ────────────────────────────────────────────────────────
const mentorResponseValidation = [
    body('response')
        .trim().notEmpty().withMessage('Response is required')
        .isLength({ min: 10 }).withMessage('Response must be at least 10 characters'),
    validate,
];

// ─── User Validators ──────────────────────────────────────────────────────────
const assignMentorValidation = [
    body('mentorId').notEmpty().withMessage('mentorId is required'),
    validate,
];

const updateUserValidation = [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('department').optional().trim(),
    body('batch').optional().trim(),
    body('roll_number').optional().isInt({ min: 1, max: 20 }).withMessage('Roll number must be 1-20'),
    validate,
];

// ─── Marks Validators ─────────────────────────────────────────────────────────
const VALID_GRADES = ['F', 'C', 'B', 'B+', 'A', 'A+', 'O'];

// Each subject persists to marks_subjects (subject_name NOT NULL, grade NOT NULL).
// The insert accepts either `name` or `subject_name`, so validate both keys and
// require a grade — otherwise an omitted grade throws a NOT NULL error mid-write.
function validateSubjects(arr) {
    if (!Array.isArray(arr)) throw new Error('Subjects must be an array');
    arr.forEach((s, i) => {
        const name = s && (s.subject_name || s.name);
        if (!name || !String(name).trim()) throw new Error(`subjects[${i}].name is required`);
        if (!VALID_GRADES.includes(s.grade)) throw new Error(`subjects[${i}].grade must be one of: ${VALID_GRADES.join(', ')}`);
    });
    return true;
}

const createMarksValidation = [
    body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be 1-8'),
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0-10'),
    body('subjects').optional().isArray().withMessage('Subjects must be an array'),
    body('subjects').optional().custom(validateSubjects),
    validate,
];

const updateMarksValidation = [
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0-10'),
    body('subjects').optional().isArray().withMessage('Subjects must be an array'),
    body('subjects').optional().custom(validateSubjects),
    validate,
];

// ─── Achievement Validators ───────────────────────────────────────────────────
const createAchievementValidation = [
    body('type').isIn(['event', 'course', 'competition', 'other']).withMessage('Invalid achievement type'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO date'),
    validate,
];

module.exports = {
    registerValidation,
    loginValidation,
    createEntryValidation,
    mentorResponseValidation,
    assignMentorValidation,
    updateUserValidation,
    createMarksValidation,
    updateMarksValidation,
    createAchievementValidation,
};
