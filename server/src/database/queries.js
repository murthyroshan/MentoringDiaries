const db = require('./db');

// ─── User queries ─────────────────────────────────────────────────────────────

function findUserById(id) {
    return db.prepare(`
        SELECT id, email, name, role, department, section, roll_number, batch,
               current_semester, mentor_id, is_active, last_login, created_at
        FROM users WHERE id = ?
    `).get(id);
}

function findUserByEmail(email) {
    return db.prepare(`
        SELECT id, email, name, role, department, section, roll_number, batch,
               current_semester, mentor_id, is_active, last_login, created_at
        FROM users WHERE email = ?
    `).get(email);
}

function findUserByEmailWithPassword(email) {
    return db.prepare(`
        SELECT id, email, password_hash, name, role, department, section, roll_number, batch,
               current_semester, mentor_id, refresh_token, is_active, last_login, created_at
        FROM users WHERE email = ?
    `).get(email);
}

function updateUserRefreshToken(id, token) {
    return db.prepare('UPDATE users SET refresh_token = ? WHERE id = ?').run(token, id);
}

function updateUserLastLogin(id) {
    return db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(id);
}

function getAllMentors() {
    return db.prepare(`
        SELECT id, email, name, role, department, is_active
        FROM users WHERE role = 'mentor' AND is_active = 1
    `).all();
}

function getStudentsByMentor(mentorId) {
    return db.prepare(`
        SELECT id, email, name, department, section, roll_number, batch, current_semester
        FROM users WHERE mentor_id = ? AND role = 'student' AND is_active = 1
    `).all(mentorId);
}

// ─── Diary queries ────────────────────────────────────────────────────────────

function getEntriesByStudent(studentId, filters = {}) {
    let sql = `
        SELECT de.*,
               u.name as student_name, u.email as student_email,
               u.department as student_department, u.section as student_section,
               u.roll_number as student_roll_number, u.batch as student_batch,
               m.name as mentor_name, m.email as mentor_email
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        LEFT JOIN users m ON m.id = u.mentor_id
        WHERE de.student_id = ?
    `;
    const params = [studentId];

    if (filters.semester !== undefined) { sql += ' AND de.semester = ?'; params.push(filters.semester); }
    if (filters.week_number !== undefined) { sql += ' AND de.week_number = ?'; params.push(filters.week_number); }
    if (filters.status) { sql += ' AND de.status = ?'; params.push(filters.status); }
    if (filters.is_flagged !== undefined) { sql += ' AND de.is_flagged = ?'; params.push(filters.is_flagged); }

    sql += ' ORDER BY de.week_number DESC';
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }

    return db.prepare(sql).all(...params);
}

function getEntriesForMentor(mentorId, filters = {}) {
    let sql = `
        SELECT de.*,
               u.name as student_name, u.email as student_email,
               u.department as student_department, u.section as student_section,
               u.roll_number as student_roll_number, u.batch as student_batch,
               m.name as mentor_name, m.email as mentor_email
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        LEFT JOIN users m ON m.id = u.mentor_id
        WHERE u.mentor_id = ?
    `;
    const params = [mentorId];

    if (filters.student_id) { sql += ' AND de.student_id = ?'; params.push(filters.student_id); }
    if (filters.semester !== undefined) { sql += ' AND de.semester = ?'; params.push(filters.semester); }
    if (filters.status) { sql += ' AND de.status = ?'; params.push(filters.status); }
    if (filters.is_flagged !== undefined) { sql += ' AND de.is_flagged = ?'; params.push(filters.is_flagged); }

    sql += ' ORDER BY de.created_at DESC';
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }

    return db.prepare(sql).all(...params);
}

