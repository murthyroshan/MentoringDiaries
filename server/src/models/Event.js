const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
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
        eventName: {
            type: String,
            required: [true, 'Event name is required'],
            trim: true,
            maxlength: [150, 'Event name too long'],
        },
        organizedBy: {
            type: String,
            trim: true,
            default: '',
        },
        eventType: {
            type: String,
            enum: ['technical', 'cultural', 'sports', 'workshop', 'hackathon', 'seminar', 'other'],
            required: true,
        },
        achievement: {
            type: String,
            enum: ['participated', 'winner', 'runner-up', 'special-mention', 'coordinator', 'volunteer', 'other'],
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
            default: '',
            maxlength: [1000, 'Description too long'],
        },
        // Certificate or proof upload (multer)
        certificateUrl: { type: String, default: '' },
        certificateName: { type: String, default: '' },
    },
    { timestamps: true }
);

eventSchema.index({ student: 1, date: -1 });
eventSchema.index({ student: 1, eventType: 1 });

const Event = mongoose.model('Event', eventSchema);
module.exports = Event;
