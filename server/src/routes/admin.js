const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const {
    getSections,
    getSectionReport,
    getStudentFullReport,
    assignMentor,
    getMentors,
    getOverview,
    getBatches,
    getRiskAlerts,
    createUser,
} = require('../controllers/adminController');
const { registerValidation } = require('../middleware/validate');

// All admin routes require authentication + admin role
router.use(auth, requireRole('admin'));

router.post('/users',                                registerValidation, createUser);
router.get('/overview',                              getOverview);
router.get('/batches',                               getBatches);
router.get('/sections',                              getSections);
router.get('/sections/:department/:section/report',  getSectionReport);
router.get('/students/:id/full-report',              getStudentFullReport);
router.patch('/students/:id/assign-mentor',          assignMentor);
router.get('/mentors',                               getMentors);
router.get('/risk-alerts',                           getRiskAlerts);

module.exports = router;