function getAllEntries(filters = {}) {
    let sql = `
        SELECT de.*,
               u.name as student_name, u.email as student_email,
               u.department as student_department, u.section as student_section,
               u.roll_number as student_roll_number, u.batch as student_batch,
               m.name as mentor_name, m.email as mentor_email
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        LEFT JOIN users m ON m.id = u.mentor_id
        WHERE 1=1
    `;
    const params = [];

    if (filters.student_id) { sql += ' AND de.student_id = ?'; params.push(filters.student_id); }
    if (filters.semester !== undefined) { sql += ' AND de.semester = ?'; params.push(filters.semester); }
    if (filters.status) { sql += ' AND de.status = ?'; params.push(filters.status); }
    if (filters.is_flagged !== undefined) { sql += ' AND de.is_flagged = ?'; params.push(filters.is_flagged); }
    if (filters.academic_year) { sql += ' AND de.academic_year = ?'; params.push(filters.academic_year); }

    sql += ' ORDER BY de.created_at DESC';
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }

    return db.prepare(sql).all(...params);
}

function countEntries(role, userId, filters = {}) {
    let sql;
    const params = [];

    if (role === 'student') {
        sql = 'SELECT COUNT(*) as n FROM diary_entries de JOIN users u ON u.id = de.student_id WHERE de.student_id = ?';
        params.push(userId);
    } else if (role === 'mentor') {
        sql = 'SELECT COUNT(*) as n FROM diary_entries de JOIN users u ON u.id = de.student_id WHERE u.mentor_id = ?';
        params.push(userId);
        if (filters.student_id) { sql += ' AND de.student_id = ?'; params.push(filters.student_id); }
    } else {
        sql = 'SELECT COUNT(*) as n FROM diary_entries de JOIN users u ON u.id = de.student_id WHERE 1=1';
        if (filters.student_id) { sql += ' AND de.student_id = ?'; params.push(filters.student_id); }
    }

    if (filters.status) { sql += ' AND de.status = ?'; params.push(filters.status); }
    if (filters.is_flagged !== undefined) { sql += ' AND de.is_flagged = ?'; params.push(filters.is_flagged); }

    return db.prepare(sql).get(...params).n;
}

function getEntryById(id) {
    return db.prepare(`
        SELECT de.*,
               u.name as student_name, u.email as student_email,
               u.department as student_department, u.section as student_section,
               u.roll_number as student_roll_number, u.batch as student_batch,
               m.name as mentor_name, m.email as mentor_email,
               m.department as mentor_department
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        LEFT JOIN users m ON m.id = u.mentor_id
        WHERE de.id = ?
    `).get(id);
}

function createEntry(data) {
    const stmt = db.prepare(`
        INSERT INTO diary_entries
            (student_id, week_number, academic_year, semester, start_date, end_date,
             mood, weekly_difficulty, attendance_pct, attendance_explanation,
             reflection, challenges, attachment_url,
             ai_risk_score, ai_sentiment, ai_risk_level, ai_flags, ai_summary,
             ai_key_concerns, ai_confidence, is_flagged, status,
             created_at, updated_at)
        VALUES
            (@student_id, @week_number, @academic_year, @semester, @start_date, @end_date,
             @mood, @weekly_difficulty, @attendance_pct, @attendance_explanation,
             @reflection, @challenges, @attachment_url,
             @ai_risk_score, @ai_sentiment, @ai_risk_level, @ai_flags, @ai_summary,
             @ai_key_concerns, @ai_confidence, @is_flagged, @status,
             datetime('now'), datetime('now'))
    `);
    const result = stmt.run(data);
    return result.lastInsertRowid;
}

function updateEntry(id, data) {
    data.updated_at = new Date().toISOString();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    data.id = id;
    return db.prepare(`UPDATE diary_entries SET ${fields} WHERE id = @id`).run(data);
}

function getSubjectRatings(entryId) {
    return db.prepare('SELECT * FROM diary_subject_ratings WHERE entry_id = ?').all(entryId);
}

