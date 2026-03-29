const db = require('../database/db');

const idsEqual = (a, b) => Number(a) === Number(b);

function isMentorAssignedToStudent(mentorId, studentId) {
    const row = db.prepare('SELECT id FROM users WHERE id = ? AND mentor_id = ? AND role = ? AND is_active = 1')
        .get(Number(studentId), Number(mentorId), 'student');
    return !!row;
}

function getAssignedStudentIds(mentorId) {
    const rows = db.prepare('SELECT id FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1')
        .all(Number(mentorId), 'student');
    return rows.map(r => r.id);
}

function canAccessStudentData(user, studentId) {
    if (!user || !studentId) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'student') return idsEqual(user.id, studentId);
    if (user.role === 'mentor') return isMentorAssignedToStudent(user.id, studentId);
    return false;
}

module.exports = {
    idsEqual,
    isMentorAssignedToStudent,
    getAssignedStudentIds,
    canAccessStudentData,
};
