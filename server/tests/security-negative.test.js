const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

async function loginCookie(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'];
}

describe('Negative Security Tests', () => {
    test('Injection attempt is rejected: role[$ne]=admin', async () => {
        await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'Password1',
            role: 'admin',
        });

        const cookie = await loginCookie('admin@example.com', 'Password1');
        const res = await request(app)
            .get('/api/users?role[$ne]=admin')
            .set('Cookie', cookie);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('Regex abuse search is rejected: search=(a+)+', async () => {
        await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'Password1',
            role: 'admin',
        });

        const cookie = await loginCookie('admin@example.com', 'Password1');
        const res = await request(app)
            .get('/api/users?search=(a+)+')
            .set('Cookie', cookie);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('File upload rejects .exe with 415', async () => {
        await User.create({
            name: 'Student A',
            email: '22studenta@gcet.edu.in',
            password: 'Password1',
            role: 'student',
            rollNumber: '22CSA01',
        });

        const cookie = await loginCookie('22studenta@gcet.edu.in', 'Password1');
        const res = await request(app)
            .post('/api/events')
            .set('Cookie', cookie)
            .field('eventName', 'Malicious Upload Attempt')
            .field('eventType', 'technical')
            .field('achievement', 'participated')
            .field('date', '2025-01-15')
            .attach('certificate', Buffer.from('MZ binary'), { filename: 'payload.exe', contentType: 'application/octet-stream' });

        expect(res.status).toBe(415);
        expect(res.body.success).toBe(false);
    });
});
