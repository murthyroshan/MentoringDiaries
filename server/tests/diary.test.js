const request = require('supertest');
const app = require('../src/app');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(agent, userData) {
    await agent.post('/api/auth/register').send(userData);
    return agent;
}

// Minimum valid diary entry body that passes all validators.
const validEntry = {
    content: 'This week I focused on data structures and algorithms. I made good progress understanding binary trees and hash maps.',
    startDate: '2026-03-10',
    endDate: '2026-03-16',
    emotionalRating: 4,
    attendancePercentage: 85,
};

const studentA = {
    name: 'Alice',
    email: 'alice@gcet.edu.in',
    password: 'Test1234',
    role: 'student',
    rollNumber: '22CS001',
    department: 'CSE',
    batch: '2022-26',
};

const studentB = {
    name: 'Bob',
    email: 'bob@gcet.edu.in',
    password: 'Test1234',
    role: 'student',
    rollNumber: '22CS002',
    department: 'CSE',
    batch: '2022-26',
};

// ─── Entry creation ───────────────────────────────────────────────────────────

describe('POST /api/diary', () => {
    it('allows a student to submit a valid diary entry (201)', async () => {
        const agent = request.agent(app);
        await registerAndLogin(agent, studentA);

        const res = await agent.post('/api/diary').send(validEntry);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.content).toBe(validEntry.content);
        expect(res.body.data.aiAnalysis).toBeDefined();
    });

    it('returns 400 when content is too short', async () => {
        const agent = request.agent(app);
        await registerAndLogin(agent, studentA);

        const res = await agent.post('/api/diary').send({ ...validEntry, content: 'Too short.' });
        expect(res.status).toBe(400);
    });

    it('returns 400 for malformed subjectRatings JSON string', async () => {
        const agent = request.agent(app);
        await registerAndLogin(agent, studentA);

        const res = await agent.post('/api/diary').send({
            ...validEntry,
            subjectRatings: '{ invalid json [',
        });
        expect(res.status).toBe(400);
    });

    it('returns 400 when subjectRatings JSON parses to a non-array', async () => {
        const agent = request.agent(app);
        await registerAndLogin(agent, studentA);

        const res = await agent.post('/api/diary').send({
            ...validEntry,
            subjectRatings: '{"name":"Math","rating":4}', // object, not array
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/array/i);
    });

    it('returns 401 when no auth cookie is present', async () => {
        const res = await request(app).post('/api/diary').send(validEntry);
        expect(res.status).toBe(401);
    });
});

// ─── IDOR: student cannot read another student's entry ────────────────────────

describe('GET /api/diary/:id — IDOR protection', () => {
    it("returns 403 when student A tries to read student B's entry", async () => {
        // Register and create an entry as student B
        const agentB = request.agent(app);
        await registerAndLogin(agentB, studentB);
        const createRes = await agentB.post('/api/diary').send(validEntry);
        expect(createRes.status).toBe(201);
        const entryId = createRes.body.data._id;

        // Register student A and attempt to read B's entry
        const agentA = request.agent(app);
        await registerAndLogin(agentA, studentA);
        const res = await agentA.get(`/api/diary/${entryId}`);
        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
    });

    it('allows a student to read their own entry (200)', async () => {
        const agent = request.agent(app);
        await registerAndLogin(agent, studentA);
        const createRes = await agent.post('/api/diary').send(validEntry);
        const entryId = createRes.body.data._id;

        const res = await agent.get(`/api/diary/${entryId}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(entryId);
    });
});

// ─── Entry listing ────────────────────────────────────────────────────────────

describe('GET /api/diary', () => {
    it('returns only the logged-in student\'s own entries', async () => {
        // Both students create entries
        const agentA = request.agent(app);
        await registerAndLogin(agentA, studentA);
        await agentA.post('/api/diary').send(validEntry);

        const agentB = request.agent(app);
        await registerAndLogin(agentB, studentB);
        await agentB.post('/api/diary').send(validEntry);

        // Student A's list should contain only their entry
        const res = await agentA.get('/api/diary');
        expect(res.status).toBe(200);
        const entries = res.body.data;
        entries.forEach((e) => {
            expect(e.student.email).toBe(studentA.email);
        });
    });

    it('returns 401 for unauthenticated requests', async () => {
        const res = await request(app).get('/api/diary');
        expect(res.status).toBe(401);
    });
});
