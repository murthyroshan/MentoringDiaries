const db = require('../database/db');
const queries = require('../database/queries');
const { generateMentorSuggestion } = require('../services/aiService');
const { notifyUserWithPersistence } = require('../socket');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentAcademicYear() {
    const now = new Date();
    const y = now.getFullYear();
    return now.getMonth() >= 5
        ? `${y}-${String(y + 1).slice(2)}`
        : `${y - 1}-${String(y).slice(2)}`;
}

function currentWeekNumber() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / 86400000);
    return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function safeJson(val, fallback = []) {
    try { return val ? JSON.parse(val) : fallback; } catch { return fallback; }
}

function daysAgo(dateStr) {
    if (!dateStr) return null;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// Validate student belongs to this mentor
function assertStudentBelongsToMentor(mentorId, studentId) {
    const student = db.prepare('SELECT mentor_id FROM users WHERE id = ? AND role = ?').get(studentId, 'student');
    if (!student || student.mentor_id !== mentorId) return false;
    return true;
}

// ─── 1. GET /api/mentor/dashboard-summary ────────────────────────────────────

exports.getDashboardSummary = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const yr = currentAcademicYear();

        // Mentor info
        const mentor = db.prepare('SELECT id, name, department, email FROM users WHERE id = ?').get(mentorId);

        // All assigned students
        const students = db.prepare(
            'SELECT id, name, department, section, roll_number, batch, current_semester FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');
        const studentIds = students.map(s => s.id);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) {
            return res.json({
                success: true,
                data: {
                    mentor: { id: mentor.id, name: mentor.name, department: mentor.department, email: mentor.email },
                    stats: {
                        total_students: 0, pending_reviews: 0, reviewed_this_week: 0,
                        reviewed_this_semester: 0, avg_response_time_days: 0,
                        platform_avg_response_time_days: 0, review_rate_pct: 0,
                        flagged_unreviewed: 0, critical_risk_count: 0, high_risk_count: 0,
                        below_75_attendance_count: 0, students_not_submitted_this_week: 0,
                    },
                    weekly_digest: {
                        week_number: currentWeekNumber(), new_entries: 0, flagged_entries: 0,
                        students_missed_2_plus_weeks: [], avg_risk_this_week: 0,
                        avg_risk_last_week: 0, risk_delta: 0,
                    },
                },
            });
        }

        const idList = studentIds.join(',');

        // Pending reviews
        const pendingReviews = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND mentor_response IS NULL`
        ).get().n;

        // Semester entries
        const semEntries = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND academic_year = ?`
        ).get(yr).n;

        // Reviewed entries this semester
        const reviewedSem = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND academic_year = ? AND mentor_response IS NOT NULL`
        ).get(yr).n;

        // Review rate
        const reviewRatePct = semEntries > 0 ? Math.round((reviewedSem / semEntries) * 100) : 0;

        // Current week number (ISO-ish week for current academic context)
        const now = new Date();
        const weekNum = currentWeekNumber();

        // Reviewed this week
        const reviewedThisWeek = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ? AND mentor_response IS NOT NULL`
        ).get(weekNum).n;

        // Avg response time (mentor)
        const avgRespRow = db.prepare(
            `SELECT AVG(CAST((julianday(mentor_responded_at) - julianday(created_at)) AS REAL)) as avg_days
             FROM diary_entries WHERE student_id IN (${idList}) AND mentor_response IS NOT NULL AND mentor_responded_at IS NOT NULL`
        ).get();
        const avgResponseTimeDays = avgRespRow.avg_days != null ? Math.round(avgRespRow.avg_days * 10) / 10 : 0;

        // Platform avg response time
        const platAvgRow = db.prepare(
            `SELECT AVG(CAST((julianday(mentor_responded_at) - julianday(created_at)) AS REAL)) as avg_days
             FROM diary_entries WHERE mentor_response IS NOT NULL AND mentor_responded_at IS NOT NULL`
        ).get();
        const platformAvgResponseTimeDays = platAvgRow.avg_days != null ? Math.round(platAvgRow.avg_days * 10) / 10 : 0;

        // Flagged unreviewed
        const flaggedUnreviewed = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND is_flagged = 1 AND mentor_response IS NULL`
        ).get().n;

        // Critical & high risk (latest entry per student)
        const latestRiskRows = db.prepare(
            `SELECT student_id, ai_risk_level FROM diary_entries WHERE student_id IN (${idList})
             GROUP BY student_id HAVING MAX(created_at)`
        ).all();
        const criticalRiskCount = latestRiskRows.filter(r => r.ai_risk_level === 'critical').length;
        const highRiskCount = latestRiskRows.filter(r => r.ai_risk_level === 'high').length;

        // Below 75% attendance
        const below75Rows = db.prepare(
            `SELECT u.id FROM users u
             JOIN attendance a ON a.department = u.department AND a.section = u.section AND a.roll_number = u.roll_number
             WHERE u.id IN (${idList}) AND a.cumulative_pct < 75
             GROUP BY u.id`
        ).all();
        const below75Count = below75Rows.length;

        // Students not submitted this week
        const submittedThisWeek = db.prepare(
            `SELECT DISTINCT student_id FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ?`
        ).all(weekNum).map(r => r.student_id);
        const notSubmittedThisWeek = totalStudents - submittedThisWeek.length;

        // Weekly digest — entries this week
        const newEntriesThisWeek = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ?`
        ).get(weekNum).n;
        const flaggedThisWeek = db.prepare(
            `SELECT COUNT(*) as n FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ? AND is_flagged = 1`
        ).get(weekNum).n;

        // Avg risk this week vs last week
        const avgRiskThisWeekRow = db.prepare(
            `SELECT AVG(ai_risk_score) as avg FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ?`
        ).get(weekNum);
        const avgRiskLastWeekRow = db.prepare(
            `SELECT AVG(ai_risk_score) as avg FROM diary_entries WHERE student_id IN (${idList}) AND week_number = ?`
        ).get(weekNum - 1);
        const avgRiskThisWeek = Math.round(avgRiskThisWeekRow.avg || 0);
        const avgRiskLastWeek = Math.round(avgRiskLastWeekRow.avg || 0);

        // Students missed 2+ consecutive weeks
        const allEntryWeeks = db.prepare(
            `SELECT student_id, week_number FROM diary_entries WHERE student_id IN (${idList}) AND academic_year = ?`
        ).all(yr);
        const weeksByStudent = {};
        for (const row of allEntryWeeks) {
            if (!weeksByStudent[row.student_id]) weeksByStudent[row.student_id] = new Set();
            weeksByStudent[row.student_id].add(row.week_number);
        }
        const studentsMissed2Plus = [];
        for (const s of students) {
            const submitted = weeksByStudent[s.id] || new Set();
            let missedCount = 0;
            for (let w = weekNum - 1; w >= Math.max(1, weekNum - 4); w--) {
                if (!submitted.has(w)) missedCount++;
                else break;
            }
            if (missedCount >= 2) studentsMissed2Plus.push({ id: s.id, name: s.name, missed_count: missedCount });
        }

        return res.json({
            success: true,
            data: {
                mentor: { id: mentor.id, name: mentor.name, department: mentor.department, email: mentor.email },
                stats: {
                    total_students: totalStudents,
                    pending_reviews: pendingReviews,
                    reviewed_this_week: reviewedThisWeek,
                    reviewed_this_semester: reviewedSem,
                    avg_response_time_days: avgResponseTimeDays,
                    platform_avg_response_time_days: platformAvgResponseTimeDays,
                    review_rate_pct: reviewRatePct,
                    flagged_unreviewed: flaggedUnreviewed,
                    critical_risk_count: criticalRiskCount,
                    high_risk_count: highRiskCount,
                    below_75_attendance_count: below75Count,
                    students_not_submitted_this_week: notSubmittedThisWeek,
                },
                weekly_digest: {
                    week_number: weekNum,
                    new_entries: newEntriesThisWeek,
                    flagged_entries: flaggedThisWeek,
                    students_missed_2_plus_weeks: studentsMissed2Plus,
                    avg_risk_this_week: avgRiskThisWeek,
                    avg_risk_last_week: avgRiskLastWeek,
                    risk_delta: avgRiskThisWeek - avgRiskLastWeek,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ─── 2. GET /api/mentor/priority-queue ────────────────────────────────────────

exports.getPriorityQueue = (req, res, next) => {
    try {
        const mentorId = req.user.id;

        const entries = db.prepare(`
            SELECT de.*,
                   u.name as student_name, u.department as student_dept,
                   u.section as student_section, u.roll_number as student_roll,
                   u.email as student_email, u.batch as student_batch
            FROM diary_entries de
            JOIN users u ON u.id = de.student_id
            WHERE u.mentor_id = ? AND de.mentor_response IS NULL
            ORDER BY de.created_at DESC
        `).all(mentorId);

        const now = Date.now();
        const enriched = entries.map(e => {
            const daysSince = Math.floor((now - new Date(e.created_at).getTime()) / 86400000);
            const urgency = Math.round((e.ai_risk_score * 0.5) + (e.is_flagged * 30) + (daysSince * 2));

            // Latest attendance
            const attRow = u_attendance(u_roll(e), e.student_dept, e.student_section);
            const attendancePct = attRow ? attRow.cumulative_pct : null;

            // Subject ratings
            const subjectRatings = queries.getSubjectRatings(e.id);

            return {
                id: e.id,
                week_number: e.week_number,
                start_date: e.start_date,
                end_date: e.end_date,
                mood: e.mood,
                reflection: e.reflection,
                ai_risk_score: e.ai_risk_score,
                ai_risk_level: e.ai_risk_level,
                ai_sentiment: e.ai_sentiment,
                ai_flags: safeJson(e.ai_flags),
                ai_summary: e.ai_summary,
                is_flagged: e.is_flagged,
                created_at: e.created_at,
                student_id: e.student_id,
                student_name: e.student_name,
                student_dept: e.student_dept,
                student_section: e.student_section,
                student_roll: e.student_roll,
                student_batch: e.student_batch,
                attendance_pct: attendancePct != null ? Math.round(attendancePct * 10) / 10 : null,
                subject_ratings: subjectRatings,
                urgency_score: urgency,
                days_since_submitted: daysSince,
            };
        });

        enriched.sort((a, b) => b.urgency_score - a.urgency_score);

        return res.json({ success: true, data: enriched, count: enriched.length });
    } catch (error) {
        next(error);
    }
};

function u_roll(e) { return e.student_roll; }
function u_attendance(roll, dept, section) {
    if (!roll || !dept || !section) return null;
    return db.prepare(
        'SELECT cumulative_pct FROM attendance WHERE department = ? AND section = ? AND roll_number = ? ORDER BY week_number DESC LIMIT 1'
    ).get(dept, section, roll);
}

// ─── 3. GET /api/mentor/students-roster ──────────────────────────────────────

exports.getStudentsRoster = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const weekNum = currentWeekNumber();

        const students = db.prepare(
            'SELECT id, name, email, department, section, roll_number, batch, current_semester FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');

        const roster = students.map(s => {
            // Last 4 entries
            const recentEntries = db.prepare(
                'SELECT ai_risk_score, mood, created_at, week_number, mentor_response FROM diary_entries WHERE student_id = ? ORDER BY created_at DESC LIMIT 4'
            ).all(s.id);

            const latestEntry = recentEntries[0] || null;
            const riskTrend = recentEntries.map(e => e.ai_risk_score || 0).reverse();

            // Pending reviews (no mentor_response)
            const pendingReviews = recentEntries.filter(e => !e.mentor_response).length;

            // Total entries this semester
            const totalEntries = db.prepare(
                'SELECT COUNT(*) as n FROM diary_entries WHERE student_id = ?'
            ).get(s.id).n;

            // Last submitted
            const lastSubmittedAt = latestEntry ? latestEntry.created_at : null;
            const daysSinceSubmission = lastSubmittedAt ? daysAgo(lastSubmittedAt) : null;

            // Streak
            const allWeeks = db.prepare(
                'SELECT week_number FROM diary_entries WHERE student_id = ? ORDER BY week_number DESC LIMIT 16'
            ).all(s.id).map(r => r.week_number);
            let streak = 0;
            for (let i = 0; i < allWeeks.length; i++) {
                if (i === 0 || allWeeks[i - 1] - allWeeks[i] === 1) streak++;
                else break;
            }

            // Attendance
            const attRow = u_attendance(s.roll_number, s.department, s.section);
            const currentAttendancePct = attRow ? Math.round(attRow.cumulative_pct * 10) / 10 : null;

            // Attendance trend (last 3 weeks)
            const attHistory = db.prepare(
                'SELECT cumulative_pct, week_number FROM attendance WHERE department = ? AND section = ? AND roll_number = ? ORDER BY week_number DESC LIMIT 3'
            ).all(s.department, s.section, s.roll_number);
            let attendanceTrend = 'stable';
            if (attHistory.length >= 2) {
                const diff = attHistory[0].cumulative_pct - attHistory[attHistory.length - 1].cumulative_pct;
                if (diff > 2) attendanceTrend = 'rising';
                else if (diff < -2) attendanceTrend = 'falling';
            }

            // Flagged (any unreviewed flagged entry)
            const isFlagged = db.prepare(
                'SELECT 1 FROM diary_entries WHERE student_id = ? AND is_flagged = 1 AND mentor_response IS NULL LIMIT 1'
            ).get(s.id) ? true : false;

            // Missed this week
            const missedThisWeek = !db.prepare(
                'SELECT 1 FROM diary_entries WHERE student_id = ? AND week_number = ? LIMIT 1'
            ).get(s.id, weekNum);

            return {
                id: s.id,
                name: s.name,
                email: s.email,
                department: s.department,
                section: s.section,
                roll_number: s.roll_number,
                current_semester: s.current_semester,
                batch: s.batch,
                health: {
                    latest_risk_score: latestEntry ? latestEntry.ai_risk_score : null,
                    risk_trend: riskTrend,
                    latest_mood: latestEntry ? latestEntry.mood : null,
                    current_attendance_pct: currentAttendancePct,
                    attendance_trend: attendanceTrend,
                    total_entries_this_sem: totalEntries,
                    pending_reviews: pendingReviews,
                    last_submitted_at: lastSubmittedAt,
                    days_since_submission: daysSinceSubmission,
                    streak,
                    is_flagged: isFlagged,
                    below_75_attendance: currentAttendancePct != null && currentAttendancePct < 75,
                    missed_this_week: missedThisWeek,
                },
            };
        });

        return res.json({ success: true, data: roster, count: roster.length });
    } catch (error) {
        next(error);
    }
};

// ─── 4. GET /api/mentor/flagged-students ──────────────────────────────────────

exports.getFlaggedStudents = (req, res, next) => {
    try {
        const mentorId = req.user.id;

        const students = db.prepare(
            'SELECT id, name, email, department, section, roll_number, batch, current_semester FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');

        const flagged = [];

        for (const s of students) {
            const reasons = [];

            // Latest entry risk
            const latestEntry = db.prepare(
                'SELECT id, ai_risk_score, ai_risk_level, week_number, mentor_response FROM diary_entries WHERE student_id = ? ORDER BY created_at DESC LIMIT 1'
            ).get(s.id);
            const riskScore = latestEntry ? latestEntry.ai_risk_score : 0;

            if (riskScore >= 60) reasons.push('high_risk');

            // Flagged unreviewed entry
            const flaggedEntry = db.prepare(
                'SELECT id, week_number FROM diary_entries WHERE student_id = ? AND is_flagged = 1 AND mentor_response IS NULL ORDER BY created_at DESC LIMIT 1'
            ).get(s.id);
            if (flaggedEntry) reasons.push('flagged_entry');

            // Attendance
            const attRow = u_attendance(s.roll_number, s.department, s.section);
            const currentAttendancePct = attRow ? Math.round(attRow.cumulative_pct * 10) / 10 : null;
            if (currentAttendancePct != null && currentAttendancePct < 75) reasons.push('low_attendance');

            if (reasons.length === 0) continue;

            // Pending entries (unreviewed)
            const pendingEntries = db.prepare(
                'SELECT id, week_number FROM diary_entries WHERE student_id = ? AND mentor_response IS NULL ORDER BY week_number DESC'
            ).all(s.id);

            flagged.push({
                id: s.id,
                name: s.name,
                email: s.email,
                department: s.department,
                section: s.section,
                roll_number: s.roll_number,
                latest_risk_score: riskScore,
                latest_entry_id: latestEntry ? latestEntry.id : null,
                flagged_entry_id: flaggedEntry ? flaggedEntry.id : null,
                current_attendance_pct: currentAttendancePct,
                reasons,
                pending_entries: pendingEntries,
            });
        }

        flagged.sort((a, b) => b.latest_risk_score - a.latest_risk_score);

        return res.json({ success: true, data: flagged, count: flagged.length });
    } catch (error) {
        next(error);
    }
};

// ─── 5. GET /api/mentor/attendance-watchlist ──────────────────────────────────

exports.getAttendanceWatchlist = (req, res, next) => {
    try {
        const mentorId = req.user.id;

        const students = db.prepare(
            'SELECT id, name, email, department, section, roll_number, batch FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');

        const watchlist = [];

        for (const s of students) {
            const attHistory = db.prepare(
                'SELECT week_number, cumulative_pct, weekly_pct FROM attendance WHERE department = ? AND section = ? AND roll_number = ? ORDER BY week_number DESC LIMIT 6'
            ).all(s.department, s.section, s.roll_number);

            if (attHistory.length === 0) continue;

            const latest = attHistory[0].cumulative_pct;
            const isBelow75 = latest < 75;

            // Declining for 3+ weeks
            let declining = false;
            if (attHistory.length >= 3) {
                const last3 = attHistory.slice(0, 3).map(r => r.cumulative_pct);
                declining = last3[0] < last3[1] && last3[1] < last3[2];
            }

            if (!isBelow75 && !declining) continue;

            // Trend direction
            let trendDirection = 'stable';
            if (attHistory.length >= 2) {
                const diff = attHistory[0].cumulative_pct - attHistory[attHistory.length - 1].cumulative_pct;
                if (diff > 2) trendDirection = 'rising';
                else if (diff < -2) trendDirection = 'falling';
            }

            watchlist.push({
                id: s.id,
                name: s.name,
                email: s.email,
                department: s.department,
                section: s.section,
                roll_number: s.roll_number,
                batch: s.batch,
                current_cumulative_pct: Math.round(latest * 10) / 10,
                trend_direction: trendDirection,
                is_below_75: isBelow75,
                is_declining: declining,
                attendance_history: attHistory.reverse().map(r => ({
                    week_number: r.week_number,
                    cumulative_pct: Math.round(r.cumulative_pct * 10) / 10,
                    weekly_pct: Math.round(r.weekly_pct * 10) / 10,
                })),
            });
        }

        return res.json({ success: true, data: watchlist, count: watchlist.length });
    } catch (error) {
        next(error);
    }
};

// ─── 6. GET /api/mentor/subject-concerns ──────────────────────────────────────

exports.getSubjectConcerns = (req, res, next) => {
    try {
        const mentorId = req.user.id;

        const students = db.prepare(
            'SELECT id FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');
        const studentIds = students.map(s => s.id);
        const totalStudents = studentIds.length;

        if (totalStudents === 0) return res.json({ success: true, data: [] });

        const idList = studentIds.join(',');

        // Last 4 entries per student
        const subjectRows = db.prepare(`
            SELECT dsr.subject_name, dsr.rating, dsr.entry_id, de.student_id, de.week_number
            FROM diary_subject_ratings dsr
            JOIN diary_entries de ON de.id = dsr.entry_id
            WHERE de.student_id IN (${idList})
              AND de.id IN (
                SELECT id FROM diary_entries WHERE student_id = de.student_id ORDER BY created_at DESC LIMIT 4
              )
        `).all();

        // Group by subject
        const bySubject = {};
        for (const row of subjectRows) {
            if (!bySubject[row.subject_name]) {
                bySubject[row.subject_name] = { ratings: [], students: new Set(), weeklyRatings: {} };
            }
            bySubject[row.subject_name].ratings.push(row.rating);
            bySubject[row.subject_name].students.add(row.student_id);
            const key = `${row.student_id}_${row.week_number}`;
            if (!bySubject[row.subject_name].weeklyRatings[key]) {
                bySubject[row.subject_name].weeklyRatings[key] = row.rating;
            }
        }

        const concerns = Object.entries(bySubject).map(([subject_name, data]) => {
            const avgRating = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
            const studentsRatingBelow3 = data.ratings.filter(r => r < 3).length;
            const pctStruggling = Math.round((studentsRatingBelow3 / totalStudents) * 100);

            // Consecutive low weeks (simplified: any student with 2+ consecutive low-rated weeks)
            let consecutiveLowWeeks = 0;
            // Group by student, check consecutive weeks
            const byStudent = {};
            for (const [key, rating] of Object.entries(data.weeklyRatings)) {
                const [studentId, weekNum] = key.split('_').map(Number);
                if (!byStudent[studentId]) byStudent[studentId] = [];
                byStudent[studentId].push({ weekNum, rating });
            }
            for (const weeks of Object.values(byStudent)) {
                weeks.sort((a, b) => a.weekNum - b.weekNum);
                let consec = 0, maxConsec = 0;
                for (const w of weeks) {
                    if (w.rating < 3) consec++;
                    else consec = 0;
                    maxConsec = Math.max(maxConsec, consec);
                }
                consecutiveLowWeeks = Math.max(consecutiveLowWeeks, maxConsec);
            }

            return {
                subject_name,
                avg_rating: Math.round(avgRating * 10) / 10,
                students_rating_below_3: studentsRatingBelow3,
                pct_of_students_struggling: pctStruggling,
                consecutive_low_weeks: consecutiveLowWeeks,
            };
        });

        concerns.sort((a, b) => a.avg_rating - b.avg_rating);

        return res.json({ success: true, data: concerns });
    } catch (error) {
        next(error);
    }
};

// ─── 7. GET /api/mentor/student-comparison ────────────────────────────────────

exports.getStudentComparison = (req, res, next) => {
    try {
        const mentorId = req.user.id;

        const students = db.prepare(
            'SELECT id, name, roll_number, section, department FROM users WHERE mentor_id = ? AND role = ? AND is_active = 1'
        ).all(mentorId, 'student');

        const result = students.map(s => {
            const riskHistory = db.prepare(
                'SELECT week_number, ai_risk_score FROM diary_entries WHERE student_id = ? ORDER BY week_number DESC LIMIT 8'
            ).all(s.id).reverse();

            return {
                id: s.id,
                name: s.name,
                roll_number: s.roll_number,
                section: s.section,
                department: s.department,
                risk_history: riskHistory.map(r => ({
                    week_number: r.week_number,
                    ai_risk_score: r.ai_risk_score || 0,
                })),
            };
        });

        return res.json({ success: true, data: { students: result } });
    } catch (error) {
        next(error);
    }
};

// ─── 8. GET /api/mentor/students/:id/timeline ────────────────────────────────

exports.getStudentTimeline = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const studentId = Number(req.params.id);

        if (!assertStudentBelongsToMentor(mentorId, studentId)) {
            return res.status(403).json({ success: false, message: 'Access denied for this student.' });
        }

        // Diary entries
        const entries = db.prepare(
            'SELECT * FROM diary_entries WHERE student_id = ? ORDER BY created_at DESC LIMIT 30'
        ).all(studentId);

        const entryItems = entries.map(e => ({
            type: 'entry',
            date: e.created_at,
            data: {
                ...e,
                ai_flags: safeJson(e.ai_flags),
                ai_key_concerns: safeJson(e.ai_key_concerns),
                subject_ratings: queries.getSubjectRatings(e.id),
            },
        }));

        // Sessions
        const sessions = db.prepare(
            'SELECT * FROM mentoring_sessions WHERE student_id = ? AND mentor_id = ? ORDER BY scheduled_at DESC LIMIT 20'
        ).all(studentId, mentorId);

        const sessionItems = sessions.map(s => ({
            type: 'session',
            date: s.scheduled_at,
            data: { ...s, action_items: safeJson(s.action_items) },
        }));

        // Combine and sort
        const timeline = [...entryItems, ...sessionItems].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return res.json({ success: true, data: timeline });
    } catch (error) {
        next(error);
    }
};

