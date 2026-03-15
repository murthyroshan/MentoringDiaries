const mongoose = require('mongoose');

const studentWeeklyInsightSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        weekStart: {
            type: Date,
            required: true,
        },
        weekEnd: {
            type: Date,
            required: true,
        },
        sentimentTrend: {
            type: String,
            enum: ['up', 'down', 'stable'],
            default: 'stable',
        },
        engagementLevel: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        riskTrend: {
            type: String,
            enum: ['increasing', 'decreasing', 'stable'],
            default: 'stable',
        },
        insightParagraph: {
            type: String,
            default: '',
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.5,
        },
        promptVersion: {
            type: String,
            default: 'v1',
        },
        generatedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

studentWeeklyInsightSchema.index({ student: 1, generatedAt: -1 });
studentWeeklyInsightSchema.index({ generatedBy: 1, generatedAt: -1 });

module.exports = mongoose.model('StudentWeeklyInsight', studentWeeklyInsightSchema);

