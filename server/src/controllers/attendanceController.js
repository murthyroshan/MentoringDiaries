const queries = require('../database/queries');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

// GET /api/attendance/me?week=N&semester=N&year=YYYY
exports.getMyAttendance = (req, res, next) => {
    try {
        const user = req.user;
        if (!user.department || !user.section || !user.roll_number) {
            return res.status(400).json({ success: false, message: 'Attendance is only available for students with department/section/roll.' });
        }

        const weekNumber  = Number(req.query.week || 1);
        const semester    = Number(req.query.semester || user.current_semester || 4);
        const academicYear = req.query.year || currentAcademicYear();

        const row = queries.getAttendance(user.department, user.section, user.roll_number, weekNumber, academicYear, semester);
        if (!row) {
            return res.json({ success: true, data: null, message: 'No attendance record for this week.' });
        }

        return res.json({ success: true, data: row });
    } catch (error) {
        next(error);
    }
};

// GET /api/attendance/me/history?semester=N&year=YYYY
exports.getMyAttendanceHistory = (req, res, next) => {
    try {
        const user = req.user;
        if (!user.department || !user.section || !user.roll_number) {
            return res.status(400).json({ success: false, message: 'Attendance is only available for students with department/section/roll.' });
        }

        const semester    = Number(req.query.semester || user.current_semester || 4);
        const academicYear = req.query.year || currentAcademicYear();

        const rows = queries.getAttendanceHistory(user.department, user.section, user.roll_number, academicYear, semester);
        return res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};
