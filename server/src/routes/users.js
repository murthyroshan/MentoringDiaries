const express = require('express');
const router = express.Router();
const { getUsers, getUserById, updateUser, assignMentor, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { assignMentorValidation, updateUserValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', requireRole('admin', 'mentor'), getUsers);
router.get('/:id', getUserById);

// IMPORTANT: specific routes MUST come before /:id wildcard
router.patch('/:studentId/assign-mentor', requireRole('admin'), assignMentorValidation, assignMentor);
router.patch('/:id', updateUserValidation, updateUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
