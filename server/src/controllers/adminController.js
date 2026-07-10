const db = require('../database/db');
const queries = require('../database/queries');

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

function safeUser(u) {
    if (!u) return null;
    const { password_hash, refresh_token, ...safe } = u;
    return safe;
}

function riskLevelFromScore(score) {
    if (score == null || score < 30) return 'low';
    if (score < 60) return 'medium';
    if (score < 80) return 'high';
    return 'critical';
}

// ─── 1. GET /api/admin/sections ───────────────────────────────────────────────
exports.getSections = (req, res, next) => {
    try {
        const data = db.prepare(`
            SELECT DISTINCT department, section
            FROM users
            WHERE role = 'student' AND is_active = 1
              AND department IS NOT NULL AND section IS NOT NULL
            ORDER BY department, section
        `).all();
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// ─── 2. GET /api/admin/sections/:department/:section/report ───────────────────
exports.getSectionReport = (req, res, next) => {
    try {
        const { department, section } = req.params;
        const semester = req.query.semester ? Number(req.query.semester) : 4;
        const academic_year = req.query.academic_year || currentAcademicYear();

        // All students in this section
        const students = db.prepare(`
            SELECT u.id, u.name, u.roll_number, u.email, u.mentor_id, u.current_semester,
                   m.name AS mentor_name
            FROM users u
            LEFT JOIN users m ON m.id = u.mentor_id
            WHERE u.role = 'student' AND u.is_active = 1
              AND u.department = ? AND u.section = ?
            ORDER BY u.roll_number ASC
        `).all(department, section);

        // Latest attendance per student (for this semester/year)
        const attendanceRows = db.prepare(`
            SELECT a.roll_number, a.cumulative_pct, a.week_number
            FROM attendance a
            INNER JOIN (
                SELECT roll_number, MAX(week_number) AS max_week
                FROM attendance
                WHERE department = ? AND section = ? AND academic_year = ? AND semester = ?
                GROUP BY roll_number
            ) latest ON a.roll_number = latest.roll_number AND a.week_number = latest.max_week
            WHERE a.department = ? AND a.section = ? AND a.academic_year = ? AND a.semester = ?
        `).all(department, section, academic_year, semester, department, section, academic_year, semester);

        const attendanceMap = {};
        for (const r of attendanceRows) {
            attendanceMap[r.roll_number] = { cumulative_pct: r.cumulative_pct, week_number: r.week_number };
        }

        // Diary stats per student
        // Aggregate counts plus each student's *most recent* risk score / mood.
        // MAX(ai_risk_score) would report the highest-ever value, overstating
        // risk — instead pull those two from the latest row via a window function.
        const diaryRows = db.prepare(`
            SELECT
                d.student_id,
                COUNT(*) AS total_entries,
                SUM(CASE WHEN d.mentor_response IS NULL THEN 1 ELSE 0 END) AS pending_reviews,
                SUM(CASE WHEN d.is_flagged = 1 THEN 1 ELSE 0 END) AS flagged_count,
                MAX(CASE WHEN d.rn = 1 THEN d.ai_risk_score END) AS latest_risk_score,
                MAX(CASE WHEN d.rn = 1 THEN d.mood END) AS latest_mood,
                MAX(d.created_at) AS last_submitted_at
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY created_at DESC, id DESC) AS rn
                FROM diary_entries
                WHERE semester = ? AND academic_year = ?
                  AND student_id IN (
                      SELECT id FROM users WHERE role='student' AND is_active=1 AND department=? AND section=?
                  )
            ) d
            GROUP BY d.student_id
        `).all(semester, academic_year, department, section);

        const diaryMap = {};
        for (const r of diaryRows) {
            diaryMap[r.student_id] = r;
        }

        // Compose student objects
        const enrichedStudents = students.map(s => {
            const att = attendanceMap[s.roll_number] || null;
            const diary = diaryMap[s.id] || null;
            const riskScore = diary?.latest_risk_score ?? null;
            return {
                id: s.id,
                name: s.name,
                roll_number: s.roll_number,
                email: s.email,
                mentor_id: s.mentor_id,
                mentor_name: s.mentor_name || null,
                current_semester: s.current_semester,
                attendance: att ? {
                    latest_cumulative_pct: att.cumulative_pct,
                    latest_week_number: att.week_number,
                    below_75: att.cumulative_pct < 75,
                } : null,
                diary: diary ? {
                    total_entries: diary.total_entries,
                    latest_risk_score: diary.latest_risk_score,
                    latest_mood: diary.latest_mood,
                    pending_reviews: diary.pending_reviews,
                    flagged_count: diary.flagged_count,
                    last_submitted_at: diary.last_submitted_at,
                } : null,
                risk_level: riskLevelFromScore(riskScore),
            };
        });

        // Summary
        const total_students = enrichedStudents.length;
        const studentsWithAtt = enrichedStudents.filter(s => s.attendance);
        const studentsWithDiary = enrichedStudents.filter(s => s.diary);

        const avg_attendance = studentsWithAtt.length
            ? Math.round((studentsWithAtt.reduce((sum, s) => sum + s.attendance.latest_cumulative_pct, 0) / studentsWithAtt.length) * 10) / 10
            : null;

        const avg_risk_score = studentsWithDiary.length
            ? Math.round((studentsWithDiary.reduce((sum, s) => sum + (s.diary.latest_risk_score || 0), 0) / studentsWithDiary.length) * 10) / 10
            : null;

        const summary = {
            total_students,
            avg_attendance,
            avg_risk_score,
            below_75_attendance_count: enrichedStudents.filter(s => s.attendance?.below_75).length,
            high_risk_count: enrichedStudents.filter(s => s.risk_level === 'high').length,
            critical_risk_count: enrichedStudents.filter(s => s.risk_level === 'critical').length,
            pending_reviews_count: enrichedStudents.reduce((sum, s) => sum + (s.diary?.pending_reviews || 0), 0),
            no_mentor_count: enrichedStudents.filter(s => !s.mentor_id).length,
            no_entries_this_sem_count: enrichedStudents.filter(s => !s.diary || s.diary.total_entries === 0).length,
        };

        return res.json({
            success: true,
            data: { department, section, semester, academic_year, students: enrichedStudents, summary },
        });
    } catch (error) { next(error); }
};

// ─── 3. GET /api/admin/students/:id/full-report ────────────────────────────────
exports.getStudentFullReport = (req, res, next) => {
    try {
        const studentId = Number(req.params.id);
        const student = queries.findUserById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const semester = student.current_semester || 4;
        const academic_year = currentAcademicYear();

        let mentorInfo = null;
        if (student.mentor_id) {
            const m = queries.findUserById(student.mentor_id);
            mentorInfo = m ? safeUser(m) : null;
        }

        const attendance_history = student.department && student.section && student.roll_number
            ? queries.getAttendanceHistory(student.department, student.section, student.roll_number, academic_year, semester)
            : [];

        const entriesRaw = db.prepare(`
            SELECT de.*, u.name AS student_name
            FROM diary_entries de
            JOIN users u ON u.id = de.student_id
            WHERE de.student_id = ?
            ORDER BY de.semester ASC, de.week_number ASC
        `).all(studentId);

        // Attach subject ratings to each entry
        const diary_entries = entriesRaw.map(e => {
            const ratings = db.prepare('SELECT * FROM diary_subject_ratings WHERE entry_id = ?').all(e.id);
            return { ...e, subject_ratings: ratings };
        });

        const marksRaw = queries.getMarksByStudent(studentId);
        const marks = marksRaw.map(m => ({
            ...m,
            subjects: db.prepare('SELECT * FROM marks_subjects WHERE marks_entry_id = ?').all(m.id),
        }));

        const achievements = queries.getAchievementsByStudent(studentId);

        const sessions = db.prepare(`
            SELECT ms.*, ment.name AS mentor_name, ment.email AS mentor_email
            FROM mentoring_sessions ms
            JOIN users ment ON ment.id = ms.mentor_id
            WHERE ms.student_id = ?
            ORDER BY ms.scheduled_at DESC
        `).all(studentId);

        const risk_trend = db.prepare(`
            SELECT week_number, ai_risk_score, semester, academic_year, created_at
            FROM diary_entries
            WHERE student_id = ?
            ORDER BY semester ASC, week_number ASC
        `).all(studentId);

        const insights = db.prepare(`
            SELECT * FROM weekly_insights
            WHERE student_id = ?
            ORDER BY semester ASC, week_number ASC
        `).all(studentId);

        return res.json({
            success: true,
            data: {
                student: { ...safeUser(student), mentor: mentorInfo },
                attendance_history,
                diary_entries,
                marks,
                achievements,
                sessions,
                risk_trend,
                insights,
            },
        });
    } catch (error) { next(error); }
};

// ─── 4. PATCH /api/admin/students/:id/assign-mentor ───────────────────────────
exports.assignMentor = (req, res, next) => {
    try {
        const studentId = Number(req.params.id);
        const { mentor_id } = req.body;

        const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(studentId);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        if (mentor_id === null || mentor_id === undefined) {
            // Remove mentor
            db.prepare('UPDATE users SET mentor_id = NULL WHERE id = ?').run(studentId);
            queries.createNotification(studentId, 'mentor_removed', 'Your mentor assignment has been updated', null);
        } else {
            const mentor = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'mentor' AND is_active = 1").get(Number(mentor_id));
            if (!mentor) return res.status(400).json({ success: false, message: 'Mentor not found or inactive' });
            db.prepare('UPDATE users SET mentor_id = ? WHERE id = ?').run(Number(mentor_id), studentId);
            queries.createNotification(studentId, 'mentor_assigned', `You have been assigned to ${mentor.name}`, Number(mentor_id));
        }

        const updated = queries.findUserById(studentId);
        let mentorInfo = null;
        if (updated.mentor_id) {
            const m = queries.findUserById(updated.mentor_id);
            mentorInfo = m ? safeUser(m) : null;
        }
        return res.json({ success: true, data: { ...safeUser(updated), mentor: mentorInfo } });
    } catch (error) { next(error); }
};

// ─── 5. GET /api/admin/mentors ────────────────────────────────────────────────
exports.getMentors = (req, res, next) => {
    try {
        const data = db.prepare(`
            SELECT u.id, u.name, u.email, u.department, u.is_active,
                   COUNT(s.id) AS student_count
            FROM users u
            LEFT JOIN users s ON s.mentor_id = u.id AND s.role = 'student' AND s.is_active = 1
            WHERE u.role = 'mentor' AND u.is_active = 1
            GROUP BY u.id
            ORDER BY u.name ASC
        `).all();
        return res.json({ success: true, data });
    } catch (error) { next(error); }
};

// ─── 6. GET /api/admin/overview ───────────────────────────────────────────────
exports.getOverview = (req, res, next) => {
    try {
        const academic_year = req.query.academic_year || currentAcademicYear();
        const semester = req.query.semester ? Number(req.query.semester) : 4;
        const batch = req.query.batch;

        let userFilter = "role='student' AND is_active=1";
        let userParams = [];
        if (batch) {
            userFilter += " AND batch = ?";
            userParams.push(String(batch));
        }

        const total_students = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${userFilter}`).get(...userParams).n;
        const total_mentors  = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='mentor' AND is_active=1").get().n;

        let diaryBatchFilter = "";
        let diaryParams = [academic_year, semester];
        if (batch) {
            diaryBatchFilter = " AND student_id IN (SELECT id FROM users WHERE role='student' AND batch = ?)";
            diaryParams.push(String(batch));
        }

        const total_entries_this_sem = db.prepare(`
            SELECT COUNT(*) AS n FROM diary_entries 
            WHERE academic_year = ? AND semester = ? ${diaryBatchFilter}
        `).get(...diaryParams).n;

        const riskRow = db.prepare(`
            SELECT AVG(ai_risk_score) AS avg_risk,
                   SUM(CASE WHEN ai_risk_level = 'critical' THEN 1 ELSE 0 END) AS critical_count,
                   SUM(CASE WHEN ai_risk_level = 'high' THEN 1 ELSE 0 END) AS high_count
            FROM diary_entries
            WHERE academic_year = ? AND semester = ? ${diaryBatchFilter}
        `).get(...diaryParams);

        let attBatchFilterUser = "";
        let attParams = [academic_year, semester];
        if (batch) {
            attBatchFilterUser = " INNER JOIN users u ON u.roll_number = a.roll_number " +
                                 " AND u.department = a.department AND u.section = a.section AND u.batch = ?";
            attParams.push(String(batch));
        }
        attParams.push(academic_year, semester);

        const below75 = db.prepare(`
            SELECT COUNT(*) AS n FROM (
                SELECT a.roll_number, a.department, a.section, a.cumulative_pct
                FROM attendance a
                INNER JOIN (
                    SELECT department, section, roll_number, MAX(week_number) AS max_week
                    FROM attendance
                    WHERE academic_year = ? AND semester = ?
                    GROUP BY department, section, roll_number
                ) latest ON a.department = latest.department AND a.section = latest.section
                    AND a.roll_number = latest.roll_number AND a.week_number = latest.max_week
                ${attBatchFilterUser}
                WHERE a.academic_year = ? AND a.semester = ?
            ) sub WHERE cumulative_pct < 75
        `).get(...attParams).n;

        const pending_reviews_count = db.prepare(`
            SELECT COUNT(*) AS n FROM diary_entries 
            WHERE mentor_response IS NULL AND academic_year = ? AND semester = ? ${diaryBatchFilter}
        `).get(...diaryParams).n;

        const flagged_unreviewed_count = db.prepare(`
            SELECT COUNT(*) AS n FROM diary_entries 
            WHERE is_flagged = 1 AND mentor_response IS NULL AND academic_year = ? AND semester = ? ${diaryBatchFilter}
        `).get(...diaryParams).n;

        let noMentorFilter = "role='student' AND is_active=1 AND mentor_id IS NULL";
        let noMentorParams = [];
        if (batch) {
            noMentorFilter += " AND batch = ?";
            noMentorParams.push(String(batch));
        }
        const no_mentor_count = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${noMentorFilter}`).get(...noMentorParams).n;

        let last7DaysFilter = "";
        let last7DaysParams = [];
        if (batch) {
            last7DaysFilter = " AND student_id IN (SELECT id FROM users WHERE role='student' AND batch = ?)";
            last7DaysParams.push(String(batch));
        }
        const entries_this_week = db.prepare(`
            SELECT COUNT(*) AS n FROM diary_entries 
            WHERE created_at >= datetime('now', '-7 days') ${last7DaysFilter}
        `).get(...last7DaysParams).n;

        let newStudentsFilter = "role='student' AND is_active=1 AND created_at >= datetime('now', '-30 days')";
        let newStudentsParams = [];
        if (batch) {
            newStudentsFilter += " AND batch = ?";
            newStudentsParams.push(String(batch));
        }
        const new_students_this_month = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE ${newStudentsFilter}`).get(...newStudentsParams).n;

        return res.json({
            success: true,
            data: {
                total_students,
                total_mentors,
                total_entries_this_sem,
                avg_risk_score: riskRow?.avg_risk != null ? Math.round(riskRow.avg_risk) : 0,
                critical_risk_count: riskRow?.critical_count || 0,
                high_risk_count: riskRow?.high_count || 0,
                below_75_attendance_count: below75,
                pending_reviews_count,
                flagged_unreviewed_count,
                no_mentor_count,
                entries_this_week,
                new_students_this_month,
            },
        });
    } catch (error) { next(error); }
};

// ─── 8. GET /api/admin/batches ───────────────────────────────────────────────
exports.getBatches = (req, res, next) => {
    try {
        const rows = db.prepare("SELECT DISTINCT batch FROM users WHERE role = 'student' AND batch IS NOT NULL AND batch != '' ORDER BY batch DESC").all();
        const batches = rows.map(r => r.batch);
        return res.json({ success: true, data: batches });
    } catch (error) { next(error); }
};

// ─── 7. GET /api/admin/risk-alerts ────────────────────────────────────────────
exports.getRiskAlerts = (req, res, next) => {
    try {
        const academic_year = req.query.academic_year || currentAcademicYear();
        const semester = req.query.semester ? Number(req.query.semester) : 4;

        const batch = req.query.batch;

        let userBatchFilter = "";
        let params = [academic_year, semester, academic_year, semester, academic_year, semester];
        if (batch) {
            userBatchFilter = " AND u.batch = ?";
            params.push(String(batch));
        }

        // Latest diary entry per student
        const alerts = db.prepare(`
            SELECT
                u.id AS student_id, u.name AS student_name, u.department, u.section,
                u.roll_number, u.is_active,
                de.id AS entry_id, de.ai_risk_score, de.ai_risk_level, de.is_flagged,
                de.mentor_response, de.created_at AS last_entry_date,
                de.attendance_pct,
                m.name AS mentor_name,
                a.cumulative_pct AS latest_attendance_pct
            FROM users u
            INNER JOIN diary_entries de ON de.student_id = u.id
            INNER JOIN (
                SELECT student_id, MAX(id) AS max_id
                FROM diary_entries
                WHERE academic_year = ? AND semester = ?
                GROUP BY student_id
            ) latest_entry ON de.student_id = latest_entry.student_id AND de.id = latest_entry.max_id
            LEFT JOIN users m ON m.id = u.mentor_id
            LEFT JOIN (
                SELECT a2.department, a2.section, a2.roll_number, a2.cumulative_pct, a2.week_number
                FROM attendance a2
                INNER JOIN (
                    SELECT department, section, roll_number, MAX(week_number) AS max_week
                    FROM attendance
                    WHERE academic_year = ? AND semester = ?
                    GROUP BY department, section, roll_number
                ) la ON a2.department = la.department AND a2.section = la.section
                    AND a2.roll_number = la.roll_number AND a2.week_number = la.max_week
                WHERE a2.academic_year = ? AND a2.semester = ?
            ) a ON a.department = u.department AND a.section = u.section AND a.roll_number = u.roll_number
            WHERE u.role = 'student' AND u.is_active = 1 ${userBatchFilter}
              AND (
                  (de.ai_risk_score >= 60 AND de.mentor_response IS NULL)
                  OR a.cumulative_pct < 75
                  OR (de.is_flagged = 1 AND de.mentor_response IS NULL)
              )
            ORDER BY de.ai_risk_score DESC
        `).all(...params);

        return res.json({ success: true, data: alerts });
    } catch (error) { next(error); }
};
