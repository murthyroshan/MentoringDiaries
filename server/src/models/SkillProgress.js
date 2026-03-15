const mongoose = require('mongoose');

const skillProgressSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        semester: {
            type: Number,
            min: 1,
            max: 8,
        },
        academicYear: {
            type: String,
            default: '2024-25',
        },
        skillCategory: {
            type: String,
            enum: ['Technical', 'Communication', 'Leadership', 'Soft Skills', 'Other'],
            required: true,
        },
        skillName: {
            type: String,
            required: [true, 'Skill name is required'],
            trim: true,
            maxlength: [100, 'Skill name too long'],
        },
        ratingBefore: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        ratingAfter: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        description: {
            type: String,
            default: '',
            maxlength: [500],
        },
        source: {
            type: String,
            enum: ['college', 'external', 'self-learned', 'internship', 'project'],
            default: 'college',
        },
    },
    { timestamps: true }
);

// Virtual: improvement delta
skillProgressSchema.virtual('improvement').get(function () {
    return this.ratingAfter - this.ratingBefore;
});

skillProgressSchema.set('toJSON', { virtuals: true });
skillProgressSchema.set('toObject', { virtuals: true });

skillProgressSchema.index({ student: 1, semester: 1 });
skillProgressSchema.index({ student: 1, skillCategory: 1 });

const SkillProgress = mongoose.model('SkillProgress', skillProgressSchema);
module.exports = SkillProgress;