// ─── 9. POST /api/mentor/sessions ────────────────────────────────────────────
// Delegates to existing session controller logic but validates student ownership

exports.createMentorSession = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const { student_id, scheduled_at, duration_mins, location, notes } = req.body;

        if (!student_id) return res.status(400).json({ success: false, message: 'student_id is required.' });
        if (!scheduled_at) return res.status(400).json({ success: false, message: 'scheduled_at is required.' });

        if (!assertStudentBelongsToMentor(mentorId, Number(student_id))) {
            return res.status(403).json({ success: false, message: 'Access denied for this student.' });
        }

        const sessionId = queries.createSession({
            mentor_id: mentorId,
            student_id: Number(student_id),
            scheduled_at: new Date(scheduled_at).toISOString(),
            duration_mins: duration_mins ? Number(duration_mins) : null,
            location: location || null,
            notes: notes || null,
            action_items: '[]',
            status: 'scheduled',
        });

        notifyUserWithPersistence(Number(student_id), {
            type: 'session:update',
            title: 'Mentoring Session Scheduled',
            message: 'Your mentor has scheduled a session with you.',
            metadata: { sessionId },
        });

        const session = queries.getSessionById(sessionId);
        return res.status(201).json({ success: true, data: session, message: 'Session created.' });
    } catch (error) {
        next(error);
    }
};

