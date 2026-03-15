const DiaryEntry = require('../models/DiaryEntry');
const AcademicRecord = require('../models/AcademicRecord');
const Event = require('../models/Event');
const SkillProgress = require('../models/SkillProgress');
const MentoringSession = require('../models/MentoringSession');

// GET /api/student/all-entries
// Combines all 4 record types for the logged-in student, sorted newest first.
exports.getAllEntries = async (req, res, next) => {
    try {
        const studentId = req.user._id;

        const [diary, academic, events, skills] = await Promise.all([
            DiaryEntry.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('startDate endDate week periodLabel content attendancePercentage emotionalRating aiAnalysis status createdAt')
                .lean({ virtuals: true }),

            AcademicRecord.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('semester examType subjects endsemSubjects finalCgpa overallPercentage academicYear createdAt')
                .lean(),

            Event.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('eventName organizedBy eventType achievement date description certificateUrl createdAt')
                .lean(),

            SkillProgress.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('skillName skillCategory ratingBefore ratingAfter description source createdAt')
                .lean(),
        ]);

        // Add type tags
        const taggedDiary = diary.map(e => ({ ...e, type: 'weekly' }));
        const taggedAcademic = academic.map(e => ({ ...e, type: 'academic' }));
        const taggedEvents = events.map(e => ({ ...e, type: 'event' }));
        const taggedSkills = skills.map(e => ({ ...e, type: 'skill' }));

        // Merge and sort all by createdAt descending
        const all = [...taggedDiary, ...taggedAcademic, ...taggedEvents, ...taggedSkills]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            success: true,
            data: all,
            counts: {
                weekly: taggedDiary.length,
                academic: taggedAcademic.length,
                event: taggedEvents.length,
                skill: taggedSkills.length,
                total: all.length,
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/student/timeline
exports.getStudentTimeline = async (req, res, next) => {
    try {
        const studentId = req.user._id;

        const [diary, academic, events, skills, sessions] = await Promise.all([
            DiaryEntry.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('content createdAt mentorRespondedAt mentorResponse aiAnalysis status periodLabel')
                .lean({ virtuals: true }),
            AcademicRecord.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('semester examType overallPercentage finalCgpa createdAt')
                .lean(),
            Event.find({ student: studentId })
                .sort({ date: -1, createdAt: -1 })
                .select('eventName eventType achievement date createdAt')
                .lean(),
            SkillProgress.find({ student: studentId })
                .sort({ createdAt: -1 })
                .select('skillName skillCategory ratingBefore ratingAfter createdAt')
                .lean(),
            MentoringSession.find({ student: studentId })
                .sort({ date: -1, createdAt: -1 })
                .select('date agenda followUpDate createdAt')
                .lean(),
        ]);

        const timeline = [];

        diary.forEach((entry) => {
            timeline.push({
                type: 'diary_entry',
                timestamp: entry.createdAt,
                title: 'Diary entry submitted',
                description: entry.content?.slice(0, 140) || 'Weekly diary update',
                metadata: {
                    entryId: entry._id,
                    riskLevel: entry.aiAnalysis?.riskLevel,
                    sentiment: entry.aiAnalysis?.sentiment,
                    status: entry.status,
                    periodLabel: entry.periodLabel,
                },
            });

            if (entry.mentorRespondedAt && entry.mentorResponse) {
                timeline.push({
                    type: 'mentor_response',
                    timestamp: entry.mentorRespondedAt,
                    title: 'Mentor responded',
                    description: entry.mentorResponse.slice(0, 140),
                    metadata: { entryId: entry._id },
                });
            }
        });

        academic.forEach((record) => {
            timeline.push({
                type: 'academic_update',
                timestamp: record.createdAt,
                title: `Academic update: ${record.examType?.toUpperCase()} (Sem ${record.semester})`,
                description: record.examType === 'endsem'
                    ? `CGPA ${record.finalCgpa ?? '-'}`
                    : `Overall ${record.overallPercentage ?? 0}%`,
                metadata: { recordId: record._id },
            });
        });

        events.forEach((event) => {
            timeline.push({
                type: 'event_attended',
                timestamp: event.date || event.createdAt,
                title: `Event: ${event.eventName}`,
                description: `${event.eventType} • ${event.achievement}`,
                metadata: { eventId: event._id },
            });
        });

        skills.forEach((skill) => {
            timeline.push({
                type: 'skill_added',
                timestamp: skill.createdAt,
                title: `Skill updated: ${skill.skillName}`,
                description: `${skill.ratingBefore} -> ${skill.ratingAfter}`,
                metadata: { skillId: skill._id, category: skill.skillCategory },
            });
        });

        sessions.forEach((session) => {
            timeline.push({
                type: 'session_update',
                timestamp: session.date || session.createdAt,
                title: 'Mentoring session',
                description: session.agenda || 'Session scheduled',
                metadata: {
                    sessionId: session._id,
                    followUpDate: session.followUpDate,
                },
            });
        });

        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            success: true,
            data: timeline,
            total: timeline.length,
        });
    } catch (error) {
        next(error);
    }
};
