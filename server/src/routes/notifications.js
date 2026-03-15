const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const {
    getMyNotifications,
    markRead,
    markAllRead,
} = require('../controllers/notificationController');

router.use(auth, requireRole('student', 'mentor', 'admin'));

router.get('/', getMyNotifications);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);

module.exports = router;