// ─── 10. PATCH /api/mentor/sessions/:id ──────────────────────────────────────

exports.updateMentorSession = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const sessionId = Number(req.params.id);
        const session = queries.getSessionById(sessionId);

        if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
        if (session.mentor_id !== mentorId) {
            return res.status(403).json({ success: false, message: 'Only the owning mentor can update this session.' });
        }

        const updates = {};
        const { notes, action_items, status, duration_mins } = req.body;
        if (notes !== undefined) updates.notes = notes;
        if (duration_mins !== undefined) updates.duration_mins = Number(duration_mins);
        if (action_items !== undefined) updates.action_items = JSON.stringify(Array.isArray(action_items) ? action_items : []);
        if (status !== undefined) updates.status = status;

        queries.updateSession(sessionId, updates);

        if (status === 'cancelled') {
            notifyUserWithPersistence(session.student_id, {
                type: 'session:update',
                title: 'Session Cancelled',
                message: 'Your mentoring session has been cancelled.',
                metadata: { sessionId },
            });
        }

        const updated = queries.getSessionById(sessionId);
        return res.json({ success: true, data: updated, message: 'Session updated.' });
    } catch (error) {
        next(error);
    }
};

// ─── 11. POST /api/mentor/bulk-action ────────────────────────────────────────

