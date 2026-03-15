const DiaryEntry = require('../models/DiaryEntry');
const User = require('../models/User');
const { analyzeEntry, generateMentorSuggestion } = require('../services/aiService');
const { notifyMentor, notifyStudent, notifyAdmins } = require('../socket');
const { getAssignedStudentIds, canAccessStudentData, idsEqual } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');
const { buildSafeSearchRegex } = require('../utils/query');

// GET /api/diary/check-range?startDate=&endDate= - Check overlap before submit
exports.checkRange = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'startDate and endDate are required.' });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ success: false, message: 'Invalid date format.' });
        }
        if (end <= start) {
            return res.status(400).json({ success: false, message: 'endDate must be after startDate.' });
        }
        const diffDays = (end - start) / 86400000;
        if (diffDays > 7) {
            return res.json({ success: true, overlap: false, rangeError: true, message: 'Date range must not exceed 7 days.' });
        }
        const overlap = await DiaryEntry.findOne({
            student: req.user._id,
            startDate: { $lte: end },
            endDate: { $gte: start },
        }).select('_id startDate endDate');
        return res.json({
            success: true,
            overlap: !!overlap,
            rangeError: false,
            message: overlap ? 'An entry already exists overlapping this date range.' : 'Date range is available.',
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/diary - Create new entry (Section A–E + date range)
exports.createEntry = async (req, res, next) => {
    try {
        const {
            startDate, endDate, week,
            academicYear, semester,
            content,
            subjectRatings,
            problemsFaced,
            attendancePercentage, attendanceExplanation,
            emotionalRating,
            academicPerformance, challenges, goals, mood, subjectsOfConcern,
        } = req.body;

        // ── Date range validation ──────────────────────────────────
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (end <= start) {
                return res.status(400).json({ success: false, message: 'endDate must be after startDate.' });
            }
            const diffDays = (end - start) / 86400000;
            if (diffDays > 7) {
                return res.status(400).json({ success: false, message: 'Date range must not exceed 7 days.' });
            }
            // Check for overlapping entries
            const overlap = await DiaryEntry.findOne({
                student: req.user._id,
                startDate: { $lte: end },
                endDate: { $gte: start },
            }).select('_id startDate endDate');
            if (overlap) {
                return res.status(409).json({
                    success: false,
                    message: `An entry already exists overlapping this date range.`,
                });
            }
        }

        // ── Attendance explanation check ───────────────────────────
        if (attendancePercentage !== undefined && Number(attendancePercentage) < 75 && !attendanceExplanation) {
            return res.status(400).json({
                success: false,
                message: 'Attendance explanation is required when attendance is below 75%.',
            });
        }

        // ── Compute avgSubjectRating for AI ───────────────────────
        let avgSubjectRating = null;
        const parsedRatings = Array.isArray(subjectRatings)
            ? subjectRatings
            : (subjectRatings ? (() => { try { return JSON.parse(subjectRatings); } catch { return []; } })() : []);

        if (parsedRatings.length > 0) {
            const sum = parsedRatings.reduce((acc, s) => acc + (Number(s.rating) || 3), 0);
            avgSubjectRating = Math.round((sum / parsedRatings.length) * 10) / 10;
        }

        // ── Consecutive high-risk count ────────────────────────────
        const recentRisk = await DiaryEntry.find({ student: req.user._id })
            .sort({ createdAt: -1 })
            .limit(4)
            .select('aiAnalysis.riskLevel');
        const consecutiveHighCount = recentRisk.filter(
            e => ['high', 'critical'].includes(e.aiAnalysis?.riskLevel)
        ).length;

        // ── Build full text for AI analysis ───────────────────────
        const problemText = problemsFaced
            ? [problemsFaced.academic, problemsFaced.personal, problemsFaced.other].filter(Boolean).join(' ')
            : [challenges, academicPerformance].filter(Boolean).join(' ');
        const fullText = [content, problemText, goals].filter(Boolean).join('\n\n');

        // ── Run AI analysis (multi-factor) ────────────────────────
        const parsedProblems = problemsFaced && typeof problemsFaced === 'object'
            ? problemsFaced
            : (() => { try { return JSON.parse(problemsFaced || '{}'); } catch { return {}; } })();

        const aiAnalysis = await analyzeEntry(
            fullText,
            req.user._id,
            {
                attendancePercentage: attendancePercentage !== undefined ? Number(attendancePercentage) : undefined,
                attendanceExplanation,
                avgSubjectRating,
                emotionalRating: Number(emotionalRating || mood || 3),
                academicPerformance: String(academicPerformance || ''),
                problemsFaced: parsedProblems,
            },
            consecutiveHighCount
        );

        // ── Student's assigned mentor ─────────────────────────────
        const studentData = await User.findById(req.user._id).populate('assignedMentor');

        // ── Subjects of concern = subjects rated ≤ 2 ─────────────
        const autoSubjectsOfConcern = parsedRatings
            .filter(s => Number(s.rating) <= 2)
            .map(s => s.name);

        const entry = await DiaryEntry.create({
            student: req.user._id,
            mentor: studentData?.assignedMentor?._id || null,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            week: week ? Number(week) : undefined,
            academicYear: academicYear || '2024-25',
            semester: semester ? Number(semester) : undefined,
            // Section A
            content,
            // Section B
            subjectRatings: parsedRatings,
            // Section C
            problemsFaced: problemsFaced || {
                academic: challenges || '',
                personal: '',
                other: '',
            },
            // Section D
            attendancePercentage: attendancePercentage !== undefined ? Number(attendancePercentage) : undefined,
            attendanceExplanation: attendanceExplanation || '',
            // Section E
            emotionalRating: Number(emotionalRating || mood || 3),
            // Legacy compat fields
            academicPerformance: academicPerformance || '',
            challenges: challenges || '',
            goals: goals || '',
            mood: Number(mood || emotionalRating || 3),
            subjectsOfConcern: subjectsOfConcern || autoSubjectsOfConcern,
            // AI + file
            aiAnalysis,
            attachmentUrl: req.file ? `/uploads/${req.file.filename}` : '',
            attachmentName: req.file ? req.file.originalname : '',
        });

        await entry.populate('student', 'name email department batch');
        await entry.populate('mentor', 'name email');

        // ── Notifications ─────────────────────────────────────────
        if (studentData?.assignedMentor?._id) {
            notifyMentor(studentData.assignedMentor._id, entry);
        }
        if (aiAnalysis.flagged && ['high', 'critical'].includes(aiAnalysis.riskLevel)) {
            notifyAdmins(entry);
        }

        res.status(201).json({ success: true, message: 'Diary entry submitted successfully', data: entry });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An entry for this date range already exists.',
            });
        }
        next(error);
    }
};

