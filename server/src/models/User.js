const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false,
        },
        role: {
            type: String,
            enum: ['student', 'mentor', 'admin'],
            default: 'student',
        },
        department: {
            type: String,
            trim: true,
            default: '',
        },
        batch: {
            type: String,
            trim: true,
            default: '',
        },
        rollNumber: {
            type: String,
            trim: true,
            default: '',
        },
        year: {
            type: Number,
            min: 1,
            max: 4,
        },
        semester: {
            type: Number,
            min: 1,
            max: 8,
        },
        idCardPhoto: {
            type: String,
            default: '',
        },
        assignedMentor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        assignedStudents: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        avatar: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual: initials for avatar fallback
userSchema.virtual('initials').get(function () {
    return this.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
});

// Pre-save: hash password
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Index for fast lookups (email index is auto-created by unique:true)
userSchema.index({ role: 1 });
userSchema.index({ assignedMentor: 1 });

const User = mongoose.model('User', userSchema);
module.exports = User;
