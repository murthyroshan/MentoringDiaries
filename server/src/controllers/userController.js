const mongoose = require('mongoose');
const User = require('../models/User');
const DiaryEntry = require('../models/DiaryEntry');
const MentoringSession = require('../models/MentoringSession');
const { notifyUserWithPersistence } = require('../socket');
const { idsEqual, canAccessStudentData } = require('../utils/accessControl');
const { getPagination } = require('../utils/pagination');
const { buildSafeSearchRegex } = require('../utils/query');

// GET /api/users
exports.getUsers = async (req, res, next) => {
    try {
        const { role, search } = req.query;
        const query = { isActive: true };
        const { page, limit, skip } = getPagination(req.query);

        if (role !== undefined) {
            if (typeof role !== 'string' || !['student', 'mentor', 'admin'].includes(role)) {
                return res.status(400).json({ success: false, message: 'Invalid role filter.' });
            }
            query.role = role;
        }

        // Mentors can only list students assigned to them.
        if (req.user.role === 'mentor') {
            query.role = 'student';
            query.assignedMentor = req.user._id;
        }

        const safeSearch = buildSafeSearchRegex(search);
        if (safeSearch) {
            query.$or = [
                { name: safeSearch },
                { email: safeSearch },
                { department: safeSearch },
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .select('-password -refreshToken')
                .populate('assignedMentor', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: users,
            pagination: { total, page, limit, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/users/:id
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password -refreshToken')
            .populate('assignedMentor', 'name email department')
            .populate('assignedStudents', 'name email department batch');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Access rules:
        // - Admin: all
        // - Student: self only
        // - Mentor: self + assigned students only
        if (req.user.role !== 'admin') {
            if (req.user.role === 'student' && !idsEqual(req.user._id, user._id)) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
            if (req.user.role === 'mentor') {
                if (idsEqual(req.user._id, user._id)) {
                    return res.json({ success: true, data: user });
                }
                const allowed = await canAccessStudentData(req.user, user._id);
                if (!allowed) {
                    return res.status(403).json({ success: false, message: 'Access denied.' });
                }
            }
        }

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:id
exports.updateUser = async (req, res, next) => {
    try {
        const { name, department, batch, rollNumber, isActive, role } = req.body;

        // Non-admins can only update themselves
        if (req.user.role !== 'admin' && req.params.id !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (department !== undefined) updateData.department = department;
        if (batch !== undefined) updateData.batch = batch;
        if (rollNumber !== undefined) updateData.rollNumber = rollNumber;
        if (req.user.role === 'admin') {
            if (isActive !== undefined) updateData.isActive = isActive;
            if (role !== undefined) {
                const VALID_ROLES = ['student', 'mentor', 'admin'];
                if (!VALID_ROLES.includes(role)) {
                    return res.status(400).json({ success: false, message: 'Invalid role. Must be student, mentor, or admin.' });
                }
                updateData.role = role;
            }
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
            .select('-password -refreshToken');

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/users/:studentId/assign-mentor
exports.assignMentor = async (req, res, next) => {
    try {
        const { mentorId } = req.body;
        const student = await User.findById(req.params.studentId);
        const mentor = await User.findById(mentorId);

        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        if (!mentor || mentor.role !== 'mentor') {
            return res.status(404).json({ success: false, message: 'Mentor not found' });
        }

        // All three writes are atomic — a partial failure would orphan the student.
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            if (student.assignedMentor) {
                await User.findByIdAndUpdate(
                    student.assignedMentor,
                    { $pull: { assignedStudents: student._id } },
                    { session }
                );
            }
            await User.findByIdAndUpdate(
                student._id,
                { assignedMentor: mentorId },
                { session }
            );
            await User.findByIdAndUpdate(
                mentorId,
                { $addToSet: { assignedStudents: student._id } },
                { session }
            );
            await DiaryEntry.updateMany(
                { student: student._id, status: 'submitted' },
                { mentor: mentorId },
                { session }
            );
            await session.commitTransaction();
        } catch (txErr) {
            await session.abortTransaction();
            throw txErr;
        } finally {
            session.endSession();
        }

        // Notify old mentor they are no longer responsible for this student.
        if (student.assignedMentor && !student.assignedMentor.equals(mentorId)) {
            notifyUserWithPersistence(student.assignedMentor, {
                type: 'system:announcement',
                title: 'Student Reassigned',
                message: `${student.name} has been reassigned to another mentor.`,
                metadata: { studentId: student._id },
            });
        }
        // Notify new mentor they now have an additional student.
        notifyUserWithPersistence(mentorId, {
            type: 'system:announcement',
            title: 'New Student Assigned',
            message: `${student.name} has been assigned to you as a mentee.`,
            metadata: { studentId: student._id },
        });

        const updatedStudent = await User.findById(student._id).select('-password -refreshToken');
        res.json({ success: true, message: 'Mentor assigned successfully', data: { student: updatedStudent, mentor } });
    } catch (error) {
        next(error);
    }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Clean up relational data so deactivation doesn't leave orphaned records.
        if (user.role === 'student') {
            // Archive the student's diary entries.
            await DiaryEntry.updateMany({ student: user._id }, { $set: { status: 'archived' } });
            // Detach from their mentor's student list.
            if (user.assignedMentor) {
                await User.findByIdAndUpdate(user.assignedMentor, {
                    $pull: { assignedStudents: user._id },
                });
            }
        } else if (user.role === 'mentor') {
            // Unassign all students that were linked to this mentor.
            await User.updateMany(
                { assignedMentor: user._id },
                { $unset: { assignedMentor: '' } }
            );
            // Archive diary entries where this user was the reviewing mentor.
            await DiaryEntry.updateMany({ mentor: user._id }, { $set: { mentor: null } });
        }

        res.json({ success: true, message: 'User deactivated successfully' });
    } catch (error) {
        next(error);
    }
};
