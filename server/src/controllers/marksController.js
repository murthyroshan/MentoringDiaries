const queries = require('../database/queries');
const db = require('../database/db');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

// Subject lists per department
const DEPT_SUBJECTS = {
    CSE:  ['Data Structures', 'Operating Systems', 'DBMS', 'Computer Networks', 'Mathematics III', 'Software Engineering'],
    AIML: ['Machine Learning', 'Deep Learning', 'Data Science', 'Python Programming', 'Statistics', 'Neural Networks'],
    CS:   ['Theory of Computation', 'Compiler Design', 'Operating Systems', 'Algorithm Design', 'Database Systems'],
    DS:   ['Data Analysis', 'Big Data', 'Statistics', 'Machine Learning', 'Data Visualization', 'Python for DS'],
};

// GET /api/marks
exports.getMarks = (req, res, next) => {
    try {
        const entries = queries.getMarksByStudent(req.user.id);
        const result = entries.map(e => ({
            ...e,
            subjects: queries.getMarkSubjects(e.id),
        }));
        return res.json({ success: true, data: result });
    } catch (error) { next(error); }
};

// POST /api/marks
exports.createMarks = (req, res, next) => {
    try {
        const { semester, academic_year, cgpa, subjects } = req.body;
        const yr = academic_year || currentAcademicYear();
        const sem = Number(semester || req.user.current_semester || 1);

        const existing = queries.getMarksEntry(req.user.id, sem, yr);
        if (existing && existing.submission_count >= 2) {
            return res.status(400).json({ success: false, message: 'Maximum 2 submissions per semester reached.' });
        }
        if (existing) {
            return res.status(409).json({ success: false, message: 'Entry exists. Use PUT to update.' });
        }

        // Entry row + subject rows must be atomic: a subject insert that fails
        // (e.g. NOT NULL grade) would otherwise leave an orphan entry that blocks
        // the student from ever re-posting.
        const entryId = db.transaction(() => {
            const id = queries.createMarksEntry({
                student_id: req.user.id,
                semester: sem,
                academic_year: yr,
                cgpa: cgpa ? Number(cgpa) : null,
            });
            if (Array.isArray(subjects) && subjects.length > 0) {
                queries.insertMarkSubjects(id, subjects);
            }
            return id;
        })();

        const entry = queries.getMarksEntry(req.user.id, sem, yr);
        return res.status(201).json({
            success: true,
            data: { ...entry, subjects: queries.getMarkSubjects(entryId) },
        });
    } catch (error) { next(error); }
};

// PUT /api/marks/:id
exports.updateMarks = (req, res, next) => {
    try {
        const entryId = Number(req.params.id);
        const entry = db.prepare('SELECT * FROM marks_entries WHERE id = ? AND student_id = ?').get(entryId, req.user.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Marks entry not found.' });

        if (entry.submission_count >= 2) {
            return res.status(400).json({ success: false, message: 'Maximum 2 submissions reached. Cannot update further.' });
        }

        const { cgpa, subjects } = req.body;
        const updates = { submission_count: entry.submission_count + 1 };
        if (cgpa !== undefined) updates.cgpa = Number(cgpa);

        // All three writes must be atomic: without a transaction, a failing
        // re-insert would leave the subjects deleted AND the submission_count
        // already incremented, permanently corrupting the entry.
        db.transaction(() => {
            queries.updateMarksEntry(entryId, updates);
            if (Array.isArray(subjects)) {
                queries.deleteMarkSubjects(entryId);
                if (subjects.length > 0) queries.insertMarkSubjects(entryId, subjects);
            }
        })();

        const updated = db.prepare('SELECT * FROM marks_entries WHERE id = ?').get(entryId);
        return res.json({
            success: true,
            data: { ...updated, subjects: queries.getMarkSubjects(entryId) },
        });
    } catch (error) { next(error); }
};

// GET /api/marks/subjects
exports.getSubjectList = (req, res, next) => {
    try {
        const dept = req.user.department || 'CSE';
        const subjects = DEPT_SUBJECTS[dept] || DEPT_SUBJECTS['CSE'];
        return res.json({ success: true, data: subjects });
    } catch (error) { next(error); }
};
