/**
 * seedTestMentorData.js — Populates testmentor@gmail.com with realistic student data.
 *
 * Creates 6 CSE students, each with:
 *   - Distinct attendance trajectories
 *   - Multiple diary entries (weeks 8–13) with varied moods & risk levels
 *   - Subject ratings per entry
 *   - Mentoring sessions
 *
 * Usage:  node src/scripts/seedTestMentorData.js
 * Safe:   Skips any email/roll that already exists. Re-runnable.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt   = require('bcryptjs');
const db       = require('../database/db');
const { initializeSchema } = require('../database/schema');

initializeSchema(db);

// ─── Config ───────────────────────────────────────────────────────────────────

const ACADEMIC_YEAR  = '2025-26';
const SEMESTER       = 4;
const DEPT           = 'CSE';
const SECTION        = 'Z';          // unique section so rolls don't clash
const STUDENT_PW     = bcrypt.hashSync('Student@123', 10);

// Mentor
const mentor = db.prepare('SELECT id, name FROM users WHERE email = ?').get('testmentor@gmail.com');
if (!mentor) {
    console.error('❌ testmentor@gmail.com not found. Run `node src/scripts/seedTestUsers.js` first.');
    process.exit(1);
}
console.log(`✓ Mentor found: ${mentor.name} (id ${mentor.id})`);

// ─── Student profiles ─────────────────────────────────────────────────────────

const STUDENTS = [
    {
        roll: 1,
        name: 'Arjun Mehta',
        email: 'cse.z1@gcet.edu.in',
        profile: 'top_performer',   // consistently good
        baseAttendance: 92,
    },
    {
        roll: 2,
        name: 'Priya Nair',
        email: 'cse.z2@gcet.edu.in',
        profile: 'declining',       // started well, now declining
        baseAttendance: 78,
    },
    {
        roll: 3,
        name: 'Rohan Verma',
        email: 'cse.z3@gcet.edu.in',
        profile: 'at_risk',         // chronic low attendance + high risk
        baseAttendance: 61,
    },
    {
        roll: 4,
        name: 'Sneha Pillai',
        email: 'cse.z4@gcet.edu.in',
        profile: 'improving',       // poor start, bouncing back
        baseAttendance: 74,
    },
    {
        roll: 5,
        name: 'Karthik Rajan',
        email: 'cse.z5@gcet.edu.in',
        profile: 'average',         // unremarkable but stable
        baseAttendance: 82,
    },
    {
        roll: 6,
        name: 'Divya Krishnan',
        email: 'cse.z6@gcet.edu.in',
        profile: 'anxious_achiever',// high stress but good grades
        baseAttendance: 87,
    },
];

// ─── Entry data per profile ───────────────────────────────────────────────────

const ENTRIES = {
    top_performer: [
        { week: 8,  mood: 5, diff: 3, att: 95, risk: 8,  riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Excellent week! Completed all DS assignments early and helped a peer debug their code. Feeling confident about upcoming tests.',
          challenges: 'Nothing major. Just fine-tuning exam preparation strategy.' },
        { week: 9,  mood: 5, diff: 4, att: 93, risk: 10, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Had a great lab session on OS scheduling algorithms. Understood the concepts clearly and scored well in the quiz.',
          challenges: 'Computer Networks assignment was a bit tricky but managed well.' },
        { week: 10, mood: 4, diff: 5, att: 90, risk: 15, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Mid-sem exams this week. Prepared well and am satisfied with my performance across all subjects.',
          challenges: 'DBMS normalization had some tricky parts. Need to revise 3NF/BCNF.' },
        { week: 11, mood: 5, diff: 3, att: 94, risk: 7,  riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Back to full pace. Started working on the DBMS project and enjoying the design phase.',
          challenges: 'Time management between project and daily labs.' },
        { week: 12, mood: 4, diff: 4, att: 92, risk: 12, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Submitted DBMS project on time. Team collaboration was smooth. Also prepped for Mathematics III exam.',
          challenges: 'Mathematics proof-writing section needs more practice.' },
        { week: 13, mood: 5, diff: 3, att: 96, risk: 6,  riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Great end to the semester run-up. All submissions done. Feeling ready for finals.',
          challenges: 'Minor stress about final evaluation criteria.' },
    ],

    declining: [
        { week: 8,  mood: 4, diff: 4, att: 86, risk: 18, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Started the week strong. Attended all lectures and submitted DS assignment.',
          challenges: 'OS concepts are getting heavier. Need more reading time.' },
        { week: 9,  mood: 3, diff: 6, att: 80, risk: 32, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Feeling a bit stretched. Family commitments took up weekend time. Missed one CN lecture.',
          challenges: 'Balancing personal and academic life is harder this month.' },
        { week: 10, mood: 3, diff: 7, att: 74, risk: 45, riskLvl: 'medium', sentiment: 'negative',
          reflection: "Attendance below 75% now – I know it's an issue. Trying to focus but finding it hard to stay motivated after a difficult week.",
          challenges: 'Missed two labs due to transportation issue. Attendance hit hard.' },
        { week: 11, mood: 2, diff: 8, att: 70, risk: 62, riskLvl: 'high',   sentiment: 'negative',
          reflection: "I'm falling behind on assignments. The DBMS project deadline is next week and I haven't started designing the schema yet. Feeling overwhelmed.",
          challenges: 'DBMS project, missed CN labs, OS backlog.' },
        { week: 12, mood: 2, diff: 7, att: 68, risk: 68, riskLvl: 'high',   sentiment: 'negative',
          reflection: 'Submitted DBMS project but incomplete. Attendance dropped to 68%. Planning to speak to my mentor.',
          challenges: 'Need to clear backlogs quickly. Feeling behind the class.' },
        { week: 13, mood: 3, diff: 6, att: 71, risk: 48, riskLvl: 'medium', sentiment: 'neutral',
          reflection: "Trying to recover. Attended extra tutorial sessions. Mentor's advice helped me plan my catch-up schedule.",
          challenges: 'Mathematics III exam next week – not fully prepared.' },
    ],

    at_risk: [
        { week: 8,  mood: 2, diff: 8, att: 65, risk: 72, riskLvl: 'high',   sentiment: 'negative',
          reflection: "Struggling a lot. Missed multiple classes due to personal health issues. Can't keep up with the lecture pace.",
          challenges: 'Health issues, low energy, falling behind in all subjects.', flagged: 1 },
        { week: 9,  mood: 1, diff: 9, att: 58, risk: 85, riskLvl: 'critical', sentiment: 'negative',
          reflection: "This week was the worst. I barely attended anything. I feel like I am losing grip on the semester. Everything feels too much and I don't know how to get back on track.",
          challenges: 'Mental health, attendance critical at 58%, DS and CN labs completely missed.', flagged: 1 },
        { week: 10, mood: 2, diff: 8, att: 60, risk: 75, riskLvl: 'high',   sentiment: 'negative',
          reflection: 'Met with the counsellor this week. Feeling slightly better mentally but still very behind academically. Trying to attend at least core lectures.',
          challenges: 'Catching up one subject at a time. Attendance still critical.', flagged: 1 },
        { week: 11, mood: 2, diff: 8, att: 62, risk: 70, riskLvl: 'high',   sentiment: 'negative',
          reflection: "Attended more lectures this week. Still below 75% but improving. Mentor's intervention really helped.",
          challenges: 'DS lab pending. CN project incomplete. DBMS not started.' },
        { week: 12, mood: 3, diff: 7, att: 64, risk: 58, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Slow progress but positive. Did attend all lectures this week. Submitted at least one pending assignment.',
          challenges: 'Still very behind but no longer in crisis mode.' },
        { week: 13, mood: 3, diff: 7, att: 65, risk: 60, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Trying my best to catch up. Have a plan now. Will need grace marks consideration.',
          challenges: 'Cannot fully recover attendance in remaining weeks.' },
    ],

    improving: [
        { week: 8,  mood: 2, diff: 8, att: 62, risk: 65, riskLvl: 'high',   sentiment: 'negative',
          reflection: 'Really tough start to the month. Was sick for almost two weeks. Attendance dropped badly.',
          challenges: 'Post-illness recovery. Missed many lectures and labs.', flagged: 1 },
        { week: 9,  mood: 3, diff: 7, att: 66, risk: 50, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Health is better now. Attending classes again. Caught up on some DS assignments.',
          challenges: 'OS labs still pending. Need to request makeup sessions.' },
        { week: 10, mood: 3, diff: 6, att: 71, risk: 38, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Making progress. Attended all lectures this week. Got DS assignment marked at 7/10 – not bad given the circumstances.',
          challenges: "DBMS project hasn't started yet. Need to begin." },
        { week: 11, mood: 4, diff: 5, att: 76, risk: 28, riskLvl: 'low',    sentiment: 'positive',
          reflection: "Crossed 75% attendance! Really relieved. Started DBMS project and the design is going well. Feeling motivated again.",
          challenges: 'Mathematics III concepts need revision.' },
        { week: 12, mood: 4, diff: 5, att: 79, risk: 22, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Good week. DBMS project submitted on time. Feeling much more in control.',
          challenges: 'Some CN theory weak areas. Planning extra study sessions.' },
        { week: 13, mood: 4, diff: 4, att: 81, risk: 18, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Semester recovery is real. Happy with how the last 5 weeks have gone. Finals prep underway.',
          challenges: 'Mathematics III exam anxiety.' },
    ],

    average: [
        { week: 8,  mood: 3, diff: 5, att: 82, risk: 22, riskLvl: 'low',    sentiment: 'neutral',
          reflection: 'Steady week. Attended most lectures. DS assignment submitted with minor issues.',
          challenges: 'Nothing critical but need to put more effort into CN.' },
        { week: 9,  mood: 3, diff: 5, att: 84, risk: 20, riskLvl: 'low',    sentiment: 'neutral',
          reflection: 'Another average week. Comfortable with the coursework but not excelling anywhere in particular.',
          challenges: 'OS theory understanding is surface-level. Need deeper study.' },
        { week: 10, mood: 3, diff: 6, att: 80, risk: 30, riskLvl: 'low',    sentiment: 'neutral',
          reflection: 'Mid-sem week. Exams went okay. Not great, not bad. Aiming to improve in remaining weeks.',
          challenges: 'DBMS normalization and CN routing algorithms need work.' },
        { week: 11, mood: 3, diff: 5, att: 83, risk: 25, riskLvl: 'low',    sentiment: 'neutral',
          reflection: 'Back to routine. Working on DBMS project. Nothing new to report.',
          challenges: 'Could be doing more proactively.' },
        { week: 12, mood: 3, diff: 5, att: 81, risk: 22, riskLvl: 'low',    sentiment: 'neutral',
          reflection: 'Submitted DBMS project. Satisfied with the outcome.',
          challenges: 'Mathematics III formula sheet preparation needed.' },
        { week: 13, mood: 4, diff: 4, att: 85, risk: 18, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Good closing week. Feeling prepared for finals. Attendance solid throughout.',
          challenges: 'Final revision schedule is a bit packed.' },
    ],

    anxious_achiever: [
        { week: 8,  mood: 3, diff: 6, att: 90, risk: 35, riskLvl: 'medium', sentiment: 'neutral',
          reflection: "I'm attending everything and submitting everything on time but I'm always anxious about whether I've done enough. DS quiz score was 9/10 and I still felt like I failed.",
          challenges: 'Anxiety about performance. Perfectionism is exhausting.' },
        { week: 9,  mood: 2, diff: 7, att: 88, risk: 42, riskLvl: 'medium', sentiment: 'negative',
          reflection: 'Really stressed this week. Even though my grades are fine, I cannot stop worrying. Staying up late studying subjects I already understand.',
          challenges: 'Sleep deprivation. Overthinking. Hard to switch off.' },
        { week: 10, mood: 3, diff: 8, att: 87, risk: 40, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Mid-sem week – I over-prepared for every subject and ended up performing well. But the stress leading up was intense.',
          challenges: 'Managing pre-exam anxiety. Need to trust the preparation process.' },
        { week: 11, mood: 3, diff: 6, att: 90, risk: 32, riskLvl: 'medium', sentiment: 'neutral',
          reflection: 'Talking to a senior about managing academic stress helped a little. Still anxious but trying to be more realistic.',
          challenges: 'Anxiety management. DBMS project quality anxiety.' },
        { week: 12, mood: 4, diff: 5, att: 89, risk: 25, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'DBMS project submitted. Got good feedback. Maybe I am better at this than I think. Feeling more confident.',
          challenges: 'Still nervous about finals but slightly more grounded.' },
        { week: 13, mood: 4, diff: 5, att: 91, risk: 20, riskLvl: 'low',    sentiment: 'positive',
          reflection: 'Good week. Prepared well for finals. Learning to be kinder to myself academically.',
          challenges: 'Final exam anxiety remains but manageable.' },
    ],
};

const CSE_SUBJECTS = ['Data Structures', 'Operating Systems', 'DBMS', 'Computer Networks', 'Mathematics III'];

// Ratings map per profile per mood level
function subjectRatings(profile, mood, week) {
    const base = mood >= 4 ? 4 : mood === 3 ? 3 : 2;
    const boost = profile === 'top_performer' ? 1 : profile === 'at_risk' ? -1 : 0;
    const clamp = (v) => Math.min(5, Math.max(1, v));
    return CSE_SUBJECTS.map((_, i) => ({
        subject_name: CSE_SUBJECTS[i],
        // vary slightly by index so it's not monotone
        rating: clamp(base + boost + (i % 2 === 0 ? 0 : -1) + (week % 2 === 0 ? 1 : 0)),
        note: null,
    }));
}

// ─── Attendance seed ──────────────────────────────────────────────────────────

const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance
        (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
    VALUES
        (@department, @section, @roll_number, @week_number, @academic_year, @semester, @cumulative_pct, @weekly_pct)
`);

// Build a realistic weekly attendance arc given a base + profile trajectory
function buildAttendanceArc(profile, base, totalWeeks = 13) {
    const rows = [];
    let cumSum = 0;
    for (let w = 1; w <= totalWeeks; w++) {
        let wPct;
        if (profile === 'top_performer') {
            wPct = Math.min(100, base + Math.sin(w * 0.5) * 5);
        } else if (profile === 'declining') {
            const decay = w > 7 ? (w - 7) * 3 : 0;
            wPct = Math.max(50, base - decay + Math.sin(w) * 5);
        } else if (profile === 'at_risk') {
            wPct = Math.max(30, base - 5 + Math.sin(w * 0.8) * 8);
        } else if (profile === 'improving') {
            const gain = w > 6 ? (w - 6) * 2.5 : -(6 - w) * 4;
            wPct = Math.min(90, Math.max(40, base + gain + Math.sin(w) * 4));
        } else {
            wPct = Math.min(100, Math.max(60, base + Math.sin(w * 0.6) * 6));
        }
        wPct = Math.round(wPct * 10) / 10;
        cumSum += wPct;
        const cumPct = Math.round((cumSum / w) * 10) / 10;
        rows.push({
            department: DEPT, section: SECTION, roll_number: null, // filled below
            week_number: w, academic_year: ACADEMIC_YEAR, semester: SEMESTER,
            cumulative_pct: cumPct, weekly_pct: wPct,
        });
    }
    return rows;
}

// ─── INSERT helpers ───────────────────────────────────────────────────────────

const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users
        (email, password_hash, name, role, department, section, roll_number, batch, current_semester, mentor_id, is_active)
    VALUES
        (@email, @password_hash, @name, @role, @department, @section, @roll_number, @batch, @current_semester, @mentor_id, 1)
`);

const insertEntry = db.prepare(`
    INSERT OR IGNORE INTO diary_entries
        (student_id, week_number, academic_year, semester, start_date, end_date,
         mood, weekly_difficulty, attendance_pct, reflection, challenges,
         ai_risk_score, ai_sentiment, ai_risk_level, ai_flags, ai_summary,
         is_flagged, status, created_at, updated_at)
    VALUES
        (@student_id, @week_number, @academic_year, @semester, @start_date, @end_date,
         @mood, @weekly_difficulty, @attendance_pct, @reflection, @challenges,
         @ai_risk_score, @ai_sentiment, @ai_risk_level, '[]', @ai_summary,
         @is_flagged, 'submitted', @created_at, @updated_at)
`);

const insertRating = db.prepare(`
    INSERT OR IGNORE INTO diary_subject_ratings (entry_id, subject_name, rating, note)
    VALUES (@entry_id, @subject_name, @rating, @note)
`);

const insertSession = db.prepare(`
    INSERT INTO mentoring_sessions
        (mentor_id, student_id, scheduled_at, duration_mins, location, notes, action_items, status, created_at)
    VALUES
        (@mentor_id, @student_id, @scheduled_at, @duration_mins, @location, @notes, @action_items, @status, @created_at)
`);

// Week 8 of the semester starts ~ 2025-11-24 (ACADEMIC_YEAR '2025-26' sem 4 ≈ Nov 2025)
const WEEK8_START = new Date('2025-11-24');
function weekDates(weekNum) {
    const offset = (weekNum - 8) * 7;
    const start = new Date(WEEK8_START);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const submitted = new Date(end);
    submitted.setDate(submitted.getDate() + 1);
    return {
        start_date: start.toISOString().split('T')[0],
        end_date:   end.toISOString().split('T')[0],
        created_at: submitted.toISOString(),
    };
}

// ─── Main loop ────────────────────────────────────────────────────────────────

for (const s of STUDENTS) {
    console.log(`\nProcessing: ${s.name} (${s.profile})`);

    // 1. Insert user (skip if exists)
    insertUser.run({
        email:            s.email,
        password_hash:    STUDENT_PW,
        name:             s.name,
        role:             'student',
        department:       DEPT,
        section:          SECTION,
        roll_number:      s.roll,
        batch:            '2023-2027',
        current_semester: SEMESTER,
        mentor_id:        mentor.id,
    });

    const student = db.prepare('SELECT id FROM users WHERE email = ?').get(s.email);
    console.log(`  ✓ User id ${student.id}`);

    // 2. Attendance
    const attRows = buildAttendanceArc(s.profile, s.baseAttendance);
    for (const row of attRows) {
        insertAttendance.run({ ...row, roll_number: s.roll });
    }
    console.log(`  ✓ Attendance seeded (${attRows.length} weeks)`);

    // 3. Diary entries
    const profileEntries = ENTRIES[s.profile] || [];
    let entryCount = 0;
    for (const e of profileEntries) {
        const dates = weekDates(e.week);
        insertEntry.run({
            student_id:         student.id,
            week_number:        e.week,
            academic_year:      ACADEMIC_YEAR,
            semester:           SEMESTER,
            start_date:         dates.start_date,
            end_date:           dates.end_date,
            mood:               e.mood,
            weekly_difficulty:  e.diff,
            attendance_pct:     e.att,
            reflection:         e.reflection,
            challenges:         e.challenges,
            ai_risk_score:      e.risk,
            ai_sentiment:       e.sentiment,
            ai_risk_level:      e.riskLvl,
            ai_summary:         `Sentiment: ${e.sentiment}. Risk level: ${e.riskLvl}. Score: ${e.risk}/100.`,
            is_flagged:         e.flagged || 0,
            created_at:         dates.created_at,
            updated_at:         dates.created_at,
        });

        // Find inserted entry id for subject ratings
        const entry = db.prepare(
            'SELECT id FROM diary_entries WHERE student_id = ? AND week_number = ? AND academic_year = ? AND semester = ?'
        ).get(student.id, e.week, ACADEMIC_YEAR, SEMESTER);

        if (entry) {
            const ratings = subjectRatings(s.profile, e.mood, e.week);
            for (const r of ratings) {
                insertRating.run({ entry_id: entry.id, ...r });
            }
            entryCount++;
        }
    }
    console.log(`  ✓ ${entryCount} diary entries with subject ratings`);
}

// ─── Mentoring sessions (one per at-risk / high-risk student) ─────────────────

const SESSION_DATA = [
    { email: 'cse.z3@gcet.edu.in', // at_risk
      scheduled_at: '2025-12-10T10:00:00.000Z', status: 'completed', duration: 45,
      location: 'Staff Room 204',
      notes: 'Discussed health issues and their impact on attendance. Contacted parent. Set recovery plan.',
      actions: ['Collect medical certificate', 'Request attendance condonation', 'Start with 2 subjects only'] },
    { email: 'cse.z2@gcet.edu.in', // declining
      scheduled_at: '2025-12-17T11:00:00.000Z', status: 'completed', duration: 30,
      location: 'Online - Teams',
      notes: 'Reviewed declining attendance trend. Student cited transportation issues. Action items set.',
      actions: ['Join carpool with hostel students', 'Submit explanation letter', 'Catch up on CN lab'] },
    { email: 'cse.z4@gcet.edu.in', // improving
      scheduled_at: '2025-12-08T14:00:00.000Z', status: 'completed', duration: 30,
      location: 'Staff Room 204',
      notes: 'Reviewed post-illness recovery plan. Positive progress.',
      actions: ['Get makeup lab sessions', 'Submit missed DS assignment'] },
    { email: 'cse.z6@gcet.edu.in', // anxious achiever
      scheduled_at: '2025-12-15T10:00:00.000Z', status: 'completed', duration: 40,
      location: 'Online - Teams',
      notes: 'Discussed anxiety and perfectionism. Referred to counselling centre. Student is high-performing but stressed.',
      actions: ['Visit counselling centre', 'Practice mindfulness techniques', 'Limit late-night study sessions'] },
    // upcoming
    { email: 'cse.z3@gcet.edu.in',
      scheduled_at: '2026-04-20T10:00:00.000Z', status: 'scheduled', duration: 45,
      location: 'Staff Room 204',
      notes: '',
      actions: [] },
    { email: 'cse.z2@gcet.edu.in',
      scheduled_at: '2026-04-22T11:30:00.000Z', status: 'scheduled', duration: 30,
      location: 'Online - Teams',
      notes: '',
      actions: [] },
];

let sessionCount = 0;
for (const sess of SESSION_DATA) {
    const student = db.prepare('SELECT id FROM users WHERE email = ?').get(sess.email);
    if (!student) continue;
    insertSession.run({
        mentor_id:    mentor.id,
        student_id:   student.id,
        scheduled_at: sess.scheduled_at,
        duration_mins: sess.duration,
        location:     sess.location,
        notes:        sess.notes,
        action_items: JSON.stringify(sess.actions),
        status:       sess.status,
        created_at:   new Date().toISOString(),
    });
    sessionCount++;
}
console.log(`\n✓ ${sessionCount} mentoring sessions created`);

// ─── Summary ──────────────────────────────────────────────────────────────────

const assignedCount = db.prepare('SELECT COUNT(*) as n FROM users WHERE mentor_id = ? AND role = ?')
    .get(mentor.id, 'student').n;
const entryTotal = db.prepare(`
    SELECT COUNT(*) as n FROM diary_entries de
    JOIN users u ON u.id = de.student_id
    WHERE u.mentor_id = ?
`).get(mentor.id).n;

console.log('\n✓ Seed complete.');
console.log(`  Students assigned to testmentor: ${assignedCount}`);
console.log(`  Total diary entries:             ${entryTotal}`);
console.log('\nLogin: testmentor@gmail.com / 12345678');

process.exit(0);