exports.bulkAction = (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const { student_ids, action, scheduled_at, duration_mins, location } = req.body;

        if (!Array.isArray(student_ids) || student_ids.length === 0) {
            return res.status(400).json({ success: false, message: 'student_ids array is required.' });
        }
        if (!['flag_for_admin', 'send_reminder', 'schedule_group_session'].includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action.' });
        }

        // Validate all students belong to this mentor
        for (const sid of student_ids) {
            if (!assertStudentBelongsToMentor(mentorId, Number(sid))) {
                return res.status(403).json({ success: false, message: `Student ${sid} is not assigned to you.` });
            }
        }

        const mentorName = req.user.name;
        let results = [];

        if (action === 'send_reminder') {
            for (const sid of student_ids) {
                queries.createNotification(
                    Number(sid),
                    'mentor:reminder',
                    'Your mentor has sent you a reminder to submit your diary.',
                    null
                );
                notifyUserWithPersistence(Number(sid), {
                    type: 'mentor:reminder',
                    title: 'Diary Reminder',
                    message: 'Your mentor has sent you a reminder to submit your diary.',
                    metadata: {},
                });
            }
            results = student_ids;
        } else if (action === 'flag_for_admin') {
            const studentNames = student_ids.map(sid => {
                const s = db.prepare('SELECT name FROM users WHERE id = ?').get(Number(sid));
                return s ? s.name : `Student ${sid}`;
            });
            const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND is_active = 1").all();
            const msg = `Mentor ${mentorName} flagged these students for attention: ${studentNames.join(', ')}`;
            for (const admin of admins) {
                queries.createNotification(admin.id, 'admin:flag', msg, null);
                notifyUserWithPersistence(admin.id, {
                    type: 'admin:flag',
                    title: 'Students Flagged',
                    message: msg,
                    metadata: { student_ids },
                });
            }
            results = student_ids;
        } else if (action === 'schedule_group_session') {
            if (!scheduled_at) return res.status(400).json({ success: false, message: 'scheduled_at is required for group sessions.' });
            for (const sid of student_ids) {
                const sessionId = queries.createSession({
                    mentor_id: mentorId,
                    student_id: Number(sid),
                    scheduled_at: new Date(scheduled_at).toISOString(),
                    duration_mins: duration_mins ? Number(duration_mins) : null,
                    location: location || null,
                    notes: 'Group session',
                    action_items: '[]',
                    status: 'scheduled',
                });
                notifyUserWithPersistence(Number(sid), {
                    type: 'session:update',
                    title: 'Group Session Scheduled',
                    message: 'A group mentoring session has been scheduled.',
                    metadata: { sessionId },
                });
                results.push(sessionId);
            }
        }

        return res.json({ success: true, message: `Bulk action '${action}' completed.`, data: results });
    } catch (error) {
        next(error);
    }
};

// ─── 12. GET /api/mentor/ai-suggestion/:entryId ───────────────────────────────

exports.getAiSuggestion = async (req, res, next) => {
    try {
        const mentorId = req.user.id;
        const entryId = Number(req.params.entryId);

        const entry = queries.getEntryById(entryId);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found.' });

        if (!assertStudentBelongsToMentor(mentorId, entry.student_id)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const suggestion = await generateMentorSuggestion({
            content: entry.reflection,
            aiAnalysis: {
                summary: entry.ai_summary,
                sentiment: entry.ai_sentiment,
                riskLevel: entry.ai_risk_level,
                keyConcerns: safeJson(entry.ai_key_concerns, []),
            },
        });

        return res.json({ success: true, data: suggestion });
    } catch (error) {
        next(error);
    }
};
