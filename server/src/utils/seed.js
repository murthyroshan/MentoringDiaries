/**
 * Seed script — creates realistic test data for MentoringDiaries.
 * Run: node src/utils/seed.js
 *
 * Creates:
 *   - 1 admin, 3 mentors, 10 students
 *   - 3–5 diary entries per student with AI analysis
 *   - 2–3 sessions per student-mentor pair
 *   - Notifications for recent activity
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// ─── Models (inline to avoid import-path issues) ─────────────────────────────
const UserSchema = new mongoose.Schema({
    name: String, email: String, password: String, role: String,
    department: String, batch: String, rollNumber: String,
    assignedMentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'users' })

const DiaryEntrySchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    week: Number,
    startDate: Date, endDate: Date,
    academicYear: String, semester: Number,
    content: String,
    subjectRatings: Array,
    problemsFaced: Object,
    attendancePercentage: Number,
    attendanceExplanation: String,
    emotionalRating: Number,
    academicPerformance: String,
    challenges: String, goals: String,
    mood: Number,
    subjectsOfConcern: [String],
    aiAnalysis: {
        riskScore: Number, riskLevel: String,
        sentiment: String, sentimentScore: Number,
        flagged: Boolean, riskFactors: [String],
        recommendations: [String],
    },
    mentorResponse: String,
    mentorRespondedAt: Date,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'diaryentries' })

const SessionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scheduledAt: Date,
    duration: { type: Number, default: 45 },
    status: { type: String, default: 'scheduled' },
    mode: { type: String, default: 'online' },
    notes: String,
    agenda: String,
    actionItems: [String],
    createdAt: { type: Date, default: Date.now },
}, { collection: 'mentoringsessions' })

const NotificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: String, title: String, message: String,
    isRead: { type: Boolean, default: false },
    relatedEntry: { type: mongoose.Schema.Types.ObjectId, ref: 'DiaryEntry' },
    createdAt: { type: Date, default: Date.now },
}, { collection: 'notifications' })

const User = mongoose.model('User', UserSchema)
const DiaryEntry = mongoose.model('DiaryEntry', DiaryEntrySchema)
const MentoringSession = mongoose.model('MentoringSession', SessionSchema)
const Notification = mongoose.model('Notification', NotificationSchema)

// ─── Seed data ────────────────────────────────────────────────────────────────

const DEPARTMENTS = ['cse', 'ece', 'mech', 'civil', 'it']
const BATCHES = ['2021-2025', '2022-2026', '2023-2027']

const REFLECTIONS = [
    'Had a very productive week. Completed all assignments on time and maintained 100% attendance. Feeling confident about the upcoming lab exams.',
    'Struggled a bit with the advanced topics in Data Structures but managed to get help from peers. Overall attendance was consistent at 90%.',
    'Missed two classes due to illness. Need to catch up on the material covered in Advanced Algorithms. Feeling slightly behind.',
    'Excellent week! Submitted all assignments early and had a very productive mentoring session. My time management has improved significantly.',
    'Multiple deadlines coincided this week and I felt overwhelmed. Submitted most work but quality was not ideal. Need better planning.',
    'Steady week with no major issues. Completed all lab reports and attended every session. Looking forward to the project review.',
    'Participated in the hackathon this weekend which was exciting but affected my study schedule. Need to balance extracurricular activities better.',
    'Challenging week with the semester exams approaching. Spending extra hours studying but feeling the pressure. Could use more mentor guidance.',
    'Great progress on the final year project this week. The team is working well together. Academic performance remains strong.',
    'Attendance dropped this week due to a family emergency. Will make up for missed content over the weekend. Mentored session helped a lot.',
    'Feeling more motivated after last week\'s mentor session. Implemented the study schedule suggested and it\'s making a difference.',
    'Submitted the research paper draft on time. Very happy with the progress. Subject ratings mostly 4/5 this week.',
    'Had difficulty understanding the new module in Computer Networks. Attended extra classes and watched tutorials. Getting better.',
    'This week was smooth. All subjects are on track. Attendance at 95%. Starting to prepare for the final project presentation.',
    'Feeling burned out from continuous assessments. Need a short break but can\'t afford to fall behind. Will discuss with mentor.',
]

const ACADEMIC_CHALLENGES = [
    'Struggling with OS scheduling algorithms',
    'Difficulty with database normalization concepts',
    'Finding networking protocols complex',
    'Mathematical proofs in Algorithm Analysis are challenging',
    'Keeping up with the fast pace of the curriculum',
    '',
]

const GOALS = [
    'Complete all pending assignments by Friday',
    'Improve attendance to above 90% this month',
    'Finish the project module and get mentor feedback',
    'Revise all chapters for the upcoming exam',
    'Maintain current performance and focus on weak subjects',
]

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgo(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d
}

function buildAiAnalysis(attendancePct, emotionalRating, subjectRatings, reflection) {
    // Simulate risk scoring
    let risk = 0
    if (attendancePct < 75) risk += 30
    else if (attendancePct < 85) risk += 10
    if (emotionalRating <= 2) risk += 25
    else if (emotionalRating <= 3) risk += 10
    const avgRating = subjectRatings.length
        ? subjectRatings.reduce((a, s) => a + s.rating, 0) / subjectRatings.length
        : 3
    if (avgRating <= 2) risk += 20
    else if (avgRating <= 3) risk += 8
    // Add some randomness
    risk += randomInt(-8, 15)
    risk = Math.max(5, Math.min(95, risk))

    const riskLevel = risk < 40 ? 'low' : risk < 70 ? 'medium' : 'high'
    const sentimentScore = randomInt(40, 90)
    const sentiment = sentimentScore > 65 ? 'positive' : sentimentScore > 45 ? 'neutral' : 'negative'

    const riskFactors = []
    if (attendancePct < 75) riskFactors.push('low_attendance')
    if (emotionalRating <= 2) riskFactors.push('low_emotional_wellbeing')
    if (avgRating <= 2) riskFactors.push('low_subject_performance')
    if (risk >= 70) riskFactors.push('high_risk_pattern')

    return {
        riskScore: risk,
        riskLevel,
        sentiment,
        sentimentScore,
        flagged: risk >= 70,
        riskFactors,
        recommendations: riskLevel === 'low'
            ? ['Continue current performance', 'Maintain attendance']
            : ['Schedule mentoring session', 'Review study plan', 'Check attendance'],
    }
}

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB:', process.env.MONGO_URI)

    // Clear existing seed data (keep non-seed users)
    const existingEmails = [
        'admin@mentoring.edu', 'mentor1@mentoring.edu', 'mentor2@mentoring.edu', 'mentor3@mentoring.edu',
        ...Array.from({ length: 10 }, (_, i) => `student${i + 1}@university.edu`),
    ]
    const existingUsers = await User.find({ email: { $in: existingEmails } }).select('_id')
    if (existingUsers.length > 0) {
        const ids = existingUsers.map(u => u._id)
        await DiaryEntry.deleteMany({ student: { $in: ids } })
        await MentoringSession.deleteMany({ mentor: { $in: ids } })
        await Notification.deleteMany({ recipient: { $in: ids } })
        await User.deleteMany({ email: { $in: existingEmails } })
        console.log('🧹 Cleared previous seed data')
    }

    const hash = await bcrypt.hash('Seed@1234', 12)

    // ── Admin ──────────────────────────────────────────────────────────────────
    const admin = await User.create({
        name: 'Dr. Priya Mehta',
        email: 'admin@mentoring.edu',
        password: hash,
        role: 'admin',
        department: 'administration',
        batch: '',
    })
    console.log('👑 Admin created:', admin.email)

    // ── Mentors ────────────────────────────────────────────────────────────────
    const mentorData = [
        { name: 'Dr. Reema Sharma',  email: 'mentor1@mentoring.edu', department: 'cse' },
        { name: 'Prof. Arun Nair',   email: 'mentor2@mentoring.edu', department: 'ece' },
        { name: 'Dr. Kavita Patel',  email: 'mentor3@mentoring.edu', department: 'mech' },
    ]
    const mentors = await User.insertMany(mentorData.map(m => ({ ...m, password: hash, role: 'mentor' })))
    console.log('👩‍🏫 Mentors created:', mentors.length)

    // ── Students ───────────────────────────────────────────────────────────────
    const studentData = Array.from({ length: 10 }, (_, i) => ({
        name: [
            'Arjun Kapoor', 'Sneha Reddy', 'Rahul Singh', 'Priya Nair',
            'Karan Shah', 'Divya Menon', 'Rohit Gupta', 'Anjali Kumar',
            'Vikram Iyer', 'Pooja Agarwal',
        ][i],
        email: `student${i + 1}@university.edu`,
        password: hash,
        role: 'student',
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        batch: BATCHES[i % BATCHES.length],
        rollNumber: `2021${(i + 1).toString().padStart(3, '0')}`,
        assignedMentor: mentors[i % mentors.length]._id,
    }))
    const students = await User.insertMany(studentData)
    console.log('🎓 Students created:', students.length)

    // Update mentors' assignedStudents list
    for (const mentor of mentors) {
        const myStudents = students.filter(s => s.assignedMentor.equals(mentor._id))
        await User.findByIdAndUpdate(mentor._id, { assignedStudents: myStudents.map(s => s._id) })
    }

    // ── Diary Entries ──────────────────────────────────────────────────────────
    const allEntries = []
    for (const student of students) {
        const mentor = mentors.find(m => m._id.equals(student.assignedMentor))
        const numEntries = randomInt(3, 5)

        for (let w = 0; w < numEntries; w++) {
            const weekNum = 14 - (numEntries - 1 - w)
            const daysBack = (numEntries - 1 - w) * 7 + randomInt(0, 2)
            const entryDate = daysAgo(daysBack)
            const startDate = new Date(entryDate); startDate.setDate(startDate.getDate() - 4)
            const endDate = new Date(entryDate)

            const subjects = ['Mathematics', 'Computer Science', 'Physics', 'English', 'Data Structures']
                .slice(0, randomInt(3, 5))
                .map(name => ({ name, rating: randomInt(2, 5) }))

            const attendancePct = randomInt(65, 100)
            const emotionalRating = randomInt(2, 5)
            const reflection = randomFrom(REFLECTIONS)
            const aiAnalysis = buildAiAnalysis(attendancePct, emotionalRating, subjects, reflection)

            const isReviewed = w < numEntries - 1  // all except latest are reviewed
            const entry = {
                student: student._id,
                mentor: mentor._id,
                week: weekNum,
                startDate, endDate,
                academicYear: '2025-26',
                semester: 2,
                content: reflection,
                subjectRatings: subjects,
                problemsFaced: {
                    academic: randomFrom(ACADEMIC_CHALLENGES),
                    personal: '',
                    other: '',
                },
                attendancePercentage: attendancePct,
                attendanceExplanation: attendancePct < 75 ? 'Medical appointment and family emergency' : '',
                emotionalRating,
                academicPerformance: emotionalRating >= 4 ? 'Good' : emotionalRating === 3 ? 'Average' : 'Below average',
                challenges: randomFrom(ACADEMIC_CHALLENGES),
                goals: randomFrom(GOALS),
                mood: emotionalRating,
                subjectsOfConcern: subjects.filter(s => s.rating <= 2).map(s => s.name),
                aiAnalysis,
                status: isReviewed ? 'reviewed' : 'pending',
                mentorResponse: isReviewed
                    ? 'Thank you for sharing. Your consistency is commendable. Let\'s discuss the challenges in our next session and work on an action plan together.'
                    : undefined,
                mentorRespondedAt: isReviewed ? daysAgo(daysBack - 2) : undefined,
                createdAt: entryDate,
            }
            allEntries.push(entry)
        }
    }
    const createdEntries = await DiaryEntry.insertMany(allEntries)
    console.log('📓 Diary entries created:', createdEntries.length)

    // ── Sessions ────────────────────────────────────────────────────────────────
    const allSessions = []
    for (const student of students) {
        const mentor = mentors.find(m => m._id.equals(student.assignedMentor))

        // 2 past sessions
        for (let s = 0; s < 2; s++) {
            const scheduledAt = daysAgo(14 - s * 7)
            allSessions.push({
                student: student._id,
                mentor: mentor._id,
                scheduledAt,
                duration: randomFrom([40, 45, 50, 60]),
                status: 'completed',
                mode: randomFrom(['online', 'in-person']),
                agenda: 'Review latest diary entries, discuss academic progress, set goals for next week.',
                notes: 'Student showed good progress. Discussed time management strategies and upcoming exam preparation.',
                actionItems: [
                    'Submit diary entry by Sunday',
                    'Revise chapters 5-7 for the exam',
                    'Attend all scheduled lab sessions',
                ],
                createdAt: daysAgo(15 - s * 7),
            })
        }

        // 1 upcoming session
        const upcoming = new Date()
        upcoming.setDate(upcoming.getDate() + randomInt(3, 10))
        allSessions.push({
            student: student._id,
            mentor: mentor._id,
            scheduledAt: upcoming,
            duration: 45,
            status: 'scheduled',
            mode: 'online',
            agenda: 'Discuss week 14 entry, review semester progress, plan for final exams.',
            createdAt: daysAgo(2),
        })
    }
    const createdSessions = await MentoringSession.insertMany(allSessions)
    console.log('📅 Sessions created:', createdSessions.length)

    // ── Notifications ──────────────────────────────────────────────────────────
    const notifications = []
    for (const student of students) {
        const mentor = mentors.find(m => m._id.equals(student.assignedMentor))
        const studentEntries = createdEntries.filter(e => e.student.equals(student._id))
        const latestEntry = studentEntries[studentEntries.length - 1]

        // Notify mentor of latest entry
        notifications.push({
            recipient: mentor._id,
            type: 'new_entry',
            title: 'New diary entry submitted',
            message: `${student.name} submitted a new diary entry for Week ${14}.`,
            relatedEntry: latestEntry._id,
            isRead: false,
            createdAt: latestEntry.createdAt,
        })

        // Notify student of mentor response on 2nd-last entry
        if (studentEntries.length >= 2) {
            const reviewed = studentEntries[studentEntries.length - 2]
            notifications.push({
                recipient: student._id,
                type: 'mentor_response',
                title: 'Mentor reviewed your entry',
                message: `${mentor.name} has responded to your Week ${reviewed.week} entry.`,
                relatedEntry: reviewed._id,
                isRead: Math.random() > 0.4,
                createdAt: daysAgo(randomInt(2, 5)),
            })
        }

        // Notify admin of any high-risk entry
        const highRisk = studentEntries.find(e => e.aiAnalysis?.riskLevel === 'high')
        if (highRisk) {
            notifications.push({
                recipient: admin._id,
                type: 'high_risk',
                title: 'High-risk student flagged',
                message: `${student.name} has a high-risk entry (score: ${highRisk.aiAnalysis.riskScore}).`,
                relatedEntry: highRisk._id,
                isRead: false,
                createdAt: highRisk.createdAt,
            })
        }
    }
    const createdNotifications = await Notification.insertMany(notifications)
    console.log('🔔 Notifications created:', createdNotifications.length)

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ SEED COMPLETE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Users:         ', await User.countDocuments())
    console.log('Diary entries: ', await DiaryEntry.countDocuments())
    console.log('Sessions:      ', await MentoringSession.countDocuments())
    console.log('Notifications: ', await Notification.countDocuments())
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📋 LOGIN CREDENTIALS (password for all: Seed@1234)')
    console.log('Admin:   admin@mentoring.edu')
    console.log('Mentor1: mentor1@mentoring.edu  (Dr. Reema Sharma)')
    console.log('Mentor2: mentor2@mentoring.edu  (Prof. Arun Nair)')
    console.log('Mentor3: mentor3@mentoring.edu  (Dr. Kavita Patel)')
    console.log('Student: student1@university.edu  (Arjun Kapoor)')
    console.log('Student: student2@university.edu  (Sneha Reddy)')
    console.log('... student3–10@university.edu')

    await mongoose.disconnect()
}

seed().catch(e => {
    console.error('❌ Seed failed:', e.message)
    console.error(e.stack)
    process.exit(1)
})
