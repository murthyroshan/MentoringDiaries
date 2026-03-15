const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { upload } = require('../middleware/upload');
const { createEventValidation } = require('../middleware/validate');
const { createEvent, getEvents, updateEvent, deleteEvent } = require('../controllers/eventController');

router.use(auth);

router.get('/', getEvents);                                                     // student: own | mentor/admin: by studentId
router.post('/', requireRole('student'), upload.single('certificate'), createEventValidation, createEvent);
router.patch('/:id', upload.single('certificate'), updateEvent);
router.delete('/:id', deleteEvent);

module.exports = router;