function createSubjectRatings(entryId, ratings) {
    const stmt = db.prepare(`
        INSERT INTO diary_subject_ratings (entry_id, subject_name, rating, note)
        VALUES (@entry_id, @subject_name, @rating, @note)
    `);
    const insert = db.transaction((ratings) => {
        for (const r of ratings) {
            stmt.run({ entry_id: entryId, subject_name: r.subject_name || r.name, rating: r.rating, note: r.note || null });
        }
    });
    insert(ratings);
}

function deleteSubjectRatings(entryId) {
    return db.prepare('DELETE FROM diary_subject_ratings WHERE entry_id = ?').run(entryId);
}

// ─── Attendance queries ───────────────────────────────────────────────────────

function getAttendance(department, section, rollNumber, weekNumber, academicYear, semester) {
    return db.prepare(`
        SELECT * FROM attendance
        WHERE department = ? AND section = ? AND roll_number = ?
          AND week_number = ? AND academic_year = ? AND semester = ?
    `).get(department, section, rollNumber, weekNumber, academicYear, semester);
}

function getAttendanceHistory(department, section, rollNumber, academicYear, semester) {
    return db.prepare(`
        SELECT * FROM attendance
        WHERE department = ? AND section = ? AND roll_number = ?
          AND academic_year = ? AND semester = ?
        ORDER BY week_number ASC
    `).all(department, section, rollNumber, academicYear, semester);
}

// ─── Analytics queries ────────────────────────────────────────────────────────

function getRiskHistory(studentId, semester, academicYear) {
    return db.prepare(`
        SELECT week_number, ai_risk_score, ai_sentiment, mood, created_at
        FROM diary_entries
        WHERE student_id = ? AND semester = ? AND academic_year = ?
        ORDER BY week_number ASC
    `).all(studentId, semester, academicYear);
}

function getSubjectPerformance(studentId, semester, academicYear) {
    return db.prepare(`
        SELECT dsr.subject_name,
               AVG(dsr.rating) as avg_rating,
               COUNT(*) as entry_count
        FROM diary_subject_ratings dsr
        JOIN diary_entries de ON de.id = dsr.entry_id
        WHERE de.student_id = ? AND de.semester = ? AND de.academic_year = ?
        GROUP BY dsr.subject_name
        ORDER BY avg_rating DESC
    `).all(studentId, semester, academicYear);
}

function getSemesterHeatmap(studentId, academicYear, semester) {
    return db.prepare(`
        SELECT week_number, mood, ai_risk_score, ai_sentiment, status
        FROM diary_entries
        WHERE student_id = ? AND academic_year = ? AND semester = ?
        ORDER BY week_number ASC
    `).all(studentId, academicYear, semester);
}

// ─── Notification queries ─────────────────────────────────────────────────────

function getNotificationsByUser(userId) {
    return db.prepare(`
        SELECT * FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC
    `).all(userId);
}

