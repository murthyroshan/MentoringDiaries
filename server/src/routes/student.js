const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { getAllEntries, getStudentTimeline } = require('../controllers/studentController');

router.use(auth);

// GET /api/student/all-entries — unified feed for MyEntries page
router.get('/all-entries', requireRole('student'), getAllEntries);
router.get('/timeline', requireRole('student'), getStudentTimeline);

module.exports = router;
