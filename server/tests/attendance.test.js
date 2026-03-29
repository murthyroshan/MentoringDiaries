/**
 * Attendance tests
 */
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET         = 'test_jwt_secret_must_be_at_least_32_chars_long!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars_long!!!!!!';
process.env.NODE_ENV           = 'test';

jest.mock('../src/socket', () => ({
    initSocket: () => {},
    notifyUserWithPersistence: () => {},
}));

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/app');
const db      = require('../src/database/db');
const { initializeSchema } = require('../src/database/schema');

let studentCookie, csrfToken;

beforeAll(async () => {
    initializeSchema(db);
    const hash = (pw) => bcrypt.hashSync(pw, 4);

    db.prepare(`INSERT INTO users (email, password_hash, name, role, department, section, roll_number, batch, current_semester, is_active)
                VALUES ('cse.a2@gcet.edu.in', ?, 'Student CSE-A2', 'student', 'CSE', 'A', 2, '2023-2027', 4, 1)`).run(hash('Student@123'));

    // Seed attendance rows
    for (let w = 1; w <= 12; w++) {
        db.prepare(`INSERT INTO attendance (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
                    VALUES ('CSE', 'A', 2, ?, '2024-25', 4, ?, ?)`).run(w, 80 + w * 0.5, 78 + w);
    }

    const healthRes = await request(app).get('/api/health');
    const cookies = healthRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : '';
    const baseCookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', baseCookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'cse.a2@gcet.edu.in', password: 'Student@123' });
    studentCookie = loginRes.headers['set-cookie'].join('; ') + '; ' + baseCookieHeader;
});

afterAll(() => { db.close(); });

describe('GET /api/attendance/me', () => {
    it('returns attendance for a specific week', async () => {
        const res = await request(app)
            .get('/api/attendance/me?week=5&semester=4&year=2024-25')
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.week_number).toBe(5);
        expect(res.body.data.cumulative_pct).toBeDefined();
    });

    it('returns null for missing week', async () => {
        const res = await request(app)
            .get('/api/attendance/me?week=99&semester=4&year=2024-25')
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
    });
});

describe('GET /api/attendance/me/history', () => {
    it('returns all weeks for student semester', async () => {
        const res = await request(app)
            .get('/api/attendance/me/history?semester=4&year=2024-25')
            .set('Cookie', studentCookie);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(12);
        expect(res.body.data[0].week_number).toBe(1);
        expect(res.body.data[11].week_number).toBe(12);
    });
});
