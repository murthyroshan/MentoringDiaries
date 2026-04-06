const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const {
    getDashboardSummary,
    getPriorityQueue,
    getStudentsRoster,
    getFlaggedStudents,
    getAttendanceWatchlist,
    getSubjectConcerns,
    getStudentComparison,
    getStudentTimeline,
    createMentorSession,
    updateMentorSession,
    bulkAction,
    getAiSuggestion,
} = require('../controllers/mentorController');

// All routes require auth + mentor role
router.use(auth);
router.use(requireRole('mentor'));

router.get('/dashboard-summary',      getDashboardSummary);
router.get('/priority-queue',         getPriorityQueue);
router.get('/students-roster',        getStudentsRoster);
router.get('/flagged-students',       getFlaggedStudents);
router.get('/attendance-watchlist',   getAttendanceWatchlist);
router.get('/subject-concerns',       getSubjectConcerns);
router.get('/student-comparison',     getStudentComparison);
router.get('/students/:id/timeline',  getStudentTimeline);
router.post('/sessions',              createMentorSession);
router.patch('/sessions/:id',         updateMentorSession);
router.post('/bulk-action',           bulkAction);
router.get('/ai-suggestion/:entryId', getAiSuggestion);

module.exports = router;
