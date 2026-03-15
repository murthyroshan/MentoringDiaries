const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roleCheck');
const { createSkillValidation } = require('../middleware/validate');
const { createSkill, getSkills, updateSkill, deleteSkill } = require('../controllers/skillController');

router.use(auth);

router.get('/', getSkills);
router.post('/', requireRole('student'), createSkillValidation, createSkill);
router.patch('/:id', updateSkill);
router.delete('/:id', deleteSkill);

module.exports = router;
