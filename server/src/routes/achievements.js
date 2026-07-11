const express = require('express');
const router = express.Router();
const { getAchievements, createAchievement, deleteAchievement } = require('../controllers/achievementsController');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { createAchievementValidation } = require('../middleware/validate');
const { upload, cleanupUpload } = require('../middleware/upload');
const sanitizeMultipart = require('../middleware/sanitizeMultipart');

router.use(auth);

router.get('/', getAchievements);
router.post('/', requireRole('student'), upload.single('proof'), cleanupUpload, sanitizeMultipart, createAchievementValidation, createAchievement);
router.delete('/:id', requireRole('student', 'admin'), deleteAchievement);

module.exports = router;
