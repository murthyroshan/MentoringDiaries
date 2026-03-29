/**
 * Marks tests
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
                VALUES ('cse.a3@gcet.edu.in', ?, 'Student CSE-A3', 'student', 'CSE', 'A', 3, '2023-2027', 4, 1)`).run(hash('Student@123'));

    const healthRes = await request(app).get('/api/health');
    const cookies = healthRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : '';
    const baseCookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', baseCookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'cse.a3@gcet.edu.in', password: 'Student@123' });
    studentCookie = loginRes.headers['set-cookie'].join('; ') + '; ' + baseCookieHeader;
});

afterAll(() => { db.close(); });

describe('POST /api/marks — first submission', () => {
    it('creates first marks entry', async () => {
        const res = await request(app)
            .post('/api/marks')
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({
                semester: 3,
                academic_year: '2024-25',
                cgpa: 8.2,
                subjects: [
                    { subject_name: 'Data Structures', grade: 'O' },
                    { subject_name: 'Operating Systems', grade: 'A+' },
                ],
            });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.submission_count).toBe(1);
    });
});

describe('PUT /api/marks/:id — second submission (update)', () => {
    it('updates marks entry (edit)', async () => {
        const entry = db.prepare("SELECT id FROM marks_entries WHERE student_id = (SELECT id FROM users WHERE email = 'cse.a3@gcet.edu.in')").get();
        const res = await request(app)
            .put(`/api/marks/${entry.id}`)
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({
                cgpa: 8.5,
                subjects: [
                    { subject_name: 'Data Structures', grade: 'A+' },
                    { subject_name: 'Operating Systems', grade: 'A' },
                ],
            });
        expect(res.status).toBe(200);
        expect(res.body.data.submission_count).toBe(2);
        expect(res.body.data.cgpa).toBe(8.5);
    });
});

describe('POST /api/marks — third attempt blocked', () => {
    it('blocks third submission attempt', async () => {
        const res = await request(app)
            .post('/api/marks')
            .set('Cookie', studentCookie)
            .set('X-CSRF-Token', csrfToken)
            .send({ semester: 3, academic_year: '2024-25', cgpa: 9.0 });
        // Either 409 (entry exists) or 400 (limit reached)
        expect([400, 409]).toContain(res.status);
        expect(res.body.success).toBe(false);
    });
});
