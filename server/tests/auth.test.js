const request = require('supertest');
const app = require('../src/app');

// ─── Shared test fixtures ─────────────────────────────────────────────────────

const student = {
    name: 'Alice Student',
    email: 'alice@gcet.edu.in',
    password: 'Test1234',
    role: 'student',
    rollNumber: '22CS001',
    department: 'CSE',
    batch: '2022-26',
};

const mentor = {
    name: 'Bob Mentor',
    email: 'bob@example.com',
    password: 'Test1234',
    role: 'mentor',
};

// ─── Registration ─────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
    it('creates a new student and returns 201 with user data', async () => {
        const res = await request(app).post('/api/auth/register').send(student);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(student.email);
        expect(res.body.user.role).toBe('student');
        expect(res.body.user.password).toBeUndefined();
    });

    it('creates a new mentor and returns 201', async () => {
        const res = await request(app).post('/api/auth/register').send(mentor);
        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('mentor');
    });

    it('returns 409 when the email is already registered', async () => {
        await request(app).post('/api/auth/register').send(student);
        const res = await request(app).post('/api/auth/register').send(student);
        expect(res.status).toBe(409);
        expect(res.body.success).toBe(false);
    });

    it('returns 400 when a student uses a non-institutional email', async () => {
        const res = await request(app).post('/api/auth/register').send({
            ...student,
            email: 'alice@gmail.com',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when password is too short', async () => {
        const res = await request(app).post('/api/auth/register').send({
            ...student,
            email: 'short@gcet.edu.in',
            password: 'abc',
        });
        expect(res.status).toBe(400);
    });
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send(student);
    });

    it('returns 200 and sets httpOnly cookies for valid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: student.email, password: student.password });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(student.email);
        // Cookies should be present
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
        expect(cookies.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('returns 401 for wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: student.email, password: 'WrongPass99' });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    it('returns 401 for unknown email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@gcet.edu.in', password: 'Test1234' });
        expect(res.status).toBe(401);
    });
});

// ─── /auth/me ─────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
    it('returns 401 when no token is provided', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('returns 200 with full user object when authenticated', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);

        const res = await agent.get('/api/auth/me');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.email).toBe(student.email);
        expect(res.body.user.password).toBeUndefined();
        expect(res.body.user.refreshToken).toBeUndefined();
    });
});

// ─── Token refresh ────────────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
    it('issues a new access token when the refresh token cookie is valid', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);

        const res = await agent.post('/api/auth/refresh');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const cookies = res.headers['set-cookie'];
        expect(cookies.some((c) => c.startsWith('accessToken='))).toBe(true);
    });

    it('returns 401 when no refresh token cookie is present', async () => {
        const res = await request(app).post('/api/auth/refresh');
        expect(res.status).toBe(401);
    });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
    it('returns 200 and clears auth cookies', async () => {
        const agent = request.agent(app);
        await agent.post('/api/auth/register').send(student);

        const res = await agent.post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // After logout, /auth/me should fail
        const meRes = await agent.get('/api/auth/me');
        expect(meRes.status).toBe(401);
    });
});
