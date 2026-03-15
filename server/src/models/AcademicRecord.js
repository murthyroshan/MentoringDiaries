const mongoose = require('mongoose');

// ── Midterm Subject Schema (marks 0–40, maxMarks fixed at 40) ─────────────────
const midtermMarkSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        marks: {
            type: Number,
            required: true,
            min: [0, 'Marks cannot be negative.'],
            max: [40, 'Midterm marks cannot exceed 40.'],
        },
        maxMarks: { type: Number, default: 40, enum: [40] }, // locked at 40
        percentage: { type: Number },
    },
    { _id: false }
);

// ── End-Semester Subject Schema (grade enum, no numeric marks) ────────────────
const endsemMarkSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        grade: {
            type: String,
            required: true,
            enum: {
                values: ['F', 'C', 'B', 'B+', 'A', 'A+', 'O'],
                message: 'Grade must be one of: F, C, B, B+, A, A+, O',
            },
        },
    },
    { _id: false }
);

const academicRecordSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 8,
        },
        academicYear: {
            type: String,
            required: true,
            default: '2024-25',
        },
        examType: {
            type: String,
            enum: ['mid1', 'mid2', 'endsem'],
            required: true,
        },

        // ── Midterm subjects (used only when examType = mid1/mid2) ──────────
        subjects: {
            type: [midtermMarkSchema],
            default: [],
        },

        // ── End-semester subjects (used only when examType = endsem) ────────
        endsemSubjects: {
            type: [endsemMarkSchema],
            default: [],
        },

        // ── End-semester CGPA ────────────────────────────────────────────────
        finalCgpa: {
            type: Number,
            min: [0, 'CGPA cannot be negative.'],
            max: [10, 'CGPA cannot exceed 10.'],
            default: null,
        },

        overallPercentage: {
            type: Number,
            default: 0,
        },

        // Lock state
        locked: {
            type: Boolean,
            default: false,
        },
        mentorApprovalRequired: {
            type: Boolean,
            default: false,
        },
        mentorApprovalStatus: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none',
        },
        mentorNotes: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

// ── Pre-save: validate exam-type-specific fields, auto-compute percentage ─────
academicRecordSchema.pre('save', function (next) {
    if (this.examType === 'endsem') {
        // End semester: must have endsemSubjects and finalCgpa
        if (!this.endsemSubjects || this.endsemSubjects.length === 0) {
            return next(new Error('End-semester record requires at least one subject with a grade.'));
        }
        if (this.finalCgpa === null || this.finalCgpa === undefined) {
            return next(new Error('End-semester record requires a finalCgpa (0–10).'));
        }
        // Map grades to points for overallPercentage display
        const gradeMap = { O: 10, 'A+': 9, A: 8, 'B+': 7, B: 6, C: 5, F: 0 };
        const total = this.endsemSubjects.reduce((sum, s) => sum + (gradeMap[s.grade] ?? 0), 0);
        this.overallPercentage = this.endsemSubjects.length > 0
            ? Math.round((total / (this.endsemSubjects.length * 10)) * 1000) / 10
            : 0;
    } else {
        // Midterm: must have subjects with marks 0–40
        if (!this.subjects || this.subjects.length === 0) {
            return next(new Error('Midterm record requires at least one subject.'));
        }
        let totalMarks = 0, totalMax = 0;
        for (const s of this.subjects) {
            s.maxMarks = 40; // enforce
            if (s.marks < 0 || s.marks > 40) {
                return next(new Error(`Marks for "${s.name}" must be between 0 and 40.`));
            }
            s.percentage = Math.round((s.marks / 40) * 1000) / 10;
            totalMarks += s.marks;
            totalMax += 40;
        }
        this.overallPercentage = totalMax > 0 ? Math.round((totalMarks / totalMax) * 1000) / 10 : 0;
    }
    next();
});

// Only 2 midterms + 1 end-sem per semester per student
academicRecordSchema.index({ student: 1, semester: 1, examType: 1 }, { unique: true });
academicRecordSchema.index({ student: 1, semester: 1 });

const AcademicRecord = mongoose.model('AcademicRecord', academicRecordSchema);
module.exports = AcademicRecord;
