const mongoose = require('mongoose');

const aiAnalysisSchema = new mongoose.Schema(
    {
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
            default: 'neutral',
        },
        sentimentScore: { type: Number, min: -1, max: 1, default: 0 },
        summary: { type: String, default: '' },
        keyConcerns: { type: [String], default: [] },
        confidence: { type: Number, min: 0, max: 1, default: 0.5 },
        promptVersion: { type: String, default: 'v1' },
        riskScore: { type: Number, min: 0, max: 100, default: 0 },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'low',
        },
        keywords: [
            {
                word: String,
                severity: { type: String, enum: ['neutral', 'warning', 'danger'], default: 'neutral' },
            },
        ],
        flagged: { type: Boolean, default: false },
        historicalRiskFactor: { type: Number, min: 0, max: 1, default: 0 },
        // Multi-factor breakdown (new)
        riskFactors: {
            sentimentFactor: { type: Number, default: 0 },
            attendanceFactor: { type: Number, default: 0 },
            understandingFactor: { type: Number, default: 0 },
            marksFactor: { type: Number, default: 0 },
            consecutiveFactor: { type: Number, default: 0 },
            keywordFactor: { type: Number, default: 0 },
        },
        analysisVersion: { type: String, default: '3.0-multifactor' },
        analyzedAt: { type: Date },
        mentorSuggestion: {
            supportiveResponse: { type: String, default: '' },
            suggestedGuidance: { type: [String], default: [] },
            confidence: { type: Number, min: 0, max: 1, default: 0.5 },
            promptVersion: { type: String, default: 'v1' },
            generatedAt: { type: Date, default: null },
        },
    },
    { _id: false }
);

const subjectRatingSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        rating: { type: Number, min: 1, max: 5, required: true },
        comment: { type: String, default: '' },
    },
    { _id: false }
);

const problemsFacedSchema = new mongoose.Schema(
    {
        academic: { type: String, default: '' },
        personal: { type: String, default: '' },
        other: { type: String, default: '' },
    },
    { _id: false }
);

const diaryEntrySchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },

        // ─── Date Range (replaces week number) ───────────────────
        startDate: {
            type: Date,
            // Required for new entries; nullable so existing data with only `week` is valid
        },
        endDate: {
            type: Date,
        },

        // Backward-compat — deprecated, kept for existing records
        week: {
            type: Number,
            min: 1,
            max: 52,
        },

        academicYear: {
            type: String,
            required: [true, 'Academic year is required'],
            default: '2024-25',
        },
        semester: { type: Number, min: 1, max: 8 },

        // ─── Section A – Main Reflection ──────────────────────────
        content: {
            type: String,
            required: [true, 'Diary content is required'],
            minlength: [50, 'Content must be at least 50 characters'],
        },

        // ─── Section B – Subject Ratings ──────────────────────────
        subjectRatings: {
            type: [subjectRatingSchema],
            default: [],
        },

        // ─── Section C – Problems Faced ───────────────────────────
        problemsFaced: {
            type: problemsFacedSchema,
            default: () => ({}),
        },

        // ─── Section D – Attendance ───────────────────────────────
        attendancePercentage: {
            type: Number,
            min: 0,
            max: 100,
        },
        attendanceExplanation: {
            type: String,
            default: '',
            // Required at app level when attendancePercentage < 75
        },

        // ─── Section E – Emotional State ─────────────────────────
        emotionalRating: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,
        },

        // Legacy fields kept for backward compat
        academicPerformance: { type: String, default: '' },
        challenges: { type: String, default: '' },
        goals: { type: String, default: '' },
        mood: { type: Number, min: 1, max: 5, default: 3 },
        subjectsOfConcern: { type: [String], default: [] },

        // ─── Mentor Feedback ──────────────────────────────────────
        mentorResponse: { type: String, default: '' },
        mentorRespondedAt: { type: Date, default: null },

        // ─── File Attachment ─────────────────────────────────────
        attachmentUrl: { type: String, default: '' },
        attachmentName: { type: String, default: '' },

        // ─── Status & Admin ───────────────────────────────────────
        status: {
            type: String,
            enum: ['submitted', 'reviewed'],
            default: 'submitted',
        },
        adminNotes: { type: String, default: '' },
        escalatedToAdmin: { type: Boolean, default: false },

        // ─── AI Analysis ──────────────────────────────────────────
        aiAnalysis: { type: aiAnalysisSchema, default: () => ({}) },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: response time in hours
diaryEntrySchema.virtual('responseTimeHours').get(function () {
    if (!this.mentorRespondedAt || !this.createdAt) return null;
    return Math.round((this.mentorRespondedAt - this.createdAt) / 3600000 * 10) / 10;
});

// Virtual: date range label
diaryEntrySchema.virtual('periodLabel').get(function () {
    if (this.startDate && this.endDate) {
        const s = this.startDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        const e = this.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        return `${s} – ${e}`;
    }
    return this.week ? `Week ${this.week}` : '—';
});

// ─── Indexes ─────────────────────────────────────────────────────
diaryEntrySchema.index({ student: 1, createdAt: -1 });
diaryEntrySchema.index({ mentor: 1, status: 1 });
diaryEntrySchema.index({ 'aiAnalysis.flagged': 1, 'aiAnalysis.riskLevel': 1 });
diaryEntrySchema.index({ createdAt: -1 });
diaryEntrySchema.index({ 'aiAnalysis.sentiment': 1 });
diaryEntrySchema.index({ 'aiAnalysis.riskScore': -1 });
diaryEntrySchema.index({ startDate: 1 });
// Unique per student start date (sparse — ignores docs where startDate is null/missing)
diaryEntrySchema.index({ student: 1, startDate: 1 }, { unique: true, sparse: true });
// Keep legacy week index as non-unique for backward compat queries
diaryEntrySchema.index({ student: 1, week: 1, academicYear: 1 }, { sparse: true });

const DiaryEntry = mongoose.model('DiaryEntry', diaryEntrySchema);
module.exports = DiaryEntry;
