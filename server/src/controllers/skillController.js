const SkillProgress = require('../models/SkillProgress');
const { canAccessStudentData, idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');

// POST /api/skills
exports.createSkill = async (req, res, next) => {
    try {
        const { semester, academicYear, skillCategory, skillName, ratingBefore, ratingAfter, description, source } = req.body;
        const skill = await SkillProgress.create({
            student: req.user._id,
            semester,
            academicYear: academicYear || '2024-25',
            skillCategory,
            skillName,
            ratingBefore,
            ratingAfter,
            description,
            source,
        });
        res.status(201).json({ success: true, message: 'Skill progress recorded.', data: skill });
    } catch (error) {
        next(error);
    }
};

// GET /api/skills
exports.getSkills = async (req, res, next) => {
    try {
        const { studentId, semester, skillCategory } = req.query;
        const filter = {};
        const { page, limit, skip } = getPagination(req.query);

        if (req.user.role === 'student') {
            filter.student = req.user._id;
        } else if (req.user.role === 'mentor') {
            if (!studentId) {
                return res.status(400).json({ success: false, message: 'studentId is required for mentor access.' });
            }
            const allowed = await canAccessStudentData(req.user, studentId);
            if (!allowed) return res.status(403).json({ success: false, message: 'Access denied.' });
            filter.student = studentId;
        } else if (req.user.role === 'admin' && studentId) {
            filter.student = studentId;
        }

        if (semester) filter.semester = Number(semester);
        if (skillCategory) filter.skillCategory = skillCategory;

        const [skills, total] = await Promise.all([
            SkillProgress.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            SkillProgress.countDocuments(filter),
        ]);

        // Compute total improvement for summary
        const totalImprovement = skills.reduce((sum, s) => sum + (s.ratingAfter - s.ratingBefore), 0);

        res.json({
            success: true,
            data: skills,
            total,
            totalImprovement,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/skills/:id
exports.updateSkill = async (req, res, next) => {
    try {
        const skill = await SkillProgress.findById(req.params.id);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill record not found.' });
        if (!idsEqual(skill.student, req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        const allowed = ['skillName', 'skillCategory', 'ratingBefore', 'ratingAfter', 'description', 'source'];
        allowed.forEach(f => { if (req.body[f] !== undefined) skill[f] = req.body[f]; });
        await skill.save();
        res.json({ success: true, data: skill });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/skills/:id
exports.deleteSkill = async (req, res, next) => {
    try {
        const skill = await SkillProgress.findById(req.params.id);
        if (!skill) return res.status(404).json({ success: false, message: 'Skill record not found.' });
        if (!idsEqual(skill.student, req.user._id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        await skill.deleteOne();
        res.json({ success: true, message: 'Skill record deleted.' });
    } catch (error) {
        next(error);
    }
};
