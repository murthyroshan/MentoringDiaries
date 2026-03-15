const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['entry:submitted', 'entry:responded', 'entry:critical', 'system:announcement', 'session:update'],
            default: 'system:announcement',
        },
        title: {
            type: String,
            trim: true,
            default: 'Notification',
            maxlength: 120,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        metadata: {
            type: Object,
            default: {},
        },
        read: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

