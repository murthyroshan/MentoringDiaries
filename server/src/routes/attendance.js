const express = require('express');
const router = express.Router();
const { getMyAttendance, getMyAttendanceHistory } = require('../controllers/attendanceController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

router.use(auth);
router.use(requireRole('student'));

router.get('/me', getMyAttendance);
router.get('/me/history', getMyAttendanceHistory);

module.exports = router;
