const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const DiaryEntry = require('../src/models/DiaryEntry');
const AcademicRecord = require('../src/models/AcademicRecord');
const Event = require('../src/models/Event');
const SkillProgress = require('../src/models/SkillProgress');

async function loginCookie(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    return res.headers['set-cookie'];
}

async function seedFixture() {
    const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Password1',
        role: 'admin',
    });

    const mentorAssigned = await User.create({
        name: 'Assigned Mentor',
        email: 'mentor.assigned@example.com',
        password: 'Password1',
        role: 'mentor',
    });

    const mentorUnassigned = await User.create({
        name: 'Unassigned Mentor',
        email: 'mentor.unassigned@example.com',
        password: 'Password1',
        role: 'mentor',
    });

    const studentA = await User.create({
        name: 'Student A',
        email: '22studenta@gcet.edu.in',
        password: 'Password1',
        role: 'student',
        rollNumber: '22CSA01',
        assignedMentor: mentorAssigned._id,
    });

    const studentB = await User.create({
        name: 'Student B',
        email: '22studentb@gcet.edu.in',
        password: 'Password1',
        role: 'student',
        rollNumber: '22CSB01',
        assignedMentor: mentorUnassigned._id,
    });

    await User.findByIdAndUpdate(mentorAssigned._id, { $addToSet: { assignedStudents: studentA._id } });
    await User.findByIdAndUpdate(mentorUnassigned._id, { $addToSet: { assignedStudents: studentB._id } });

    const diaryA = await DiaryEntry.create({
        student: studentA._id,
        mentor: mentorAssigned._id,
        content: 'This week I learned APIs and practiced coding for many hours with good progress.',
        academicYear: '2024-25',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-07'),
    });

    const diaryB = await DiaryEntry.create({
        student: studentB._id,
        mentor: mentorUnassigned._id,
        content: 'This week was difficult and I need support with assignments and understanding core subjects.',
        academicYear: '2024-25',
        startDate: new Date('2025-01-08'),
        endDate: new Date('2025-01-14'),
    });

    const academicA = await AcademicRecord.create({
        student: studentA._id,
        semester: 3,
        examType: 'mid1',
        subjects: [{ name: 'DBMS', marks: 30 }],
        academicYear: '2024-25',
    });

    const academicB = await AcademicRecord.create({
        student: studentB._id,
        semester: 3,
        examType: 'mid1',
        subjects: [{ name: 'OS', marks: 26 }],
        academicYear: '2024-25',
    });

    const eventA = await Event.create({
        student: studentA._id,
        eventName: 'Hackathon',
        eventType: 'technical',
        achievement: 'participated',
        date: new Date('2025-01-10'),
    });

    const eventB = await Event.create({
        student: studentB._id,
        eventName: 'Workshop',
        eventType: 'workshop',
        achievement: 'participated',
        date: new Date('2025-01-10'),
    });

    const skillA = await SkillProgress.create({
        student: studentA._id,
        skillCategory: 'Technical',
        skillName: 'Node.js',
        ratingBefore: 2,
        ratingAfter: 3,
    });

    const skillB = await SkillProgress.create({
        student: studentB._id,
        skillCategory: 'Technical',
        skillName: 'React',
        ratingBefore: 2,
        ratingAfter: 4,
    });

    return {
        users: { admin, mentorAssigned, mentorUnassigned, studentA, studentB },
        diary: { diaryA, diaryB },
        academic: { academicA, academicB },
        events: { eventA, eventB },
        skills: { skillA, skillB },
    };
}

describe('Permission Hardening Matrix', () => {
    test('Student permissions', async () => {
        const fx = await seedFixture();
        const cookie = await loginCookie('22studenta@gcet.edu.in', 'Password1');

        const ownDiary = await request(app).get(`/api/diary/${fx.diary.diaryA._id}`).set('Cookie', cookie);
        expect(ownDiary.status).toBe(200);

        const otherDiary = await request(app).get(`/api/diary/${fx.diary.diaryB._id}`).set('Cookie', cookie);
        expect(otherDiary.status).toBe(403);

        const otherAcademic = await request(app).get(`/api/academic/${fx.academic.academicB._id}`).set('Cookie', cookie);
        expect(otherAcademic.status).toBe(403);

        const adminEndpoint = await request(app).get('/api/users').set('Cookie', cookie);
        expect(adminEndpoint.status).toBe(403);
    });

    test('Mentor permissions (assigned vs unassigned + mutation restrictions)', async () => {
        const fx = await seedFixture();
        const cookie = await loginCookie('mentor.assigned@example.com', 'Password1');

        const assignedDiary = await request(app).get(`/api/diary/${fx.diary.diaryA._id}`).set('Cookie', cookie);
        expect(assignedDiary.status).toBe(200);

        const unassignedDiary = await request(app).get(`/api/diary/${fx.diary.diaryB._id}`).set('Cookie', cookie);
        expect(unassignedDiary.status).toBe(403);

        const respondAssigned = await request(app)
            .patch(`/api/diary/${fx.diary.diaryA._id}/response`)
            .set('Cookie', cookie)
            .send({ response: 'Please continue this effort and let us discuss your goals this week.' });
        expect(respondAssigned.status).toBe(200);

        const modifyAdminData = await request(app)
            .delete(`/api/users/${fx.users.studentB._id}`)
            .set('Cookie', cookie);
        expect(modifyAdminData.status).toBe(403);

        const assignedAcademic = await request(app)
            .get(`/api/academic?studentId=${fx.users.studentA._id}`)
            .set('Cookie', cookie);
        expect(assignedAcademic.status).toBe(200);

        const unassignedAcademic = await request(app)
            .get(`/api/academic?studentId=${fx.users.studentB._id}`)
            .set('Cookie', cookie);
        expect(unassignedAcademic.status).toBe(403);

        const assignedEvents = await request(app)
            .get(`/api/events?studentId=${fx.users.studentA._id}`)
            .set('Cookie', cookie);
        expect(assignedEvents.status).toBe(200);

        const unassignedEvents = await request(app)
            .get(`/api/events?studentId=${fx.users.studentB._id}`)
            .set('Cookie', cookie);
        expect(unassignedEvents.status).toBe(403);

        const assignedSkills = await request(app)
            .get(`/api/skills?studentId=${fx.users.studentA._id}`)
            .set('Cookie', cookie);
        expect(assignedSkills.status).toBe(200);

        const unassignedSkills = await request(app)
            .get(`/api/skills?studentId=${fx.users.studentB._id}`)
            .set('Cookie', cookie);
        expect(unassignedSkills.status).toBe(403);
    });

    test('Admin permissions', async () => {
        const fx = await seedFixture();
        const cookie = await loginCookie('admin@example.com', 'Password1');

        const anyDiary = await request(app).get(`/api/diary/${fx.diary.diaryB._id}`).set('Cookie', cookie);
        expect(anyDiary.status).toBe(200);

        const anyAcademic = await request(app).get(`/api/academic/${fx.academic.academicB._id}`).set('Cookie', cookie);
        expect(anyAcademic.status).toBe(200);

        const anyEvent = await request(app).get(`/api/events?studentId=${fx.users.studentB._id}`).set('Cookie', cookie);
        expect(anyEvent.status).toBe(200);

        const anySkill = await request(app).get(`/api/skills?studentId=${fx.users.studentB._id}`).set('Cookie', cookie);
        expect(anySkill.status).toBe(200);

        const manageUsers = await request(app).get('/api/users').set('Cookie', cookie);
        expect(manageUsers.status).toBe(200);
    });
});
