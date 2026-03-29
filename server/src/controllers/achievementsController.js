const queries = require('../database/queries');
const db = require('../database/db');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

const VALID_TYPES = ['event', 'course', 'competition', 'other'];

// GET /api/achievements
exports.getAchievements = (req, res, next) => {
    try {
        const { semester, academic_year } = req.query;
        const yr = academic_year || currentAcademicYear();
        const studentId = req.user.role === 'student'
            ? req.user.id
            : Number(req.query.studentId || req.user.id);

        if (req.user.role === 'mentor') {
            const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(studentId);
            if (!s || s.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const data = queries.getAchievementsByStudent(
            studentId,
            semester ? Number(semester) : undefined,
            yr
        );
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// POST /api/achievements
exports.createAchievement = (req, res, next) => {
    try {
        const { type, title, description, date, proof_url, semester, academic_year } = req.body;
        const yr = academic_year || currentAcademicYear();
        const sem = Number(semester || req.user.current_semester || 4);

        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({ success: false, message: `Type must be one of: ${VALID_TYPES.join(', ')}.` });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ success: false, message: 'Title is required.' });
        }

        const count = queries.getAchievementCount(req.user.id, sem, yr);
        if (count >= 3) {
            return res.status(400).json({ success: false, message: 'Maximum 3 achievements per semester allowed.' });
        }

        const id = queries.createAchievement({
            student_id: req.user.id,
            semester: sem,
            academic_year: yr,
            type,
            title: title.trim(),
            description: description || null,
            date: date || null,
            proof_url: proof_url || (req.file ? `/uploads/${req.file.filename}` : null),
        });

        const achievement = db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
        return res.status(201).json({ success: true, data: achievement });
    } catch (error) { next(error); }
};

// DELETE /api/achievements/:id
exports.deleteAchievement = (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const achievement = queries.getAchievementById(id);
        if (!achievement) return res.status(404).json({ success: false, message: 'Achievement not found.' });
        if (achievement.student_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        queries.deleteAchievement(id);
        return res.json({ success: true, message: 'Achievement deleted.' });
    } catch (error) { next(error); }
};
