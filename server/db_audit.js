const mongoose = require('mongoose');
const uri = 'mongodb://localhost:27017/mentoring_diaries';

async function audit() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const userCount = await db.collection('users').countDocuments();
  const entryCount = await db.collection('diaryentries').countDocuments();
  const sessionCount = await db.collection('mentoringsessions').countDocuments();
  const notifCount = await db.collection('notifications').countDocuments();

  const roles = await db.collection('users').aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } }
  ]).toArray();

  const assignedStudents = await db.collection('users').countDocuments({
    role: 'student', assignedMentor: { $exists: true, $ne: null }
  });

  const entriesWithAI = await db.collection('diaryentries').countDocuments({
    'aiAnalysis.riskScore': { $exists: true }
  });

  const sampleUser = await db.collection('users').findOne({}, { projection: { name:1, email:1, role:1 } });
  const sampleEntry = await db.collection('diaryentries').findOne({}, {
    projection: { student:1, 'aiAnalysis.riskScore':1, 'aiAnalysis.riskLevel':1, createdAt:1 }
  });

  console.log('COUNTS: users=%d entries=%d sessions=%d notifications=%d',
    userCount, entryCount, sessionCount, notifCount);
  console.log('ROLES:', JSON.stringify(roles));
  console.log('assignedStudents:', assignedStudents);
  console.log('entriesWithAI:', entriesWithAI);
  console.log('sampleUser:', JSON.stringify(sampleUser));
  console.log('sampleEntry:', JSON.stringify(sampleEntry));

  await mongoose.disconnect();
}

audit().catch(e => { console.error('DB ERROR:', e.message); process.exit(1); });
