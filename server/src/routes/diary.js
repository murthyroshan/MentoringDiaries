const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    createEntry, getEntries, getEntry,
    addMentorResponse, getFlaggedEntries, getStudentRiskHistory,
    getMentorSuggestion,
    getPriorityQueue,
    checkRange,
} = require('../controllers/diaryController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { createEntryValidation, mentorResponseValidation } = require('../middleware/validate');
const { upload, cleanupUpload } = require('../middleware/upload');
const sanitizeMultipart = require('../middleware/sanitizeMultipart');

// 10 diary submissions per user per hour — protects Groq API quota and DB storage.
const diaryCreateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => (req.user?.id != null ? `u${req.user.id}` : req.ip),
    message: { success: false, message: 'Too many diary submissions. Please wait before submitting again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.use(auth);

// POST - create entry (optional file attachment)
router.post('/', requireRole('student'), diaryCreateLimiter, upload.single('attachment'), cleanupUpload, sanitizeMultipart, createEntryValidation, createEntry);

// IMPORTANT: specific paths MUST come before /:id wildcard
router.get('/check-range', requireRole('student'), checkRange);
router.get('/flagged', requireRole('mentor', 'admin'), getFlaggedEntries);
router.get('/priority-queue', requireRole('mentor', 'admin'), getPriorityQueue);
router.get('/student/:studentId/history', requireRole('mentor', 'admin'), getStudentRiskHistory);
router.get('/:id/mentor-suggestion', requireRole('mentor', 'admin'), getMentorSuggestion);

router.get('/', getEntries);
router.get('/:id', getEntry);
router.patch('/:id/response', requireRole('mentor', 'admin'), mentorResponseValidation, addMentorResponse);

module.exports = router;
