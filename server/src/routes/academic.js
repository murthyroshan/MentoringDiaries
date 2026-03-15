const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { createAcademicRecordValidation } = require('../middleware/validate');
const { createRecord, getRecords, getRecord, updateRecord, requestEdit } = require('../controllers/academicController');

// All routes require authentication
router.use(auth);

router.get('/', getRecords);                                          // student: own | mentor/admin: query by studentId
router.post('/', requireRole('student'), createAcademicRecordValidation, createRecord); // student only
router.get('/:id', getRecord);
router.patch('/:id', updateRecord);                                  // student (if not locked), mentor/admin
router.post('/:id/request-edit', requireRole('student'), requestEdit); // student requests unlock

module.exports = router;