function createNotification(userId, type, message, relatedId) {
    const result = db.prepare(`
        INSERT INTO notifications (user_id, type, message, related_id, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, type, message, relatedId || null);
    return result.lastInsertRowid;
}

function markNotificationRead(id, userId) {
    return db.prepare(`
        UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
    `).run(id, userId);
}

function markAllNotificationsRead(userId) {
    return db.prepare(`
        UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
    `).run(userId);
}

// ─── Session queries ──────────────────────────────────────────────────────────

function getSessionsByStudent(studentId, filters = {}) {
    let sql = `
        SELECT ms.*,
               m.name as mentor_name, m.email as mentor_email,
               s.name as student_name, s.email as student_email,
               s.department as student_department
        FROM mentoring_sessions ms
        JOIN users m ON m.id = ms.mentor_id
        JOIN users s ON s.id = ms.student_id
        WHERE ms.student_id = ?
        ORDER BY ms.scheduled_at DESC
    `;
    const params = [studentId];
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }
    return db.prepare(sql).all(...params);
}

function getSessionsByMentor(mentorId, filters = {}) {
    let sql = `
        SELECT ms.*,
               m.name as mentor_name, m.email as mentor_email,
               s.name as student_name, s.email as student_email,
               s.department as student_department
        FROM mentoring_sessions ms
        JOIN users m ON m.id = ms.mentor_id
        JOIN users s ON s.id = ms.student_id
        WHERE ms.mentor_id = ?
    `;
    const params = [mentorId];
    if (filters.student_id) { sql += ' AND ms.student_id = ?'; params.push(filters.student_id); }
    sql += ' ORDER BY ms.scheduled_at DESC';
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }
    return db.prepare(sql).all(...params);
}

function getAllSessions(filters = {}) {
    let sql = `
        SELECT ms.*,
               m.name as mentor_name, m.email as mentor_email,
               s.name as student_name, s.email as student_email,
               s.department as student_department
        FROM mentoring_sessions ms
        JOIN users m ON m.id = ms.mentor_id
        JOIN users s ON s.id = ms.student_id
        WHERE 1=1
    `;
    const params = [];
    if (filters.student_id) { sql += ' AND ms.student_id = ?'; params.push(filters.student_id); }
    sql += ' ORDER BY ms.scheduled_at DESC';
    if (filters.limit) { sql += ' LIMIT ? OFFSET ?'; params.push(filters.limit, filters.offset || 0); }
    return db.prepare(sql).all(...params);
}

function createSession(data) {
    const result = db.prepare(`
        INSERT INTO mentoring_sessions
            (mentor_id, student_id, scheduled_at, duration_mins, location, notes, action_items, status, created_at)
        VALUES
            (@mentor_id, @student_id, @scheduled_at, @duration_mins, @location, @notes, @action_items, @status, datetime('now'))
    `).run(data);
    return result.lastInsertRowid;
}

function getSessionById(id) {
    return db.prepare(`
        SELECT ms.*,
               m.name as mentor_name, m.email as mentor_email,
               s.name as student_name, s.email as student_email,
               s.department as student_department
        FROM mentoring_sessions ms
        JOIN users m ON m.id = ms.mentor_id
        JOIN users s ON s.id = ms.student_id
        WHERE ms.id = ?
    `).get(id);
}

function updateSession(id, data) {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    data.id = id;
    return db.prepare(`UPDATE mentoring_sessions SET ${fields} WHERE id = @id`).run(data);
}

// ─── Insights queries ─────────────────────────────────────────────────────────

function getLatestInsight(studentId, weekNumber, academicYear, semester) {
    return db.prepare(`
        SELECT * FROM weekly_insights
        WHERE student_id = ? AND week_number = ? AND academic_year = ? AND semester = ?
        ORDER BY created_at DESC LIMIT 1
    `).get(studentId, weekNumber, academicYear, semester);
}

function upsertInsight(data) {
    return db.prepare(`
        INSERT INTO weekly_insights (student_id, week_number, academic_year, semester, positive, warning, suggestion, created_at)
        VALUES (@student_id, @week_number, @academic_year, @semester, @positive, @warning, @suggestion, datetime('now'))
        ON CONFLICT(student_id, week_number, academic_year, semester)
        DO UPDATE SET positive = @positive, warning = @warning, suggestion = @suggestion, created_at = datetime('now')
    `).run(data);
}

// ─── Marks queries ────────────────────────────────────────────────────────────

function getMarksByStudent(studentId) {
    return db.prepare(`
        SELECT * FROM marks_entries WHERE student_id = ? ORDER BY semester ASC
    `).all(studentId);
}

function getMarksEntry(studentId, semester, academicYear) {
    return db.prepare(`
        SELECT * FROM marks_entries
        WHERE student_id = ? AND semester = ? AND academic_year = ?
    `).get(studentId, semester, academicYear);
}

function createMarksEntry(data) {
    const result = db.prepare(`
        INSERT INTO marks_entries (student_id, semester, academic_year, cgpa, submission_count, created_at, updated_at)
        VALUES (@student_id, @semester, @academic_year, @cgpa, 1, datetime('now'), datetime('now'))
    `).run(data);
    return result.lastInsertRowid;
}

function updateMarksEntry(id, data) {
    data.updated_at = new Date().toISOString();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    data.id = id;
    return db.prepare(`UPDATE marks_entries SET ${fields} WHERE id = @id`).run(data);
}

function getMarkSubjects(marksEntryId) {
    return db.prepare('SELECT * FROM marks_subjects WHERE marks_entry_id = ?').all(marksEntryId);
}

function deleteMarkSubjects(marksEntryId) {
    return db.prepare('DELETE FROM marks_subjects WHERE marks_entry_id = ?').run(marksEntryId);
}

function insertMarkSubjects(marksEntryId, subjects) {
    const stmt = db.prepare(`
        INSERT INTO marks_subjects (marks_entry_id, subject_name, grade)
        VALUES (@marks_entry_id, @subject_name, @grade)
    `);
    const insert = db.transaction((subjects) => {
        for (const s of subjects) {
            stmt.run({ marks_entry_id: marksEntryId, subject_name: s.subject_name || s.name, grade: s.grade });
        }
    });
    insert(subjects);
}

// ─── Achievement queries ──────────────────────────────────────────────────────

function getAchievementsByStudent(studentId, semester, academicYear) {
    let sql = 'SELECT * FROM achievements WHERE student_id = ?';
    const params = [studentId];
    if (semester !== undefined) { sql += ' AND semester = ?'; params.push(semester); }
    if (academicYear) { sql += ' AND academic_year = ?'; params.push(academicYear); }
    sql += ' ORDER BY date DESC';
    return db.prepare(sql).all(...params);
}

function createAchievement(data) {
    const result = db.prepare(`
        INSERT INTO achievements (student_id, semester, academic_year, type, title, description, date, proof_url, created_at)
        VALUES (@student_id, @semester, @academic_year, @type, @title, @description, @date, @proof_url, datetime('now'))
    `).run(data);
    return result.lastInsertRowid;
}

function getAchievementCount(studentId, semester, academicYear) {
    return db.prepare(`
        SELECT COUNT(*) as n FROM achievements
        WHERE student_id = ? AND semester = ? AND academic_year = ?
    `).get(studentId, semester, academicYear).n;
}

function getAchievementById(id) {
    return db.prepare('SELECT * FROM achievements WHERE id = ?').get(id);
}

function deleteAchievement(id) {
    return db.prepare('DELETE FROM achievements WHERE id = ?').run(id);
}

module.exports = {
    // Users
    findUserById,
    findUserByEmail,
    findUserByEmailWithPassword,
    updateUserRefreshToken,
    updateUserLastLogin,
    getAllMentors,
    getStudentsByMentor,

    // Diary
    getEntriesByStudent,
    getEntriesForMentor,
    getAllEntries,
    countEntries,
    getEntryById,
    createEntry,
    updateEntry,
    getSubjectRatings,
    createSubjectRatings,
    deleteSubjectRatings,

    // Attendance
    getAttendance,
    getAttendanceHistory,

    // Analytics
    getRiskHistory,
    getSubjectPerformance,
    getSemesterHeatmap,

    // Notifications
    getNotificationsByUser,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,

    // Sessions
    getSessionsByStudent,
    getSessionsByMentor,
    getAllSessions,
    createSession,
    getSessionById,
    updateSession,

    // Insights
    getLatestInsight,
    upsertInsight,

    // Marks
    getMarksByStudent,
    getMarksEntry,
    createMarksEntry,
    updateMarksEntry,
    getMarkSubjects,
    deleteMarkSubjects,
    insertMarkSubjects,

    // Achievements
    getAchievementsByStudent,
    createAchievement,
    getAchievementCount,
    getAchievementById,
    deleteAchievement,
};
