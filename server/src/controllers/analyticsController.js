const db = require('../database/db');
const queries = require('../database/queries');
const { generateWeeklyInsights } = require('../services/aiService');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

// GET /api/analytics/overview
exports.getOverview = (req, res, next) => {
    try {
        const yr = req.query.academic_year || currentAcademicYear();

        const totalStudents = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='student' AND is_active=1").get().n;
        const totalMentors  = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='mentor'  AND is_active=1").get().n;
        const totalEntries  = db.prepare('SELECT COUNT(*) as n FROM diary_entries WHERE academic_year = ?').get(yr).n;
        const flaggedEntries = db.prepare('SELECT COUNT(*) as n FROM diary_entries WHERE is_flagged=1 AND academic_year=?').get(yr).n;
        const pendingReviews = db.prepare("SELECT COUNT(*) as n FROM diary_entries WHERE status='submitted' AND academic_year=?").get(yr).n;
        const reviewedEntries = db.prepare("SELECT COUNT(*) as n FROM diary_entries WHERE status='reviewed' AND academic_year=?").get(yr).n;

        const sentimentBreakdown = db.prepare(`
            SELECT ai_sentiment as _id, COUNT(*) as count FROM diary_entries
            WHERE academic_year = ? GROUP BY ai_sentiment
        `).all(yr);

        const riskBreakdown = db.prepare(`
            SELECT ai_risk_level as _id, COUNT(*) as count FROM diary_entries
            WHERE academic_year = ? GROUP BY ai_risk_level
        `).all(yr);

        return res.json({
            success: true,
            data: {
                totalStudents, totalMentors, totalEntries,
                flaggedEntries, pendingReviews, reviewedEntries,
                reviewRate: totalEntries > 0 ? Math.round((reviewedEntries / totalEntries) * 100) : 0,
                sentimentBreakdown,
                riskBreakdown,
            },
        });
    } catch (error) { next(error); }
};

