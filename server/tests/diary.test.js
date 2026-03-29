/**
 * Diary entry tests
 */
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET         = 'test_jwt_secret_must_be_at_least_32_chars_long!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long!!!!!!';
process.env.NODE_ENV           = 'test';

jest.mock('../src/socket', () => ({
    initSocket: () => {},
    notifyMentor: () => {},
    notifyStudent: () => {},
    notifyAdmins: () => {},
    notifyUserWithPersistence: () => {},
}));

// Stub out the AI service to avoid Groq API calls in tests
jest.mock('../src/services/aiService', () => ({
    analyzeEntry: jest.fn().mockResolvedValue({
        sentiment: 'neutral', sentimentScore: 0,
        summary: 'Test summary', riskLevel: 'low', riskScore: 18,
        keyConcerns: [], confidence: 0.8, keywords: [], flagged: false,
        riskFactors: {}, analysisVersion: 'test',
    }),
    generateMentorSuggestion: jest.fn().mockResolvedValue({
        supportiveResponse: 'Good work.', suggestedGuidance: [], confidence: 0.8,
    }),
    generateWeeklyInsights: jest.fn().mockResolvedValue({
        sentimentTrend: 'stable', engagementLevel: 'medium',
        riskTrend: 'stable', insightParagraph: 'Test insight',
        confidence: 0.7, promptVersion: 'v1',
    }),
}));

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const app     = require('../src/app');
const db      = require('../src/database/db');
const { initializeSchema } = require('../src/database/schema');

let studentCookie, mentorCookie, adminCookie, csrfToken;
let studentId, mentorId, adminId;

beforeAll(async () => {
    initializeSchema(db);
    const hash = (pw) => bcrypt.hashSync(pw, 4);

    // Seed users
    db.prepare(`INSERT INTO users (email, password_hash, name, role, is_active)
                VALUES ('admin@gcet.edu.in', ?, 'Admin', 'admin', 1)`).run(hash('Admin@123'));
    adminId = db.prepare("SELECT id FROM users WHERE email='admin@gcet.edu.in'").get().id;

    db.prepare(`INSERT INTO users (email, password_hash, name, role, department, is_active)
                VALUES ('mentor1@gcet.edu.in', ?, 'Dr. Ramesh', 'mentor', 'CSE', 1)`).run(hash('Mentor@123'));
    mentorId = db.prepare("SELECT id FROM users WHERE email='mentor1@gcet.edu.in'").get().id;

    db.prepare(`INSERT INTO users (email, password_hash, name, role, department, section,
                           roll_number, batch, current_semester, mentor_id, is_active)
                VALUES ('cse.a1@gcet.edu.in', ?, 'Student CSE-A1', 'student', 'CSE', 'A', 1,
                        '2023-2027', 4, ?, 1)`).run(hash('Student@123'), mentorId);
    studentId = db.prepare("SELECT id FROM users WHERE email='cse.a1@gcet.edu.in'").get().id;

    // Attendance for student
    db.prepare(`INSERT INTO attendance (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
                VALUES ('CSE', 'A', 1, 10, '2024-25', 4, 82.5, 80.0)`).run();

    // Get CSRF token
    const healthRes = await request(app).get('/api/health');
    const cookies = healthRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : '';
    const baseCookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    // Login each user
    const loginUser = async (email, password) => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Cookie', baseCookieHeader)
            .set('X-CSRF-Token', csrfToken)
            .send({ email, password });
        return res.headers['set-cookie'].join('; ') + '; ' + baseCookieHeader;
    };

    studentCookie = await loginUser('cse.a1@gcet.edu.in', 'Student@123');
    mentorCookie  = await loginUser('mentor1@gcet.edu.in', 'Mentor@123');
    adminCookie   = await loginUser('admin@gcet.edu.in',   'Admin@123');
});

afterAll(() => { db.close(); });

describe('POST /api/diary', () => {
    it('creates a diary entry as student', async () => {
        const res = await request(app)
            .post('/api/diary')
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({
                week_number: 10, academic_year: '2024-25', semester: 4,
                mood: 4, weekly_difficulty: 5,
                reflection: 'This week I studied data structures and completed all assignments on time.',
            });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.student_id).toBe(studentId);
    });

    it('blocks duplicate week entry (UNIQUE constraint)', async () => {
        const res = await request(app)
            .post('/api/diary')
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({
                week_number: 10, academic_year: '2024-25', semester: 4,
                mood: 3,
                reflection: 'Another entry for same week should fail.',
            });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('rejects entry with empty reflection', async () => {
        const res = await request(app)
            .post('/api/diary')
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ week_number: 11, semester: 4, mood: 3, reflection: 'Short' });
        expect(res.status).toBe(400);
    });
});

describe('GET /api/diary', () => {
    it('student sees only own entries', async () => {
        const res = await request(app)
            .get('/api/diary')
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
        expect(res.body.data.every(e => e.student_id === studentId)).toBe(true);
    });

    it('mentor sees assigned students entries', async () => {
        const res = await request(app)
            .get('/api/diary')
            .set('Cookie', mentorCookie);
        expect(res.status).toBe(200);
        // All returned entries should belong to students assigned to this mentor
        const entries = res.body.data;
        expect(Array.isArray(entries)).toBe(true);
    });

    it('admin sees all entries', async () => {
        const res = await request(app)
            .get('/api/diary')
            .set('Cookie', adminCookie);
        expect(res.status).toBe(200);
        expect(res.body.pagination.total).toBeGreaterThan(0);
    });
});

describe('GET /api/diary/:id', () => {
    let entryId;

    beforeAll(() => {
        const entry = db.prepare("SELECT id FROM diary_entries WHERE student_id = ?").get(studentId);
        entryId = entry?.id;
    });

    it('student can access own entry', async () => {
        const res = await request(app)
            .get(`/api/diary/${entryId}`)
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
    });

    it('mentor can access assigned student entry', async () => {
        const res = await request(app)
            .get(`/api/diary/${entryId}`)
            .set('Cookie', mentorCookie);
        expect(res.status).toBe(200);
    });
});

describe('PATCH /api/diary/:id/response', () => {
    let entryId;

    beforeAll(() => {
        const entry = db.prepare("SELECT id FROM diary_entries WHERE student_id = ?").get(studentId);
        entryId = entry?.id;
    });

    it('mentor can respond to entry', async () => {
        const res = await request(app)
            .patch(`/api/diary/${entryId}/response`)
            .set('Cookie', mentorCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ response: 'Great work this week! Keep maintaining your attendance.' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('reviewed');
    });

    it('student cannot respond to entry', async () => {
        const res = await request(app)
            .patch(`/api/diary/${entryId}/response`)
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ response: 'Student trying to respond.' });
        expect(res.status).toBe(403);
    });
});
