/**
 * Achievements tests
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
                VALUES ('cse.a4@gcet.edu.in', ?, 'Student CSE-A4', 'student', 'CSE', 'A', 4, '2023-2027', 4, 1)`).run(hash('Student@123'));

    const healthRes = await request(app).get('/api/health');
    const cookies = healthRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : '';
    const baseCookieHeader = cookies.map(c => c.split(';')[0]).join('; ');

    const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', baseCookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send({ email: 'cse.a4@gcet.edu.in', password: 'Student@123' });
    studentCookie = loginRes.headers['set-cookie'].join('; ') + '; ' + baseCookieHeader;
});

afterAll(() => { db.close(); });

async function createAchievement(n) {
    return request(app)
        .post('/api/achievements')
        .set('Cookie', studentCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({
            type: 'event',
            title: `Achievement ${n}`,
            semester: 4,
            academic_year: '2024-25',
        });
}

describe('POST /api/achievements', () => {
    it('creates first achievement', async () => {
        const res = await createAchievement(1);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    it('creates second achievement', async () => {
        const res = await createAchievement(2);
        expect(res.status).toBe(201);
    });

    it('creates third achievement', async () => {
        const res = await createAchievement(3);
        expect(res.status).toBe(201);
    });

    it('blocks fourth achievement (limit 3)', async () => {
        const res = await createAchievement(4);
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/3/);
    });
});
