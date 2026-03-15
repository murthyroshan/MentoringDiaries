const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const {
    createSession,
    updateSession,
    getSessions,
} = require('../controllers/mentoringSessionController');

router.use(auth);

router.get('/', requireRole('student', 'mentor', 'admin'), getSessions);
router.post('/', requireRole('mentor', 'admin'), createSession);
router.patch('/:id', requireRole('mentor', 'admin'), updateSession);

module.exports = router;

