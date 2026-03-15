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

// GET /api/analytics/student-overview
exports.getStudentOverview = async (req, res, next) => {
    try {
        const studentId = await resolveStudentScope(req);
        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Valid studentId is required for mentor/admin access.' });
        }

        const [entriesSubmitted, skillsAdded, eventsParticipated, latestEntry] = await Promise.all([
            DiaryEntry.countDocuments({ student: studentId }),
            SkillProgress.countDocuments({ student: studentId }),
            Event.countDocuments({ student: studentId }),
            DiaryEntry.findOne({ student: studentId }).sort({ createdAt: -1 }).lean(),
        ]);

        const pendingMentorResponses = await DiaryEntry.countDocuments({
            student: studentId,
            status: 'submitted',
        });

        const nextDiarySubmissionDeadline = latestEntry
            ? addDays(latestEntry.endDate || latestEntry.createdAt, 7)
            : addDays(new Date(), 7);

        const growthScore = Math.round((entriesSubmitted * 2) + (skillsAdded * 1.5) + (eventsParticipated * 1));

        return res.json({
            success: true,
            data: {
                pendingMentorResponses,
                latestSentimentResult: latestEntry?.aiAnalysis?.sentiment || null,
                nextDiarySubmissionDeadline,
                entriesSubmitted,
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
