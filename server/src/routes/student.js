// student.js — previously exposed /all-entries and /timeline but these
// are unused by the client (which calls /api/diary directly).
// Kept as empty router to avoid import errors in app.js.
const express = require('express');
const router = express.Router();
module.exports = router;
