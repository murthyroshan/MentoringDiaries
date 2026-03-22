const DiaryEntry = require('../models/DiaryEntry');
const User = require('../models/User');
const mongoose = require('mongoose');
const SkillProgress = require('../models/SkillProgress');
const Event = require('../models/Event');
const AcademicRecord = require('../models/AcademicRecord');
const StudentWeeklyInsight = require('../models/StudentWeeklyInsight');
const { generateWeeklyInsights } = require('../services/aiService');
const { streamAnalyticsCSV, streamFlaggedEntriesCSV } = require('../services/exportService');
const { canAccessStudentData } = require('../utils/accessControl');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

// GET /api/analytics/overview
exports.getOverview = async (req, res, next) => {
    try {
        const [
            totalStudents, totalMentors, totalEntries,
            flaggedEntries, pendingReviews, reviewedEntries
        ] = await Promise.all([
            User.countDocuments({ role: 'student', isActive: true }),
            User.countDocuments({ role: 'mentor', isActive: true }),
            DiaryEntry.countDocuments(),
            DiaryEntry.countDocuments({ 'aiAnalysis.flagged': true }),
            DiaryEntry.countDocuments({ status: 'submitted' }),
            DiaryEntry.countDocuments({ status: 'reviewed' }),
        ]);

        const sentimentAgg = await DiaryEntry.aggregate([
            { $group: { _id: '$aiAnalysis.sentiment', count: { $sum: 1 } } }
        ]);

        const riskAgg = await DiaryEntry.aggregate([
            { $group: { _id: '$aiAnalysis.riskLevel', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            data: {
                totalStudents, totalMentors, totalEntries,
                flaggedEntries, pendingReviews, reviewedEntries,
                reviewRate: totalEntries > 0 ? Math.round((reviewedEntries / totalEntries) * 100) : 0,
                sentimentBreakdown: sentimentAgg,
                riskBreakdown: riskAgg,
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/sentiment-distribution
exports.getSentimentDistribution = async (req, res, next) => {
    try {
        const data = await DiaryEntry.aggregate([
            { $group: { _id: '$aiAnalysis.sentiment', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/risk-distribution
exports.getRiskDistribution = async (req, res, next) => {
    try {
        const data = await DiaryEntry.aggregate([
            { $group: { _id: '$aiAnalysis.riskLevel', count: { $sum: 1 }, avgScore: { $avg: '$aiAnalysis.riskScore' } } },
            { $sort: { avgScore: -1 } }
        ]);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// GET /api/analytics/entry-trends?period=weekly|monthly
exports.getEntryTrends = async (req, res, next) => {
    try {
        const { period = 'weekly' } = req.query;
        const dateFormat = period === 'monthly' ? '%Y-%m' : '%Y-W%V';
        const groupFormat = period === 'monthly'
            ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
            : { year: { $year: '$createdAt' }, week: { $isoWeek: '$createdAt' } };

        const data = await DiaryEntry.aggregate([
            {
                $group: {
                    _id: groupFormat,
                    count: { $sum: 1 },
                    avgRisk: { $avg: '$aiAnalysis.riskScore' },
                    flaggedCount: { $sum: { $cond: ['$aiAnalysis.flagged', 1, 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
            { $limit: 24 }
        ]);

        res.json({ success: true, data, period });
    } catch (error) { next(error); }
};

// GET /api/analytics/intervention-response-time
exports.getInterventionResponseTime = async (req, res, next) => {
    try {
        const data = await DiaryEntry.aggregate([
            {
                $match: {
                    mentorRespondedAt: { $ne: null },
                    mentor: { $ne: null }
                }
            },
            {
                $addFields: {
                    responseTimeMs: {
                        $subtract: ['$mentorRespondedAt', '$createdAt']
                    }
                }
            },
            {
                $group: {
                    _id: '$mentor',
                    avgResponseHours: { $avg: { $divide: ['$responseTimeMs', 3600000] } },
                    minResponseHours: { $min: { $divide: ['$responseTimeMs', 3600000] } },
                    maxResponseHours: { $max: { $divide: ['$responseTimeMs', 3600000] } },
                    responseCount: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'mentor'
                }
            },
            { $unwind: '$mentor' },
            {
                $project: {
                    mentorName: '$mentor.name',
                    mentorEmail: '$mentor.email',
                    avgResponseHours: { $round: ['$avgResponseHours', 1] },
                    minResponseHours: { $round: ['$minResponseHours', 1] },
                    maxResponseHours: { $round: ['$maxResponseHours', 1] },
                    responseCount: 1
                }
            },
            { $sort: { avgResponseHours: 1 } }
        ]);

        // Overall platform average
        const overall = await DiaryEntry.aggregate([
            { $match: { mentorRespondedAt: { $ne: null } } },
            {
                $group: {
                    _id: null,
                    avgHours: { $avg: { $divide: [{ $subtract: ['$mentorRespondedAt', '$createdAt'] }, 3600000] } }
                }
            }
        ]);

        res.json({
            success: true,
            data,
            overallAvgHours: overall[0]?.avgHours ? Math.round(overall[0].avgHours * 10) / 10 : null
        });
    } catch (error) { next(error); }
};

// GET /api/analytics/mentor-efficiency
exports.getMentorEfficiency = async (req, res, next) => {
    try {
        const data = await DiaryEntry.aggregate([
            { $match: { mentor: { $ne: null } } },
            {
                $group: {
                    _id: '$mentor',
                    totalAssigned: { $sum: 1 },
                    reviewed: { $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] } },
                    flaggedHandled: { $sum: { $cond: [{ $and: ['$aiAnalysis.flagged', { $ne: ['$status', 'submitted'] }] }, 1, 0] } },
                }
            },
            {
                $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'mentor' }
            },
            { $unwind: '$mentor' },
            {
                $project: {
                    mentorName: '$mentor.name',
                    totalAssigned: 1,
                    reviewed: 1,
                    pendingCount: { $subtract: ['$totalAssigned', '$reviewed'] },
                    reviewRate: { $round: [{ $multiply: [{ $divide: ['$reviewed', '$totalAssigned'] }, 100] }, 1] },
                    flaggedHandled: 1
                }
            },
            { $sort: { reviewRate: -1 } }
        ]);
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function startOfIsoWeek(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfIsoWeek(date = new Date()) {
    const start = startOfIsoWeek(date);
    return endOfDay(addDays(start, 6));
}

async function resolveStudentScope(req) {
    if (req.user.role === 'student') return req.user._id;

    const studentId = req.query.studentId;
    if (!studentId) return null;

    if (req.user.role === 'admin') return studentId;

    const allowed = await canAccessStudentData(req.user, studentId);
    return allowed ? studentId : null;
}

// Compute ISO week number for a date
function isoWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return { week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7), year: d.getUTCFullYear() };
}

// Count consecutive submitted weeks (streak)
function computeStreak(weekSet) {
    let streak = 0;
    const now = new Date();
    const { week: curWeek, year: curYear } = isoWeekNumber(now);
    let w = curWeek, y = curYear;
    for (let i = 0; i < 52; i++) {
        if (weekSet.has(`${y}-${w}`)) {
            streak++;
        } else if (i > 0) {
            break; // gap — streak ends
        }
        // Also accept if current week has no entry yet (grace: start from last week)
        w--;
        if (w === 0) { y--; w = 52; }
    }
    return streak;
}

// GET /api/analytics/student-overview
exports.getStudentOverview = async (req, res, next) => {
    try {
        const studentId = await resolveStudentScope(req);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Valid studentId is required for mentor/admin access.' });
        }

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [entriesSubmitted, skillsAdded, eventsParticipated, latestEntry, entriesThisMonth] = await Promise.all([
            DiaryEntry.countDocuments({ student: studentId }),
            SkillProgress.countDocuments({ student: studentId }),
            Event.countDocuments({ student: studentId }),
            DiaryEntry.findOne({ student: studentId }).sort({ createdAt: -1 }).lean(),
            DiaryEntry.countDocuments({ student: studentId, createdAt: { $gte: monthStart } }),
        ]);

        const pendingMentorResponses = await DiaryEntry.countDocuments({
            student: studentId,
            status: 'submitted',
        });

        // Compute streak from weekly submission history
        const weekBuckets = await DiaryEntry.aggregate([
            { $match: { student: new mongoose.Types.ObjectId(studentId) } },
            { $group: { _id: { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } } } },
        ]);
        const weekSet = new Set(weekBuckets.map(b => `${b._id.year}-${b._id.week}`));
        const streak = computeStreak(weekSet);

        // Last 7 ISO weeks for activity dots (true = submitted)
        const { week: curWeek, year: curYear } = isoWeekNumber(now);
        const weeklyActivity = [];
        for (let i = 6; i >= 0; i--) {
            let w = curWeek - i, y = curYear;
            if (w <= 0) { y--; w += 52; }
            weeklyActivity.push(weekSet.has(`${y}-${w}`));
        }

        const nextDiarySubmissionDeadline = latestEntry
            ? addDays(latestEntry.endDate || latestEntry.createdAt, 7)
            : addDays(new Date(), 7);

        const growthScore = Math.round((entriesSubmitted * 2) + (skillsAdded * 1.5) + (eventsParticipated * 1));

        return res.json({
            success: true,
            data: {
                pendingMentorResponses,
                latestSentimentResult: latestEntry?.aiAnalysis?.sentiment || null,
                currentRiskScore: latestEntry?.aiAnalysis?.riskScore ?? null,
                nextDiarySubmissionDeadline,
                entriesSubmitted,
                entriesThisMonth,
                streak,
                weeklyActivity,
                skillsAdded,
                eventsParticipated,
                growthScore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/student-growth
exports.getStudentGrowth = async (req, res, next) => {
    try {
        const studentId = await resolveStudentScope(req);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Valid studentId is required for mentor/admin access.' });
        }
        const scopedStudentId = new mongoose.Types.ObjectId(studentId);

        const consistencyRaw = await DiaryEntry.aggregate([
            { $match: { student: scopedStudentId } },
            {
                $group: {
                    _id: {
                        year: { $isoWeekYear: '$createdAt' },
                        week: { $isoWeek: '$createdAt' },
                    },
                    submissions: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': -1, '_id.week': -1 } },
            { $limit: 8 },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
        ]);

        const skillProgression = await SkillProgress.aggregate([
            { $match: { student: scopedStudentId } },
            {
                $group: {
                    _id: '$skillCategory',
                    avgBefore: { $avg: '$ratingBefore' },
                    avgAfter: { $avg: '$ratingAfter' },
                    totalImprovement: { $sum: { $subtract: ['$ratingAfter', '$ratingBefore'] } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { totalImprovement: -1 } },
        ]);

        const academicPerformance = await AcademicRecord.find({ student: studentId })
            .sort({ createdAt: 1 })
            .select('semester examType overallPercentage finalCgpa createdAt')
            .lean();

        return res.json({
            success: true,
            data: {
                diarySubmissionConsistency: consistencyRaw.map((item) => ({
                    label: `${item._id.year}-W${String(item._id.week).padStart(2, '0')}`,
                    submissions: item.submissions,
                })),
                skillProgression: skillProgression.map((item) => ({
                    category: item._id || 'Other',
                    avgBefore: Math.round((item.avgBefore || 0) * 10) / 10,
                    avgAfter: Math.round((item.avgAfter || 0) * 10) / 10,
                    totalImprovement: Math.round((item.totalImprovement || 0) * 10) / 10,
                    count: item.count,
                })),
                academicPerformanceTrend: academicPerformance.map((item) => ({
                    label: `Sem ${item.semester} ${item.examType.toUpperCase()}`,
                    overallPercentage: item.overallPercentage || 0,
                    finalCgpa: item.finalCgpa || null,
                    createdAt: item.createdAt,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/student-weekly-insights
exports.getStudentWeeklyInsights = async (req, res, next) => {
    try {
        const studentId = await resolveStudentScope(req);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Valid studentId is required for mentor/admin access.' });
        }

        const weekStart = startOfIsoWeek();
        const weekEnd = endOfIsoWeek();
        const existing = await StudentWeeklyInsight.findOne({
            student: studentId,
            weekStart,
            weekEnd,
        }).sort({ generatedAt: -1 }).lean();
        if (existing) {
            return res.json({
                success: true,
                data: {
                    sentimentTrend: existing.sentimentTrend,
                    engagementLevel: existing.engagementLevel,
                    riskTrend: existing.riskTrend,
                    insightParagraph: existing.insightParagraph,
                    confidence: existing.confidence,
                    promptVersion: existing.promptVersion,
                    generatedAt: existing.generatedAt,
                    cached: true,
                },
            });
        }

        const todayStart = startOfDay();
        const todayEnd = endOfDay();
        const todaysGenerations = await StudentWeeklyInsight.countDocuments({
            generatedBy: req.user._id,
            generatedAt: { $gte: todayStart, $lte: todayEnd },
        });
        if (todaysGenerations >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Daily AI insight limit reached (3/day). Try again tomorrow.',
            });
        }

        const entries = await DiaryEntry.find({ student: studentId })
            .sort({ createdAt: -1 })
            .limit(6)
            .select('createdAt aiAnalysis')
            .lean();

        const insights = await generateWeeklyInsights(entries.reverse());
        const saved = await StudentWeeklyInsight.create({
            student: studentId,
            generatedBy: req.user._id,
            weekStart,
            weekEnd,
            sentimentTrend: insights.sentimentTrend,
            engagementLevel: insights.engagementLevel,
            riskTrend: insights.riskTrend,
            insightParagraph: insights.insightParagraph,
            confidence: insights.confidence ?? 0.6,
            promptVersion: insights.promptVersion || 'v1',
            generatedAt: new Date(),
        });

        return res.json({
            success: true,
            data: {
                ...insights,
                generatedAt: saved.generatedAt,
                cached: false,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/student-weekly-insights/history
exports.getStudentWeeklyInsightsHistory = async (req, res, next) => {
    try {
        const studentId = await resolveStudentScope(req);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Valid studentId is required for mentor/admin access.' });
        }

        const history = await StudentWeeklyInsight.find({ student: studentId })
            .sort({ generatedAt: -1 })
            .limit(12)
            .select('weekStart weekEnd sentimentTrend engagementLevel riskTrend insightParagraph confidence promptVersion generatedAt')
            .lean();

        return res.json({
            success: true,
            data: history,
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/portfolio — student semester summary
exports.getPortfolio = async (req, res, next) => {
    try {
        const studentId = req.user._id; // students only — enforced by requireRole

        const entries = await DiaryEntry.find({ student: studentId })
            .sort({ createdAt: 1 })
            .select('week createdAt aiAnalysis subjectRatings emotionalRating mood mentorResponse status')
            .lean();

        if (entries.length === 0) {
            return res.json({
                success: true,
                data: {
                    summary: { totalEntries: 0, averageRiskScore: 0, currentStreak: 0, entriesThisMonth: 0, academicYear: currentAcademicYear() },
                    riskTrend: [],
                    subjectPerformance: [],
                    recentEntries: [],
                    aiSummary: 'No entries submitted yet. Start your journey by submitting your first diary entry!',
                },
            });
        }

        // ── Summary stats ───────────────────────────────────────────────────────
        const totalEntries = entries.length;
        const scores = entries.map(e => e.aiAnalysis?.riskScore ?? 0).filter(s => s > 0);
        const averageRiskScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const entriesThisMonth = entries.filter(e => new Date(e.createdAt) >= monthStart).length;

        // Streak from weekly buckets
        const weekSet = new Set(entries.map(e => {
            const { week, year } = isoWeekNumber(new Date(e.createdAt));
            return `${year}-${week}`;
        }));
        const currentStreak = computeStreak(weekSet);

        // ── Risk trend (one point per entry) ──────────────────────────────────
        const riskTrend = entries.map((e, idx) => ({
            week: e.week || idx + 1,
            weekLabel: `Wk ${e.week || idx + 1}`,
            riskScore: e.aiAnalysis?.riskScore ?? 0,
            sentimentScore: e.aiAnalysis?.sentimentScore ?? 50,
        }));

        // ── Subject performance ────────────────────────────────────────────────
        const subjectMap = {};
        for (const entry of entries) {
            for (const sr of (entry.subjectRatings || [])) {
                if (!sr.name) continue;
                if (!subjectMap[sr.name]) subjectMap[sr.name] = { total: 0, count: 0 };
                subjectMap[sr.name].total += Number(sr.rating) || 0;
                subjectMap[sr.name].count++;
            }
        }
        const subjectPerformance = Object.entries(subjectMap).map(([subject, { total, count }]) => ({
            subject,
            avgRating: Math.round((total / count) * 10) / 10,
            entries: count,
        })).sort((a, b) => b.avgRating - a.avgRating);

        // ── AI summary (constructed from data, no AI call) ────────────────────
        const firstScore = entries[0]?.aiAnalysis?.riskScore ?? 0;
        const lastScore = entries[entries.length - 1]?.aiAnalysis?.riskScore ?? 0;
        const trendDir = lastScore < firstScore ? 'improved' : lastScore > firstScore ? 'increased' : 'remained stable';
        const topSubject = subjectPerformance[0]?.subject || 'your studies';
        const dominantSentiment = (() => {
            const counts = {};
            entries.forEach(e => { const s = e.aiAnalysis?.sentiment; if (s) counts[s] = (counts[s] || 0) + 1; });
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
        })();

        const aiSummary = `This semester you have submitted ${totalEntries} entr${totalEntries === 1 ? 'y' : 'ies'}, ` +
            `maintaining a ${currentStreak}-week streak. Your risk score has ${trendDir} overall ` +
            `(${firstScore} → ${lastScore}), reflecting ${dominantSentiment} sentiment across your entries. ` +
            (topSubject !== 'your studies' ? `Your strongest subject is ${topSubject}. ` : '') +
            `Keep up the consistent effort — your mentor is tracking your progress and is here to support you.`;

        // ── Recent entries (last 6, full shape) ──────────────────────────────
        const recentEntries = entries.slice(-6).reverse().map(e => ({
            _id: e._id,
            week: e.week,
            mood: e.mood,
            riskScore: e.aiAnalysis?.riskScore ?? 0,
            riskLevel: e.aiAnalysis?.riskLevel ?? 'low',
            reflection: e.content || e.reflection || '',
            createdAt: e.createdAt,
            reviewStatus: e.status || 'pending',
            mentorComment: e.mentorResponse || null,
        }));

        return res.json({
            success: true,
            data: {
                summary: { totalEntries, averageRiskScore, currentStreak, entriesThisMonth, academicYear: currentAcademicYear() },
                riskTrend,
                subjectPerformance,
                recentEntries,
                aiSummary,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/analytics/export/csv
exports.exportCSV = async (req, res, next) => {
    try {
        await streamAnalyticsCSV(res, req.query.startDate, req.query.endDate);
    } catch (error) { next(error); }
};

// GET /api/analytics/export/flagged
exports.exportFlaggedCSV = async (req, res, next) => {
    try {
        await streamFlaggedEntriesCSV(res);
    } catch (error) { next(error); }
};