// GET /api/diary - Get entries (role-filtered, with search/filter/sort/pagination)
exports.getEntries = async (req, res, next) => {
    try {
        const { search, sentiment, riskLevel, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc', studentId, mentorId } = req.query;

        const query = {};
        const { page, limit, skip } = getPagination(req.query);

        // Role-based filtering
        if (req.user.role === 'student') {
            query.student = req.user._id;
        } else if (req.user.role === 'mentor') {
            const assignedStudentIds = await getAssignedStudentIds(req.user._id);
            if (assignedStudentIds.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page, limit, pages: 0 },
                });
            }

            if (studentId) {
                const allowed = assignedStudentIds.some((id) => idsEqual(id, studentId));
                if (!allowed) {
                    return res.status(403).json({ success: false, message: 'Access denied for this student.' });
                }
                query.student = studentId;
            } else {
                query.student = { $in: assignedStudentIds };
            }
        } else if (req.user.role === 'admin') {
            if (studentId) query.student = studentId;
            if (mentorId) query.mentor = mentorId;
        }

        // Filters
        if (sentiment) query['aiAnalysis.sentiment'] = sentiment;
        if (riskLevel) query['aiAnalysis.riskLevel'] = riskLevel;
        if (status) query.status = status;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Text search
        const safeSearch = buildSafeSearchRegex(search);
        if (safeSearch) {
            query.$or = [
                { content: safeSearch },
                { academicPerformance: safeSearch },
                { challenges: safeSearch },
                { goals: safeSearch },
            ];
        }

        const allowedSortFields = new Set(['createdAt', 'startDate', 'endDate', 'status', 'aiAnalysis.riskScore', 'aiAnalysis.sentimentScore']);
        const safeSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
        const sort = { [safeSortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [entries, total] = await Promise.all([
            DiaryEntry.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate('student', 'name email department batch rollNumber')
                .populate('mentor', 'name email'),
            DiaryEntry.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: entries,
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

// GET /api/diary/:id - Get single entry
exports.getEntry = async (req, res, next) => {
    try {
        const entry = await DiaryEntry.findById(req.params.id)
            .populate('student', 'name email department batch rollNumber')
            .populate('mentor', 'name email department');

        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        const studentId = entry.student?._id || entry.student;
        if (req.user.role === 'student' && !idsEqual(studentId, req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        if (req.user.role === 'mentor') {
            const allowed = await canAccessStudentData(req.user, studentId);
            if (!allowed) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        res.json({ success: true, data: entry });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/diary/:id/response - Mentor adds response
exports.addMentorResponse = async (req, res, next) => {
    try {
        const { response } = req.body;
        if (!response || response.trim().length < 10) {
            return res.status(400).json({ success: false, message: 'Response must be at least 10 characters.' });
        }

        const entry = await DiaryEntry.findById(req.params.id)
            .populate('student', 'name email')
            .populate('mentor', 'name email');

        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (req.user.role === 'mentor') {
            const studentId = entry.student?._id || entry.student;
            const allowed = await canAccessStudentData(req.user, studentId);
            if (!allowed) {
                return res.status(403).json({ success: false, message: 'You are not assigned to this student.' });
            }
        }

        entry.mentorResponse = response;
        entry.mentorRespondedAt = new Date();
        entry.status = 'reviewed';
        entry.mentor = req.user._id;
        await entry.save();

        await entry.populate('student', 'name email department batch');
        await entry.populate('mentor', 'name email');

        notifyStudent(entry.student._id, entry);

        res.json({ success: true, message: 'Response added successfully', data: entry });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/flagged - Get flagged/high-risk entries
exports.getFlaggedEntries = async (req, res, next) => {
    try {
        const query = { 'aiAnalysis.flagged': true };
        const { page, limit, skip } = getPagination(req.query);
        if (req.user.role === 'mentor') {
            const assignedStudentIds = await getAssignedStudentIds(req.user._id);
            if (assignedStudentIds.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    count: 0,
                    pagination: { total: 0, page, limit, pages: 0 },
                });
            }
            query.student = { $in: assignedStudentIds };
        }

        const [entries, total] = await Promise.all([
            DiaryEntry.find(query)
                .sort({ 'aiAnalysis.riskScore': -1 })
                .skip(skip)
                .limit(limit)
                .populate('student', 'name email department batch rollNumber')
                .populate('mentor', 'name email'),
            DiaryEntry.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: entries,
            count: entries.length,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/priority-queue - Mentor/admin triage list
exports.getPriorityQueue = async (req, res, next) => {
    try {
        const query = {};
        const { page, limit, skip } = getPagination(req.query);

        if (req.user.role === 'mentor') {
            const assignedStudentIds = await getAssignedStudentIds(req.user._id);
            if (assignedStudentIds.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    pagination: { total: 0, page, limit, pages: 0 },
                });
            }
            query.student = { $in: assignedStudentIds };
        }

        const [entries, total] = await Promise.all([
            DiaryEntry.find(query)
                .populate('student', 'name email department batch rollNumber')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }),
            DiaryEntry.countDocuments(query),
        ]);

        const getPriorityRank = (entry) => {
            if (entry.aiAnalysis?.riskLevel === 'critical') return 1;
            if (entry.aiAnalysis?.riskLevel === 'high') return 2;
            if (entry.status !== 'reviewed') return 3;
            return 4;
        };

        const getPriorityLabel = (rank) => (
            rank === 1 ? 'Critical risk'
                : rank === 2 ? 'High risk'
                    : rank === 3 ? 'Pending responses'
                        : 'Reviewed entries'
        );

        const sorted = entries
            .map((entry) => {
                const priorityRank = getPriorityRank(entry);
                return {
                    ...entry,
                    priorityRank,
                    priorityLabel: getPriorityLabel(priorityRank),
                };
            })
            .sort((a, b) => {
                if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

        res.json({
            success: true,
            data: sorted,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/student/:studentId/history - Risk history for charts
exports.getStudentRiskHistory = async (req, res, next) => {
    try {
        const allowed = await canAccessStudentData(req.user, req.params.studentId);
        if (!allowed) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const entries = await DiaryEntry.find({ student: req.params.studentId })
            .select('startDate endDate week createdAt aiAnalysis.riskScore aiAnalysis.sentiment aiAnalysis.riskLevel aiAnalysis.riskFactors')
            .sort({ createdAt: 1 })
            .limit(16);

        res.json({ success: true, data: entries });
    } catch (error) {
        next(error);
    }
};

// GET /api/diary/:id/mentor-suggestion - AI mentor response draft
exports.getMentorSuggestion = async (req, res, next) => {
    try {
        const entry = await DiaryEntry.findById(req.params.id)
            .populate('student', 'name email department batch rollNumber')
            .populate('mentor', 'name email department');

        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        if (req.user.role === 'mentor') {
            const studentId = entry.student?._id || entry.student;
            const allowed = await canAccessStudentData(req.user, studentId);
            if (!allowed) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const existing = entry.aiAnalysis?.mentorSuggestion;
        if (existing?.generatedAt) {
            return res.json({
                success: true,
                data: {
                    supportiveResponse: existing.supportiveResponse,
                    suggestedGuidance: existing.suggestedGuidance || [],
                    confidence: existing.confidence ?? 0.6,
                    promptVersion: existing.promptVersion || 'v1',
                    cached: true,
                    generatedAt: existing.generatedAt,
                },
            });
        }

        const suggestion = await generateMentorSuggestion(entry);
        entry.aiAnalysis = entry.aiAnalysis || {};
        entry.aiAnalysis.mentorSuggestion = {
            supportiveResponse: suggestion.supportiveResponse,
            suggestedGuidance: suggestion.suggestedGuidance || [],
            confidence: suggestion.confidence ?? 0.6,
            promptVersion: suggestion.promptVersion || 'v1',
            generatedAt: new Date(),
        };
        await entry.save();

        return res.json({
            success: true,
            data: {
                ...suggestion,
                cached: false,
                generatedAt: entry.aiAnalysis.mentorSuggestion.generatedAt,
            },
        });
    } catch (error) {
        next(error);
    }
};
