const express = require('express');
const router = express.Router();
const {
    getOverview, getSentimentDistribution, getRiskDistribution,
    getEntryTrends, getMentorEfficiency,
    getStudentOverview, getStudentRiskHistory, getStudentWeeklyInsight,
    getPortfolio,
    exportCSV, exportFlaggedCSV,
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

router.use(auth);

router.get('/overview',                requireRole('admin', 'mentor'),                   getOverview);
router.get('/sentiment-distribution',  requireRole('admin', 'mentor'),                   getSentimentDistribution);
router.get('/risk-distribution',       requireRole('admin', 'mentor'),                   getRiskDistribution);
router.get('/entry-trends',            requireRole('admin', 'mentor'),                   getEntryTrends);
router.get('/mentor-efficiency',       requireRole('admin', 'mentor'),                   getMentorEfficiency);
router.get('/student-overview',        requireRole('student', 'mentor', 'admin'),         getStudentOverview);
router.get('/student-risk-history',    requireRole('student', 'mentor', 'admin'),         getStudentRiskHistory);
router.get('/student-weekly-insight',  requireRole('student', 'mentor', 'admin'),         getStudentWeeklyInsight);
router.get('/portfolio',               requireRole('student'),                           getPortfolio);
router.get('/export/csv',              requireRole('admin'),                             exportCSV);
router.get('/export/flagged',          requireRole('admin'),                             exportFlaggedCSV);

module.exports = router;
