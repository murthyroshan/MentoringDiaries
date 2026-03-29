require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const db = require('./db');
const { initializeSchema } = require('./schema');

initializeSchema(db);

// Check if already seeded
const existing = db.prepare('SELECT COUNT(*) as n FROM users').get();
if (existing.n > 0) {
    console.log('Database already seeded — skipping');
    process.exit(0);
}

console.log('Seeding database...');

// ─── Deterministic pseudo-random for attendance ──────────────────────────────
function seededRand(seed) {
    let s = seed;
    return function () {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 4294967296;
    };
}

// ─── Hash passwords ───────────────────────────────────────────────────────────
const adminHash   = bcrypt.hashSync('Admin@123',   12);
const mentorHash  = bcrypt.hashSync('Mentor@123',  12);
const studentHash = bcrypt.hashSync('Student@123', 12);

const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, name, role, department, section, roll_number, batch, current_semester, mentor_id, is_active)
    VALUES (@email, @password_hash, @name, @role, @department, @section, @roll_number, @batch, @current_semester, @mentor_id, 1)
`);

// ─── 1. Admin ─────────────────────────────────────────────────────────────────
insertUser.run({
    email: 'admin@gcet.edu.in',
    password_hash: adminHash,
    name: 'Admin',
    role: 'admin',
    department: null,
    section: null,
    roll_number: null,
    batch: null,
    current_semester: null,
    mentor_id: null,
});
const adminId = db.prepare("SELECT id FROM users WHERE email = 'admin@gcet.edu.in'").get().id;
console.log('Admin created, id:', adminId);

// ─── 2. Mentors ───────────────────────────────────────────────────────────────
const mentors = [
    { email: 'mentor1@gcet.edu.in', name: 'Dr. Ramesh Kumar',  department: 'CSE'  },
    { email: 'mentor2@gcet.edu.in', name: 'Dr. Priya Sharma',  department: 'AIML' },
    { email: 'mentor3@gcet.edu.in', name: 'Dr. Suresh Rao',    department: 'CS'   },
    { email: 'mentor4@gcet.edu.in', name: 'Dr. Anita Patel',   department: 'DS'   },
];

const mentorIds = {};
for (const m of mentors) {
    insertUser.run({
        email: m.email,
        password_hash: mentorHash,
        name: m.name,
        role: 'mentor',
        department: m.department,
        section: null,
        roll_number: null,
        batch: null,
        current_semester: null,
        mentor_id: null,
    });
    const row = db.prepare('SELECT id FROM users WHERE email = ?').get(m.email);
    mentorIds[m.department] = row.id;
}
console.log('Mentors created:', mentorIds);

// ─── 3. Students ─────────────────────────────────────────────────────────────
const deptSections = {
    CSE:  ['A', 'B', 'C', 'D'],
    AIML: ['A', 'B'],
    CS:   ['A', 'B'],
    DS:   ['A', 'B'],
};

const studentMap = {}; // "CSE-A-1" => id
let studentCount = 0;

for (const [dept, sections] of Object.entries(deptSections)) {
    for (const section of sections) {
        for (let roll = 1; roll <= 10; roll++) {
            const email = `${dept.toLowerCase()}.${section.toLowerCase()}${roll}@gcet.edu.in`;
            const name  = `Student ${dept}-${section}${roll}`;
            insertUser.run({
                email,
                password_hash: studentHash,
                name,
                role: 'student',
                department: dept,
                section,
                roll_number: roll,
                batch: '2023-2027',
                current_semester: 4,
                mentor_id: mentorIds[dept],
            });
            const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            studentMap[`${dept}-${section}-${roll}`] = row.id;
            studentCount++;
        }
    }
}
console.log(`Students created: ${studentCount}`);

// ─── 4. Attendance data ───────────────────────────────────────────────────────
const insertAttendance = db.prepare(`
    INSERT OR IGNORE INTO attendance
        (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
    VALUES
        (@department, @section, @roll_number, @week_number, @academic_year, @semester, @cumulative_pct, @weekly_pct)
`);

let attCount = 0;
for (const [dept, sections] of Object.entries(deptSections)) {
    for (const section of sections) {
        for (let roll = 1; roll <= 10; roll++) {
            const rand = seededRand(roll * 31 + section.charCodeAt(0) * 7 + dept.charCodeAt(0) * 3);
            // Determine if this student is a "dip" student (10% per section)
            const isDipStudent = roll === 5; // roll 5 gets a dip
            let cumPct = 80 + rand() * 12; // start 80-92%
            for (let week = 1; week <= 12; week++) {
                // Dip students dip below 75% around week 6-8
                let weekPct;
                if (isDipStudent && week >= 6 && week <= 8) {
                    weekPct = 50 + rand() * 15; // 50-65%
                    cumPct = ((cumPct * (week - 1)) + weekPct) / week;
                } else {
                    weekPct = Math.max(40, Math.min(100, cumPct + (rand() * 30 - 15)));
                    cumPct = ((cumPct * (week - 1)) + weekPct) / week;
                }
                insertAttendance.run({
                    department: dept,
                    section,
                    roll_number: roll,
                    week_number: week,
                    academic_year: '2024-25',
                    semester: 4,
                    cumulative_pct: Math.round(cumPct * 10) / 10,
                    weekly_pct: Math.round(weekPct * 10) / 10,
                });
                attCount++;
            }
        }
    }
}
console.log(`Attendance rows: ${attCount}`);

// ─── 5. Sample diary entries for cse.a1 ─────────────────────────────────────
const cseA1Id = studentMap['CSE-A-1'];
const mentor1Id = mentorIds['CSE'];

const insertEntry = db.prepare(`
    INSERT INTO diary_entries
        (student_id, week_number, academic_year, semester, start_date, end_date,
         mood, weekly_difficulty, attendance_pct, reflection, challenges,
         ai_risk_score, ai_sentiment, ai_risk_level, ai_flags, ai_summary, is_flagged, status,
         created_at, updated_at)
    VALUES
        (@student_id, @week_number, @academic_year, @semester, @start_date, @end_date,
         @mood, @weekly_difficulty, @attendance_pct, @reflection, @challenges,
         @ai_risk_score, @ai_sentiment, @ai_risk_level, @ai_flags, @ai_summary, @is_flagged, @status,
         @created_at, @updated_at)
`);

const insertSubjectRating = db.prepare(`
    INSERT INTO diary_subject_ratings (entry_id, subject_name, rating, note)
    VALUES (@entry_id, @subject_name, @rating, @note)
`);

const cseSubjects = ['Data Structures', 'Operating Systems', 'DBMS', 'Computer Networks', 'Mathematics III'];

const sampleEntries = [
    { week: 8,  mood: 4, diff: 5, att: 85.0, sentiment: 'positive', risk: 18, riskLevel: 'low',    reflection: 'Had a productive week. Data Structures assignments are going well and I completed all lab work on time.', challenges: 'Minor difficulty with OS concepts.' },
    { week: 9,  mood: 3, diff: 6, att: 82.5, sentiment: 'neutral',  risk: 25, riskLevel: 'low',    reflection: 'Average week. DBMS project is demanding more time than expected. Feeling slightly stressed about deadlines.', challenges: 'Struggling with DBMS normalization.' },
    { week: 10, mood: 2, diff: 8, att: 75.0, sentiment: 'negative', risk: 55, riskLevel: 'medium', reflection: 'Difficult week with multiple exams and low attendance due to illness. Feeling overwhelmed with the workload.', challenges: 'Missed Computer Networks lab. Behind on Mathematics III assignments.' },
    { week: 11, mood: 3, diff: 6, att: 80.0, sentiment: 'neutral',  risk: 35, riskLevel: 'medium', reflection: 'Recovering from last week. Made up some lab work but still behind on assignments.', challenges: 'Need to catch up on Mathematics III.' },
    { week: 12, mood: 4, diff: 5, att: 83.0, sentiment: 'positive', risk: 20, riskLevel: 'low',    reflection: 'Good week overall. Completed all pending work and feel more confident heading into exams.', challenges: 'Exam preparation is stressful but manageable.' },
];

const baseDate = new Date('2025-02-17');
for (const e of sampleEntries) {
    const weekOffset = (e.week - 8) * 7;
    const start = new Date(baseDate);
    start.setDate(start.getDate() + weekOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const created = new Date(end);
    created.setDate(created.getDate() + 1);

    insertEntry.run({
        student_id: cseA1Id,
        week_number: e.week,
        academic_year: '2024-25',
        semester: 4,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        mood: e.mood,
        weekly_difficulty: e.diff,
        attendance_pct: e.att,
        reflection: e.reflection,
        challenges: e.challenges,
        ai_risk_score: e.risk,
        ai_sentiment: e.sentiment,
        ai_risk_level: e.riskLevel,
        ai_flags: '[]',
        ai_summary: `AI analysis: ${e.sentiment} sentiment detected. Risk level: ${e.riskLevel}.`,
        is_flagged: e.riskLevel === 'medium' ? 1 : 0,
        status: 'submitted',
        created_at: created.toISOString(),
        updated_at: created.toISOString(),
    });

    const entryId = db.prepare('SELECT id FROM diary_entries WHERE student_id = ? AND week_number = ? AND academic_year = ? AND semester = ?')
        .get(cseA1Id, e.week, '2024-25', 4).id;

    const ratings = [5, 4, 3, 4, 3];
    cseSubjects.forEach((subj, idx) => {
        insertSubjectRating.run({
            entry_id: entryId,
            subject_name: subj,
            rating: ratings[idx] - (e.mood < 3 ? 1 : 0),
            note: null,
        });
    });
}
console.log('Sample diary entries created for cse.a1');

// ─── 6. Sample mentoring sessions ────────────────────────────────────────────
const insertSession = db.prepare(`
    INSERT INTO mentoring_sessions (mentor_id, student_id, scheduled_at, duration_mins, location, notes, action_items, status, created_at)
    VALUES (@mentor_id, @student_id, @scheduled_at, @duration_mins, @location, @notes, @action_items, @status, @created_at)
`);

insertSession.run({
    mentor_id: mentor1Id,
    student_id: cseA1Id,
    scheduled_at: '2025-02-10T10:00:00.000Z',
    duration_mins: 30,
    location: 'Staff Room 201',
    notes: 'Discussed semester progress and academic goals.',
    action_items: JSON.stringify(['Complete DS assignment by week 9', 'Attend all remaining labs']),
    status: 'completed',
    created_at: '2025-02-10T10:30:00.000Z',
});

insertSession.run({
    mentor_id: mentor1Id,
    student_id: cseA1Id,
    scheduled_at: '2025-03-03T11:00:00.000Z',
    duration_mins: 45,
    location: 'Online - Teams',
    notes: 'Follow-up on attendance and assignment catch-up.',
    action_items: JSON.stringify(['Submit DBMS project', 'Clear Mathematics III backlogs']),
    status: 'completed',
    created_at: '2025-03-03T11:45:00.000Z',
});

insertSession.run({
    mentor_id: mentor1Id,
    student_id: cseA1Id,
    scheduled_at: '2025-04-07T10:00:00.000Z',
    duration_mins: 30,
    location: 'Staff Room 201',
    notes: '',
    action_items: '[]',
    status: 'scheduled',
    created_at: new Date().toISOString(),
});
console.log('Sample mentoring sessions created');

// ─── 7. Sample achievements ───────────────────────────────────────────────────
const insertAchievement = db.prepare(`
    INSERT INTO achievements (student_id, semester, academic_year, type, title, description, date, proof_url, created_at)
    VALUES (@student_id, @semester, @academic_year, @type, @title, @description, @date, @proof_url, @created_at)
`);

insertAchievement.run({
    student_id: cseA1Id,
    semester: 4,
    academic_year: '2024-25',
    type: 'event',
    title: 'Hackathon Participation — TechFest 2025',
    description: 'Participated in 24-hour hackathon. Built a web app for campus resource management.',
    date: '2025-02-20',
    proof_url: '',
    created_at: new Date().toISOString(),
});

insertAchievement.run({
    student_id: cseA1Id,
    semester: 4,
    academic_year: '2024-25',
    type: 'course',
    title: 'Completed "Data Structures" on NPTEL',
    description: 'Scored 78% in NPTEL online certification course on Advanced Data Structures.',
    date: '2025-03-01',
    proof_url: '',
    created_at: new Date().toISOString(),
});
console.log('Sample achievements created');

// ─── 8. Sample marks entry ────────────────────────────────────────────────────
const insertMarks = db.prepare(`
    INSERT INTO marks_entries (student_id, semester, academic_year, cgpa, submission_count, created_at, updated_at)
    VALUES (@student_id, @semester, @academic_year, @cgpa, @submission_count, @created_at, @updated_at)
`);

insertMarks.run({
    student_id: cseA1Id,
    semester: 3,
    academic_year: '2024-25',
    cgpa: 8.2,
    submission_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
});

const marksEntryId = db.prepare('SELECT id FROM marks_entries WHERE student_id = ? AND semester = ?').get(cseA1Id, 3).id;

const insertMarkSubject = db.prepare(`
    INSERT INTO marks_subjects (marks_entry_id, subject_name, grade)
    VALUES (@marks_entry_id, @subject_name, @grade)
`);

const sem3Grades = [
    { subject_name: 'Digital Logic Design', grade: 'A+' },
    { subject_name: 'Data Structures',      grade: 'O'  },
    { subject_name: 'Discrete Mathematics', grade: 'A'  },
    { subject_name: 'Computer Organization', grade: 'A+' },
    { subject_name: 'Python Programming',   grade: 'O'  },
];

for (const s of sem3Grades) {
    insertMarkSubject.run({ marks_entry_id: marksEntryId, ...s });
}
console.log('Sample marks entry created');

console.log('\n✓ Seed complete.');
console.log(`  Users: ${db.prepare('SELECT COUNT(*) as n FROM users').get().n}`);
console.log(`  Attendance rows: ${db.prepare('SELECT COUNT(*) as n FROM attendance').get().n}`);
console.log(`  Diary entries: ${db.prepare('SELECT COUNT(*) as n FROM diary_entries').get().n}`);

process.exit(0);