// GET /api/analytics/sentiment-distribution
exports.getSentimentDistribution = (req, res, next) => {
    try {
        const data = db.prepare(`
            SELECT ai_sentiment as _id, COUNT(*) as count
            FROM diary_entries GROUP BY ai_sentiment ORDER BY count DESC
        `).all();
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/risk-distribution
exports.getRiskDistribution = (req, res, next) => {
    try {
        const yr = req.query.academic_year || currentAcademicYear();
        const data = db.prepare(`
            SELECT
                SUM(CASE WHEN ai_risk_score < 30 THEN 1 ELSE 0 END)              as low,
                SUM(CASE WHEN ai_risk_score >= 30 AND ai_risk_score < 60 THEN 1 ELSE 0 END) as medium,
                SUM(CASE WHEN ai_risk_score >= 60 AND ai_risk_score < 80 THEN 1 ELSE 0 END) as high,
                SUM(CASE WHEN ai_risk_score >= 80 THEN 1 ELSE 0 END)             as critical
            FROM diary_entries WHERE academic_year = ?
        `).get(yr);
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/entry-trends
exports.getEntryTrends = (req, res, next) => {
    try {
        const data = db.prepare(`
            SELECT week_number, COUNT(*) as count,
                   AVG(ai_risk_score) as avg_risk,
                   SUM(is_flagged) as flagged_count
            FROM diary_entries
            GROUP BY week_number
            ORDER BY week_number ASC
            LIMIT 24
        `).all();
        return res.json({ success: true, data, period: 'weekly' });
    } catch (error) { next(error); }
};

// GET /api/analytics/mentor-efficiency
exports.getMentorEfficiency = (req, res, next) => {
    try {
        const data = db.prepare(`
            SELECT
                u.id as mentor_id,
                u.name as mentor_name,
                COUNT(DISTINCT s.id) as total_students,
                COUNT(de.id) as total_entries,
                SUM(CASE WHEN de.status='reviewed' THEN 1 ELSE 0 END) as reviewed,
                ROUND(AVG(
                    CASE WHEN de.mentor_responded_at IS NOT NULL
                    THEN (julianday(de.mentor_responded_at) - julianday(de.created_at))
                    ELSE NULL END
                ), 2) as avg_response_days
            FROM users u
            LEFT JOIN users s ON s.mentor_id = u.id AND s.role='student'
            LEFT JOIN diary_entries de ON de.student_id = s.id
            WHERE u.role = 'mentor' AND u.is_active = 1
            GROUP BY u.id
            ORDER BY reviewed DESC
        `).all();
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/student-risk-history
exports.getStudentRiskHistory = (req, res, next) => {
    try {
        const { studentId, semester, academic_year } = req.query;
        const resolvedStudentId = req.user.role === 'student' ? req.user.id : Number(studentId);

        if (!resolvedStudentId) {
            return res.status(400).json({ success: false, message: 'studentId is required.' });
        }

        if (req.user.role === 'mentor') {
            const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(resolvedStudentId);
            if (!s || s.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const yr = academic_year || currentAcademicYear();
        const sem = semester ? Number(semester) : null;

        const data = queries.getRiskHistory(resolvedStudentId, sem, yr);
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/student-weekly-insight
exports.getStudentWeeklyInsight = async (req, res, next) => {
    try {
        const { studentId, week_number, semester, academic_year } = req.query;
        const resolvedStudentId = req.user.role === 'student' ? req.user.id : Number(studentId);
        const yr = academic_year || currentAcademicYear();
        const sem = Number(semester || req.user.current_semester || 4);
        const weekNum = Number(week_number || 1);

        if (!resolvedStudentId) {
            return res.status(400).json({ success: false, message: 'studentId is required.' });
        }

        const existing = queries.getLatestInsight(resolvedStudentId, weekNum, yr, sem);
        if (existing) {
            return res.json({ success: true, data: { ...existing, cached: true } });
        }

        // Generate via AI
        const entries = db.prepare(`
            SELECT ai_risk_score, ai_sentiment, ai_risk_level, ai_summary, created_at
            FROM diary_entries WHERE student_id = ? AND semester = ? AND academic_year = ?
            ORDER BY week_number DESC LIMIT 6
        `).all(resolvedStudentId, sem, yr).reverse();

        const insights = await generateWeeklyInsights(entries.map(e => ({
            createdAt: e.created_at,
            aiAnalysis: {
                sentiment: e.ai_sentiment,
                riskLevel: e.ai_risk_level,
                riskScore: e.ai_risk_score,
                summary: e.ai_summary,
            },
        })));

        queries.upsertInsight({
            student_id: resolvedStudentId,
            week_number: weekNum,
            academic_year: yr,
            semester: sem,
            positive: insights.insightParagraph,
            warning: insights.riskTrend,
            suggestion: insights.engagementLevel,
        });

        return res.json({ success: true, data: { ...insights, cached: false } });
    } catch (error) { next(error); }
};

// GET /api/analytics/student-overview
exports.getStudentOverview = (req, res, next) => {
    try {
        const resolvedStudentId = req.user.role === 'student' ? req.user.id : Number(req.query.studentId);
        if (!resolvedStudentId) {
            return res.status(400).json({ success: false, message: 'studentId required.' });
        }

        if (req.user.role === 'mentor') {
            const s = db.prepare('SELECT mentor_id FROM users WHERE id = ?').get(resolvedStudentId);
            if (!s || s.mentor_id !== req.user.id) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }

        const entriesSubmitted = db.prepare('SELECT COUNT(*) as n FROM diary_entries WHERE student_id = ?').get(resolvedStudentId).n;
        const achievementsCount = db.prepare('SELECT COUNT(*) as n FROM achievements WHERE student_id = ?').get(resolvedStudentId).n;
        const pendingMentorResponses = db.prepare("SELECT COUNT(*) as n FROM diary_entries WHERE student_id = ? AND status='submitted'").get(resolvedStudentId).n;
        const latestEntry = db.prepare('SELECT * FROM diary_entries WHERE student_id = ? ORDER BY created_at DESC LIMIT 1').get(resolvedStudentId);

        const growthScore = Math.round(entriesSubmitted * 2 + achievementsCount * 1.5);

        return res.json({
            success: true,
            data: {
                pendingMentorResponses,
                latestSentimentResult: latestEntry?.ai_sentiment || null,
                currentRiskScore: latestEntry?.ai_risk_score ?? null,
                entriesSubmitted,
                achievementsCount,
                growthScore,
            },
        });
    } catch (error) { next(error); }
};

// GET /api/analytics/portfolio
exports.getPortfolio = (req, res, next) => {
    try {
        const studentId = req.user.id;
        const entries = db.prepare(`
            SELECT id, week_number, mood, ai_risk_score, ai_sentiment, ai_risk_level,
                   reflection, status, mentor_response, created_at
            FROM diary_entries WHERE student_id = ? ORDER BY created_at ASC
        `).all(studentId);

        if (entries.length === 0) {
            return res.json({
                success: true,
                data: {
                    summary: { totalEntries: 0, averageRiskScore: 0, currentStreak: 0, entriesThisMonth: 0, academicYear: currentAcademicYear() },
                    riskTrend: [],
                    subjectPerformance: [],
                    recentEntries: [],
                    aiSummary: 'No entries submitted yet.',
                },
            });
        }

        const totalEntries = entries.length;
        const scores = entries.map(e => e.ai_risk_score ?? 0).filter(s => s > 0);
        const averageRiskScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        const sentimentToScore = s => s === 'positive' ? 80 : s === 'negative' ? 20 : 50;
        const riskTrend = entries.map((e, idx) => ({
            week: e.week_number || idx + 1,
            weekLabel: `Wk ${e.week_number || idx + 1}`,
            riskScore: e.ai_risk_score ?? 0,
            sentimentScore: sentimentToScore(e.ai_sentiment),
        }));

        const subjectPerformance = queries.getSubjectPerformance(studentId, null, currentAcademicYear());

        const recentEntries = entries.slice(-6).reverse().map(e => ({
            id: e.id,
            week: e.week_number,
            mood: e.mood,
            riskScore: e.ai_risk_score ?? 0,
            riskLevel: e.ai_risk_level ?? 'low',
            reflection: e.reflection || '',
            createdAt: e.created_at,
            reviewStatus: e.status || 'submitted',
            mentorComment: e.mentor_response || null,
        }));

        return res.json({
            success: true,
            data: {
                summary: { totalEntries, averageRiskScore, currentStreak: 0, entriesThisMonth: 0, academicYear: currentAcademicYear() },
                riskTrend,
                subjectPerformance,
                recentEntries,
                aiSummary: `You have submitted ${totalEntries} entries this semester.`,
            },
        });
    } catch (error) { next(error); }
};

// CSV export stubs (keep existing exportService pattern)
exports.exportCSV = async (req, res, next) => {
    try {
        const { streamAnalyticsCSV } = require('../services/exportService');
        await streamAnalyticsCSV(res, req.query.startDate, req.query.endDate);
    } catch (error) { next(error); }
};

exports.exportFlaggedCSV = async (req, res, next) => {
    try {
        const { streamFlaggedEntriesCSV } = require('../services/exportService');
        await streamFlaggedEntriesCSV(res);
    } catch (error) { next(error); }
};
