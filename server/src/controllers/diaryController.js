const queries = require('../database/queries');
const db = require('../database/db');
const { analyzeEntry, generateMentorSuggestion } = require('../services/aiService');
const { notifyMentor, notifyStudent, notifyAdmins } = require('../socket');
const { getPagination } = require('../utils/pagination');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

function formatEntry(row) {
    if (!row) return null;
    return {
        ...row,
        ai_flags: safeJson(row.ai_flags, []),
        ai_key_concerns: safeJson(row.ai_key_concerns, []),
        student: {
            id: row.student_id,
            name: row.student_name,
            email: row.student_email,
            department: row.student_department,
            section: row.student_section,
            roll_number: row.student_roll_number,
            batch: row.student_batch,
        },
        mentor: row.mentor_name ? {
            name: row.mentor_name,
            email: row.mentor_email,
            department: row.mentor_department,
        } : null,
    };
}

function safeJson(val, fallback) {
    try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

// GET /api/diary/check-range
exports.checkRange = (req, res, next) => {
    try {
        const { week_number, academic_year, semester } = req.query;
        if (!week_number) {
            return res.status(400).json({ success: false, message: 'week_number is required.' });
        }

        const existing = db.prepare(`
            SELECT id, week_number FROM diary_entries
            WHERE student_id = ? AND week_number = ? AND academic_year = ? AND semester = ?
        `).get(req.user.id, Number(week_number), academic_year || currentAcademicYear(), Number(semester || 1));

        return res.json({
            success: true,
            overlap: !!existing,
            rangeError: false,
            message: existing ? 'An entry already exists for this week.' : 'Week is available.',
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/diary
exports.createEntry = async (req, res, next) => {
    try {
        const {
            week_number, academic_year, semester,
            start_date, end_date,
            mood, weekly_difficulty,
            attendance_explanation,
            reflection, challenges,
            subjectRatings,
        } = req.body;

        if (!reflection || String(reflection).trim().length < 20) {
            return res.status(400).json({ success: false, message: 'Reflection must be at least 20 characters.' });
        }

        const yr = academic_year || currentAcademicYear();
        const sem = Number(semester || req.user.current_semester || 1);
        const weekNum = Number(week_number || 1);

        // Fetch attendance from DB
        let attendance_pct = null;
        if (req.user.department && req.user.section && req.user.roll_number) {
            const attRow = queries.getAttendance(
                req.user.department,
                req.user.section,
                req.user.roll_number,
                weekNum,
                yr,
                sem
            );
            if (attRow) attendance_pct = attRow.cumulative_pct;
        }

        // Attendance explanation required if below 75%
        if (attendance_pct !== null && attendance_pct < 75 && !attendance_explanation) {
            return res.status(400).json({
                success: false,
                message: 'Attendance explanation is required when attendance is below 75%.',
            });
        }

        // Parse subject ratings
        let parsedRatings = [];
        if (Array.isArray(subjectRatings)) {
            parsedRatings = subjectRatings;
        } else if (subjectRatings) {
            try { parsedRatings = JSON.parse(subjectRatings); } catch {
                return res.status(400).json({ success: false, message: 'Invalid subjectRatings format.' });
            }
        }

        // Avg subject rating for AI
        let avgSubjectRating = null;
        if (parsedRatings.length > 0) {
            const sum = parsedRatings.reduce((acc, s) => acc + (Number(s.rating) || 3), 0);
            avgSubjectRating = Math.round((sum / parsedRatings.length) * 10) / 10;
        }

        // Consecutive high-risk count
        const recentEntries = db.prepare(`
            SELECT ai_risk_level FROM diary_entries
            WHERE student_id = ? ORDER BY created_at DESC LIMIT 4
        `).all(req.user.id);
        const consecutiveHighCount = recentEntries.filter(e =>
            ['high', 'critical'].includes(e.ai_risk_level)
        ).length;

        // Build text for AI
        const fullText = [reflection, challenges].filter(Boolean).join('\n\n');

        // Run AI analysis
        const aiAnalysis = await analyzeEntry(
            fullText,
            req.user.id,
            {
                attendancePercentage: attendance_pct !== null ? attendance_pct : undefined,
                attendanceExplanation: attendance_explanation,
                avgSubjectRating,
                emotionalRating: Number(mood || 3),
                subjectRatings: parsedRatings,
                weeklyDifficulty: weekly_difficulty ? Number(weekly_difficulty) : null,
            },
            consecutiveHighCount
        );

        let entryId;
        try {
            entryId = queries.createEntry({
                student_id: req.user.id,
                week_number: weekNum,
                academic_year: yr,
                semester: sem,
                start_date: start_date || null,
                end_date: end_date || null,
                mood: Number(mood || 3),
                weekly_difficulty: weekly_difficulty ? Number(weekly_difficulty) : null,
                attendance_pct,
                attendance_explanation: attendance_explanation || null,
                reflection: String(reflection).trim(),
                challenges: challenges || null,
                attachment_url: req.file ? `/uploads/${req.file.filename}` : null,
                ai_risk_score: aiAnalysis.riskScore,
                ai_sentiment: aiAnalysis.sentiment,
                ai_risk_level: aiAnalysis.riskLevel,
                ai_flags: JSON.stringify(aiAnalysis.keywords || []),
                ai_summary: aiAnalysis.summary || null,
                ai_key_concerns: JSON.stringify(aiAnalysis.keyConcerns || []),
                ai_confidence: aiAnalysis.confidence || 0.56,
                is_flagged: aiAnalysis.flagged ? 1 : 0,
                status: 'submitted',
            });
        } catch (err) {
            if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return res.status(409).json({
                    success: false,
                    message: 'An entry for this week already exists.',
                });
            }
            throw err;
        }

        // Insert subject ratings
        if (parsedRatings.length > 0) {
            queries.createSubjectRatings(entryId, parsedRatings);
        }

        const entry = queries.getEntryById(entryId);
        const subjectRatingRows = queries.getSubjectRatings(entryId);

        // Notify mentor
        if (entry && req.user.mentor_id) {
            notifyMentor(req.user.mentor_id, {
                _id: entryId,
                student: { name: req.user.name },
                aiAnalysis: { riskLevel: aiAnalysis.riskLevel },
            });
        }
        if (aiAnalysis.flagged && ['high', 'critical'].includes(aiAnalysis.riskLevel)) {
            notifyAdmins({
                _id: entryId,
                student: { name: req.user.name },
                aiAnalysis,
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Diary entry submitted successfully',
            data: { ...formatEntry(entry), subject_ratings: subjectRatingRows },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary
exports.getEntries = (req, res, next) => {
    try {
        const { status, is_flagged, semester, student_id, search, riskLevel } = req.query;
        const { page, limit, skip } = getPagination(req.query);

        const filters = {
            limit,
            offset: skip,
            ...(status ? { status } : {}),
            ...(is_flagged !== undefined ? { is_flagged: is_flagged === 'true' ? 1 : 0 } : {}),
            ...(semester !== undefined ? { semester: Number(semester) } : {}),
            ...(search ? { search: String(search) } : {}),
            ...(riskLevel ? { riskLevel: String(riskLevel) } : {}),
        };

        let entries;
        if (req.user.role === 'student') {
            entries = queries.getEntriesByStudent(req.user.id, filters);
        } else if (req.user.role === 'mentor') {
            if (student_id) {
                // Verify student belongs to this mentor
                const student = db.prepare('SELECT id, mentor_id FROM users WHERE id = ?').get(student_id);
                if (!student || student.mentor_id !== req.user.id) {
                    return res.status(403).json({ success: false, message: 'Access denied for this student.' });
                }
                filters.student_id = Number(student_id);
            }
            entries = queries.getEntriesForMentor(req.user.id, filters);
        } else if (req.user.role === 'admin') {
            if (student_id) filters.student_id = Number(student_id);
            entries = queries.getAllEntries(filters);
        } else {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const total = queries.countEntries(req.user.role, req.user.id, filters);

        return res.json({
            success: true,
            data: entries.map(formatEntry),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/:id
exports.getEntry = (req, res, next) => {
    try {
        const entry = queries.getEntryById(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (req.user.role === 'student' && entry.student_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (req.user.role === 'mentor') {
            const student = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(entry.student_id);
            if (!student || student.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const subjectRatingRows = queries.getSubjectRatings(entry.id);
        return res.json({
            success: true,
            data: { ...formatEntry(entry), subject_ratings: subjectRatingRows },
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/diary/:id
exports.updateEntry = async (req, res, next) => {
    try {
        const entry = queries.getEntryById(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (entry.student_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const { reflection, challenges, mood, weekly_difficulty, attendance_explanation, subjectRatings } = req.body;

        const updates = {};
        if (reflection !== undefined) updates.reflection = String(reflection).trim();
        if (challenges !== undefined) updates.challenges = challenges;
        if (mood !== undefined) updates.mood = Number(mood);
        if (weekly_difficulty !== undefined) updates.weekly_difficulty = Number(weekly_difficulty);
        if (attendance_explanation !== undefined) updates.attendance_explanation = attendance_explanation;
        if (req.file) updates.attachment_url = `/uploads/${req.file.filename}`;

        // Re-run AI if reflection changed
        if (reflection) {
            const fullText = [reflection, challenges || entry.challenges].filter(Boolean).join('\n\n');
            const recentEntries = db.prepare(`
                SELECT ai_risk_level FROM diary_entries
                WHERE student_id = ? AND id != ? ORDER BY created_at DESC LIMIT 4
            `).all(req.user.id, entry.id);
            const consecutiveHighCount = recentEntries.filter(e => ['high', 'critical'].includes(e.ai_risk_level)).length;
            const aiAnalysis = await analyzeEntry(fullText, req.user.id, {}, consecutiveHighCount);
            updates.ai_risk_score = aiAnalysis.riskScore;
            updates.ai_sentiment = aiAnalysis.sentiment;
            updates.ai_risk_level = aiAnalysis.riskLevel;
            updates.ai_flags = JSON.stringify(aiAnalysis.keywords || []);
            updates.ai_summary = aiAnalysis.summary || null;
            updates.ai_key_concerns = JSON.stringify(aiAnalysis.keyConcerns || []);
            updates.is_flagged = aiAnalysis.flagged ? 1 : 0;
        }

        queries.updateEntry(entry.id, updates);

        if (subjectRatings !== undefined) {
            queries.deleteSubjectRatings(entry.id);
            let parsedRatings = Array.isArray(subjectRatings) ? subjectRatings : JSON.parse(subjectRatings || '[]');
            if (parsedRatings.length > 0) queries.createSubjectRatings(entry.id, parsedRatings);
        }

        const updated = queries.getEntryById(entry.id);
        const subjectRatingRows = queries.getSubjectRatings(entry.id);
        return res.json({
            success: true,
            data: { ...formatEntry(updated), subject_ratings: subjectRatingRows },
        });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/diary/:id/response
exports.addMentorResponse = (req, res, next) => {
    try {
        const { response } = req.body;
        if (!response || response.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Response must be at least 10 characters.' });
        }

        const entry = queries.getEntryById(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (req.user.role === 'mentor') {
            const student = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(entry.student_id);
            if (!student || student.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'You are not assigned to this student.' });
            }
        }

        queries.updateEntry(entry.id, {
            mentor_response: response.trim(),
            mentor_responded_at: new Date().toISOString(),
            status: 'reviewed',
        });

        notifyStudent(entry.student_id, {
            _id: entry.id,
            mentor: { name: req.user.name },
        });

        const updated = queries.getEntryById(entry.id);
        return res.json({ success: true, message: 'Response added successfully', data: formatEntry(updated) });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/flagged
exports.getFlaggedEntries = (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filters = { is_flagged: 1, limit, offset: skip };

        let entries;
        if (req.user.role === 'mentor') {
            entries = queries.getEntriesForMentor(req.user.id, filters);
        } else {
            entries = queries.getAllEntries(filters);
        }

        const total = queries.countEntries(req.user.role, req.user.id, filters);

        return res.json({
            success: true,
            data: entries.map(formatEntry),
            count: entries.length,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/priority-queue
exports.getPriorityQueue = (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        // Fetch the full set unpaginated, then sort by priority — paginating in
        // SQL (ordered by created_at) first would leave the highest-priority
        // entries stranded on later pages, defeating the queue's whole purpose.
        let entries;
        if (req.user.role === 'mentor') {
            entries = queries.getEntriesForMentor(req.user.id, {});
        } else {
            entries = queries.getAllEntries({});
        }

        const total = entries.length;

        const getPriorityRank = (e) => {
            if (e.ai_risk_level === 'critical') return 1;
            if (e.ai_risk_level === 'high') return 2;
            if (e.status !== 'reviewed') return 3;
            return 4;
        };

        const getPriorityLabel = (rank) => (
            rank === 1 ? 'Critical risk'
                : rank === 2 ? 'High risk'
                    : rank === 3 ? 'Pending responses'
                        : 'Reviewed entries'
        );

        const sorted = entries
            .map(e => ({ ...formatEntry(e), priorityRank: getPriorityRank(e), priorityLabel: getPriorityLabel(getPriorityRank(e)) }))
            .sort((a, b) => {
                if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
                return new Date(b.created_at) - new Date(a.created_at);
            });

        const paged = sorted.slice(skip, skip + limit);

        return res.json({
            success: true,
            data: paged,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/student/:studentId/history
exports.getStudentRiskHistory = (req, res, next) => {
    try {
        const studentId = Number(req.params.studentId);
        if (req.user.role === 'mentor') {
            const student = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(studentId);
            if (!student || student.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const entries = db.prepare(`
            SELECT id, week_number, start_date, end_date, ai_risk_score, ai_sentiment, ai_risk_level, created_at
            FROM diary_entries WHERE student_id = ? ORDER BY week_number ASC LIMIT 16
        `).all(studentId);

        return res.json({ success: true, data: entries });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/:id/mentor-suggestion
exports.getMentorSuggestion = async (req, res, next) => {
    try {
        const entry = queries.getEntryById(req.params.id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (req.user.role === 'mentor') {
            const student = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(entry.student_id);
            if (!student || student.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const suggestion = await generateMentorSuggestion({
            content: entry.reflection,
            aiAnalysis: {
                summary: entry.ai_summary,
                sentiment: entry.ai_sentiment,
                riskLevel: entry.ai_risk_level,
                keyConcerns: safeJson(entry.ai_key_concerns, []),
            },
        });

        return res.json({ success: true, data: { ...suggestion, cached: false } });
    } catch (error) {
        next(error);
    }
};
