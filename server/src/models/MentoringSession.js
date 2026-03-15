const mongoose = require('mongoose');

const mentoringSessionSchema = new mongoose.Schema(
    {
        mentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        agenda: {
            type: String,
            trim: true,
            default: '',
            maxlength: [500, 'Agenda cannot exceed 500 characters'],
        },
        discussionNotes: {
            type: String,
            trim: true,
            default: '',
            maxlength: [5000, 'Discussion notes cannot exceed 5000 characters'],
        },
        actionItems: {
            type: [String],
            default: [],
        },
        followUpDate: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

mentoringSessionSchema.index({ mentor: 1, date: -1 });
mentoringSessionSchema.index({ student: 1, date: -1 });

module.exports = mongoose.model('MentoringSession', mentoringSessionSchema);

