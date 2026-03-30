/**
 * seedAttendance.js — Inserts sample attendance records for the CURRENT semester.
 *
 * Why this exists:
 *   The main seed.js seeded Sem 4 attendance under academic_year = '2024-25'.
 *   As of March 2026 the server's currentAcademicYear() returns '2025-26',
 *   so the Write Entry page finds no records and shows "Attendance data not
 *   available for this week."  This script back-fills weeks 1-N for '2025-26'.
 *
 * Usage:
 *   node src/scripts/seedAttendance.js                  # all students
 *   node src/scripts/seedAttendance.js --email cse.a1@gcet.edu.in
 *
 * Safe to re-run — all inserts use INSERT OR IGNORE.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../database/db');
const { initializeSchema } = require('../database/schema');

initializeSchema(db);

// ─── Config ──────────────────────────────────────────────────────────────────

const SEMESTER     = 4;          // current semester for all seeded students
const ACADEMIC_YEAR = '2025-26'; // matches server currentAcademicYear() as of March 2026
const TOTAL_WEEKS  = 13;         // how many weeks to seed (up to current week)

// Parse optional --email flag
const emailFlag = (() => {
    const i = process.argv.indexOf('--email');
    return i !== -1 ? process.argv[i + 1] : null;
})();

// ─── Fetch students ───────────────────────────────────────────────────────────

const allStudents = db
    .prepare(`SELECT id, name, email, department, section, roll_number
              FROM users
              WHERE role = 'student'
                AND department IS NOT NULL
                AND section    IS NOT NULL
                AND roll_number IS NOT NULL
                ${emailFlag ? 'AND email = ?' : ''}`)
    .all(...(emailFlag ? [emailFlag] : []));

if (allStudents.length === 0) {
    console.error('No matching students found. Check the database or --email value.');
    process.exit(1);
}

console.log(`Seeding attendance for ${allStudents.length} student(s) — Sem ${SEMESTER}, ${ACADEMIC_YEAR}, Weeks 1–${TOTAL_WEEKS}`);

// ─── Insertion statement ──────────────────────────────────────────────────────

const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance
        (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
    VALUES
        (@department, @section, @roll_number, @week_number, @academic_year, @semester, @cumulative_pct, @weekly_pct)
`);

// ─── Realistic weekly pattern ─────────────────────────────────────────────────
// Generates a natural-looking attendance arc for a student based on their
// roll number (deterministic so re-runs produce the same data).

function generateWeeklyPcts(roll, totalWeeks) {
    // Base rate varies by roll: 75–96%
    const base = 75 + ((roll * 7 + 31) % 22);

    // Dip weeks (illness / exams)
    const dipWeeks  = new Set([2 + (roll % 3), 7 + (roll % 4), 12 + (roll % 2)]);
    // Boost weeks (short week / holiday makeup)
    const boostWeeks = new Set([4 + (roll % 3), 10 + (roll % 3)]);
    // Low-attendance student pattern (every 7th roll)
    const isLow = roll % 7 === 0;

    const weeklyPcts = [];
    for (let w = 1; w <= totalWeeks; w++) {
        let pct;
        if (isLow && w >= 3 && w <= 6) {
            pct = 45 + (roll % 15);               // bad run early semester
        } else if (dipWeeks.has(w)) {
            pct = Math.max(40, base - 25 - (roll % 10));
        } else if (boostWeeks.has(w)) {
            pct = Math.min(100, base + 10);
        } else {
            // Gentle sine wave ± 12% around base
            pct = Math.min(100, Math.max(45, base + Math.sin(w * roll * 0.31) * 12));
        }
        weeklyPcts.push(Math.round(pct * 10) / 10);
    }
    return weeklyPcts;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

let totalInserted = 0;

const seedStudent = db.transaction((student) => {
    const weeklyPcts = generateWeeklyPcts(student.roll_number, TOTAL_WEEKS);
    let cumSum = 0;

    for (let week = 1; week <= TOTAL_WEEKS; week++) {
        const weekly = weeklyPcts[week - 1];
        cumSum += weekly;
        const cumulative = Math.round((cumSum / week) * 10) / 10;

        insertAttendance.run({
            department:     student.department,
            section:        student.section,
            roll_number:    student.roll_number,
            week_number:    week,
            academic_year:  ACADEMIC_YEAR,
            semester:       SEMESTER,
            cumulative_pct: cumulative,
            weekly_pct:     weekly,
        });
        totalInserted++;
    }
});

for (const student of allStudents) {
    seedStudent(student);
    const finalRow = db.prepare(`
        SELECT cumulative_pct FROM attendance
        WHERE department = ? AND section = ? AND roll_number = ?
          AND academic_year = ? AND semester = ? AND week_number = ?
    `).get(student.department, student.section, student.roll_number,
           ACADEMIC_YEAR, SEMESTER, TOTAL_WEEKS);

    const finalPct = finalRow?.cumulative_pct?.toFixed(1) ?? '?';
    console.log(
        `  ✓ ${student.name.padEnd(28)} [${student.department}-${student.section} Roll ${student.roll_number}]` +
        `  final cumulative: ${finalPct}%`
    );
}

// ─── Summary ──────────────────────────────────────────────────────────────────

const totalRows = db.prepare(
    `SELECT COUNT(*) as n FROM attendance WHERE academic_year = ? AND semester = ?`
).get(ACADEMIC_YEAR, SEMESTER).n;

console.log(`\n✓ Done.  Inserted up to ${totalInserted} rows (skipped duplicates).`);
console.log(`  Total attendance rows for ${ACADEMIC_YEAR} Sem ${SEMESTER}: ${totalRows}`);
process.exit(0);
