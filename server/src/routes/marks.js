const express = require('express');
const router = express.Router();
const { getMarks, createMarks, updateMarks, getSubjectList } = require('../controllers/marksController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { createMarksValidation } = require('../middleware/validate');

router.use(auth);
router.use(requireRole('student'));

router.get('/', getMarks);
router.get('/subjects', getSubjectList);
router.post('/', createMarksValidation, createMarks);
router.put('/:id', updateMarks);

module.exports = router;
