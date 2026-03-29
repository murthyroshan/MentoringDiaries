/**
 * Auth tests — POST /api/auth/register, login, getMe, logout, refresh
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

const request = require('supertest');
const bcrypt  = require('bcryptjs');
const app     = require('../src/app');
const db      = require('../src/database/db');
const { initializeSchema } = require('../src/database/schema');

let csrfToken = '';
let baseCookieHeader = '';

beforeAll(async () => {
    initializeSchema(db);
    const hash = bcrypt.hashSync('Admin@123', 4);
    db.prepare(`INSERT INTO users (email, password_hash, name, role, is_active)
                VALUES ('admin@gcet.edu.in', ?, 'Admin', 'admin', 1)`).run(hash);

    // Grab CSRF token from health endpoint
    const healthRes = await request(app).get('/api/health');
    const cookies = healthRes.headers['set-cookie'] || [];
    const csrfCookie = cookies.find(c => c.startsWith('csrf-token='));
    csrfToken = csrfCookie ? csrfCookie.split('=')[1].split(';')[0] : '';
    baseCookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
});

afterAll(() => { db.close(); });

async function post(path, body) {
    return request(app)
        .post(path)
        .set('Cookie', baseCookieHeader)
        .set('X-CSRF-Token', csrfToken)
        .send(body);
}

function cookiesFromResponse(res) {
    const sc = res.headers['set-cookie'];
    if (!sc) return baseCookieHeader;
    const arr = Array.isArray(sc) ? sc : [sc];
    return arr.map(c => c.split(';')[0]).join('; ') + '; ' + baseCookieHeader;
}

describe('POST /api/auth/register', () => {
    it('registers a new student', async () => {
        const res = await post('/api/auth/register', {
            name: 'Test Student', email: 'cse.a1@gcet.edu.in',
            password: 'Student@123', role: 'student',
            department: 'CSE', section: 'A', roll_number: 1,
        });
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.role).toBe('student');
        expect(res.body.data.user.department).toBe('CSE');
    });

    it('rejects duplicate email', async () => {
        const res = await post('/api/auth/register', {
            name: 'Dup', email: 'cse.a1@gcet.edu.in',
            password: 'Student@123', role: 'student',
            department: 'CSE', section: 'A', roll_number: 1,
        });
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('rejects missing department for student', async () => {
        const res = await post('/api/auth/register', {
            name: 'No Dept', email: 'cse.b1@gcet.edu.in',
            password: 'Student@123', role: 'student',
            section: 'A', roll_number: 1,
        });
        expect(res.status).toBe(400);
    });

    it('rejects invalid section for department', async () => {
        const res = await post('/api/auth/register', {
            name: 'Bad Sec', email: 'aiml.z1@gcet.edu.in',
            password: 'Student@123', role: 'student',
            department: 'AIML', section: 'D', roll_number: 1,
        });
        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    it('logs in successfully', async () => {
        const res = await post('/api/auth/login', {
            email: 'cse.a1@gcet.edu.in', password: 'Student@123',
        });
        expect(res.status).toBe(200);
        expect(res.body.data.user.role).toBe('student');
        const sc = res.headers['set-cookie'] || [];
        const arr = Array.isArray(sc) ? sc : [sc];
        expect(arr.some(c => c.startsWith('accessToken='))).toBe(true);
    });

    it('rejects wrong password', async () => {
        const res = await post('/api/auth/login', {
            email: 'cse.a1@gcet.edu.in', password: 'WrongPass1',
        });
        expect(res.status).toBe(401);
    });

    it('rejects deactivated account', async () => {
        db.prepare("UPDATE users SET is_active = 0 WHERE email = 'cse.a1@gcet.edu.in'").run();
        const res = await post('/api/auth/login', {
            email: 'cse.a1@gcet.edu.in', password: 'Student@123',
        });
        expect(res.status).toBe(401);
        db.prepare("UPDATE users SET is_active = 1 WHERE email = 'cse.a1@gcet.edu.in'").run();
    });
});

describe('GET /api/auth/me', () => {
    it('returns user when authenticated', async () => {
        const loginRes = await post('/api/auth/login', {
            email: 'cse.a1@gcet.edu.in', password: 'Student@123',
        });
        const authCookies = cookiesFromResponse(loginRes);

        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Cookie', authCookies);
        expect(meRes.status).toBe(200);
        expect(meRes.body.data.user.email).toBe('cse.a1@gcet.edu.in');
    });

    it('returns 401 when unauthenticated', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });
});

describe('POST /api/auth/logout', () => {
    it('clears cookies on logout', async () => {
        const loginRes = await post('/api/auth/login', {
            email: 'admin@gcet.edu.in', password: 'Admin@123',
        });
        const authCookies = cookiesFromResponse(loginRes);

        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', authCookies)
            .set('X-CSRF-Token', csrfToken);
        expect(logoutRes.status).toBe(200);
        expect(logoutRes.body.success).toBe(true);
    });
});

describe('POST /api/auth/refresh', () => {
    it('issues new access token', async () => {
        const loginRes = await post('/api/auth/login', {
            email: 'admin@gcet.edu.in', password: 'Admin@123',
        });
        const authCookies = cookiesFromResponse(loginRes);

        const refreshRes = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', authCookies)
            .set('X-CSRF-Token', csrfToken);
        expect(refreshRes.status).toBe(200);
        expect(refreshRes.body.success).toBe(true);
    });
});
