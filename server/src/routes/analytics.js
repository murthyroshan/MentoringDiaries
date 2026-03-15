const express = require('express');
const router = express.Router();
const {
    getOverview, getSentimentDistribution, getRiskDistribution,
    getEntryTrends, getInterventionResponseTime, getMentorEfficiency,
    getStudentOverview, getStudentGrowth, getStudentWeeklyInsights, getStudentWeeklyInsightsHistory,
    exportCSV, exportFlaggedCSV
} = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');

router.use(auth);

router.get('/overview', requireRole('admin', 'mentor'), getOverview);
router.get('/sentiment-distribution', requireRole('admin', 'mentor'), getSentimentDistribution);
router.get('/risk-distribution', requireRole('admin', 'mentor'), getRiskDistribution);
router.get('/entry-trends', requireRole('admin', 'mentor'), getEntryTrends);
router.get('/intervention-response-time', requireRole('admin', 'mentor'), getInterventionResponseTime);
router.get('/mentor-efficiency', requireRole('admin', 'mentor'), getMentorEfficiency);
router.get('/student-overview', requireRole('student', 'mentor', 'admin'), getStudentOverview);
router.get('/student-growth', requireRole('student', 'mentor', 'admin'), getStudentGrowth);
router.get('/student-weekly-insights', requireRole('student', 'mentor', 'admin'), getStudentWeeklyInsights);
router.get('/student-weekly-insights/history', requireRole('student', 'mentor', 'admin'), getStudentWeeklyInsightsHistory);
router.get('/export/csv', requireRole('admin'), exportCSV);
router.get('/export/flagged', requireRole('admin'), exportFlaggedCSV);

module.exports = router;
