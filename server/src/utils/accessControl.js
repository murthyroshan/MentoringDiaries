const User = require('../models/User');

const idsEqual = (a, b) => String(a) === String(b);

async function isMentorAssignedToStudent(mentorId, studentId) {
    if (!mentorId || !studentId) return false;
    const count = await User.countDocuments({
        _id: studentId,
        role: 'student',
        isActive: true,
        assignedMentor: mentorId,
    });
    return count > 0;
}

async function getAssignedStudentIds(mentorId) {
    if (!mentorId) return [];
    const students = await User.find({
        role: 'student',
        isActive: true,
        assignedMentor: mentorId,
    }).select('_id').lean();
    return students.map((s) => s._id);
}

async function canAccessStudentData(user, studentId) {
    if (!user || !studentId) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'student') return idsEqual(user._id, studentId);
    if (user.role === 'mentor') return isMentorAssignedToStudent(user._id, studentId);
    return false;
}

module.exports = {
    idsEqual,
    isMentorAssignedToStudent,
    getAssignedStudentIds,
    canAccessStudentData,
};
