const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', auth, logout);
router.get('/me', auth, getMe);

module.exports = router;
