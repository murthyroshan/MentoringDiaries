const express = require('express');
const router = express.Router();
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
const { upload } = require('../middleware/upload');

router.use(auth);

// POST - create entry (optional file attachment)
router.post('/', requireRole('student'), upload.single('attachment'), createEntryValidation, createEntry);

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
