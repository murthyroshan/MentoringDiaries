const db = require('./db');

function getSubjectConcerns(mentorId, limit = 5) {
    return db.prepare(`
        SELECT dsr.subject_name,
               COUNT(*) as concern_count,
               AVG(dsr.rating) as avg_rating
        FROM diary_subject_ratings dsr
        INNER JOIN diary_entries de ON de.id = dsr.entry_id
        INNER JOIN users u ON u.id = de.student_id
        WHERE u.mentor_id = ? AND dsr.rating <= 2
        GROUP BY dsr.subject_name
        ORDER BY concern_count DESC
        LIMIT ?
    `).all(mentorId, limit);
}

function getDashboardWatchlist(mentorId, limit = 10) {
    return db.prepare(`
        SELECT u.id as student_id, u.name, u.department, u.section, u.roll_number,
               a.cumulative_pct, a.weekly_pct
        FROM users u
        INNER JOIN (
            SELECT department, section, roll_number, cumulative_pct, weekly_pct, MAX(week_number)
            FROM attendance
            GROUP BY department, section, roll_number
        ) a ON a.department = u.department AND a.section = u.section AND a.roll_number = u.roll_number
        WHERE u.mentor_id = ? AND (a.cumulative_pct < 75 OR a.weekly_pct < a.cumulative_pct)
        ORDER BY a.cumulative_pct ASC
        LIMIT ?
    `).all(mentorId, limit);
}

function getStudentRiskComparison(mentorId, limitWeeks = 8) {
    return db.prepare(`
        SELECT u.id as student_id, u.name,
               de.week_number, de.ai_risk_score
        FROM diary_entries de
        INNER JOIN users u ON u.id = de.student_id
        WHERE u.mentor_id = ?
        ORDER BY de.week_number ASC
    `).all(mentorId);
}

console.log("Subject Concerns:", getSubjectConcerns(107));
console.log("Watchlist:", getDashboardWatchlist(107));
console.log("Risk Comp:", getStudentRiskComparison(107).slice(-5));
