const { Transform } = require('stream');
const DiaryEntry = require('../models/DiaryEntry');

// Column definitions
const ANALYTICS_FIELDS = [
    'Entry Date', 'Student Name', 'Student Email', 'Department', 'Batch',
    'Week', 'Academic Year', 'Mood (1-5)', 'Sentiment', 'Sentiment Score',
    'Risk Level', 'Risk Score', 'Flagged', 'Mentor', 'Status',
    'Mentor Response Time (hours)', 'AI Summary',
];

const FLAGGED_FIELDS = [
    'Entry Date', 'Student Name', 'Roll Number', 'Department', 'Email',
    'Risk Level', 'Risk Score', 'Sentiment', 'Flagged Keywords',
    'Assigned Mentor', 'Mentor Email', 'Mentor Responded',
    'Response Time (hrs)', 'Status', 'AI Summary',
];

// Escape a CSV field value
const escapeCSV = (val) => {
    const str = val == null ? '' : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
};

// Build a header line from field names
const csvHeader = (fields) => fields.map(escapeCSV).join(',') + '\n';

// Convert a row object to a CSV line
const rowToCSV = (row, fields) =>
    fields.map(f => escapeCSV(row[f] ?? '')).join(',') + '\n';

/**
 * Stream-based Analytics CSV export.
 * Pipes a Mongoose cursor through a Transform stream → response.
 * Avoids loading all entries into memory at once.
 */
async function streamAnalyticsCSV(res, startDate, endDate) {
    const query = {};
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(csvHeader(ANALYTICS_FIELDS));

    const cursor = DiaryEntry.find(query)
        .populate('student', 'name email department batch')
        .populate('mentor', 'name email')
        .lean()
        .cursor();

    const transform = new Transform({
        objectMode: true,
        transform(entry, _enc, cb) {
            const row = {
                'Entry Date': new Date(entry.createdAt).toLocaleDateString(),
                'Student Name': entry.student?.name || 'N/A',
                'Student Email': entry.student?.email || 'N/A',
                'Department': entry.student?.department || 'N/A',
                'Batch': entry.student?.batch || 'N/A',
                'Week': entry.week,
                'Academic Year': entry.academicYear,
                'Mood (1-5)': entry.mood,
                'Sentiment': entry.aiAnalysis?.sentiment || 'N/A',
                'Sentiment Score': entry.aiAnalysis?.sentimentScore ?? 0,
                'Risk Level': entry.aiAnalysis?.riskLevel || 'N/A',
                'Risk Score': entry.aiAnalysis?.riskScore ?? 0,
                'Flagged': entry.aiAnalysis?.flagged ? 'Yes' : 'No',
                'Mentor': entry.mentor?.name || 'Unassigned',
                'Status': entry.status,
                'Mentor Response Time (hours)': entry.mentorRespondedAt
                    ? Math.round((new Date(entry.mentorRespondedAt) - new Date(entry.createdAt)) / 360000) / 10
                    : 'N/A',
                'AI Summary': entry.aiAnalysis?.summary || '',
            };
            cb(null, rowToCSV(row, ANALYTICS_FIELDS));
        },
    });

    cursor.pipe(transform).pipe(res);

    await new Promise((resolve, reject) => {
        res.on('finish', resolve);
        res.on('error', reject);
        cursor.on('error', reject);
    });
}

/**
 * Stream-based Flagged Entries CSV export.
 */
async function streamFlaggedEntriesCSV(res) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flagged-entries.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(csvHeader(FLAGGED_FIELDS));

    const cursor = DiaryEntry.find({ 'aiAnalysis.flagged': true })
        .sort({ 'aiAnalysis.riskScore': -1 })
        .populate('student', 'name email department batch rollNumber')
        .populate('mentor', 'name email')
        .lean()
        .cursor();

    const transform = new Transform({
        objectMode: true,
        transform(entry, _enc, cb) {
            const row = {
                'Entry Date': new Date(entry.createdAt).toLocaleDateString(),
                'Student Name': entry.student?.name || 'N/A',
                'Roll Number': entry.student?.rollNumber || 'N/A',
                'Department': entry.student?.department || 'N/A',
                'Email': entry.student?.email || 'N/A',
                'Risk Level': (entry.aiAnalysis?.riskLevel || 'N/A').toUpperCase(),
                'Risk Score': entry.aiAnalysis?.riskScore ?? 0,
                'Sentiment': entry.aiAnalysis?.sentiment || 'N/A',
                'Flagged Keywords': entry.aiAnalysis?.keywords?.map(k => k.word).join('; ') || '',
                'Assigned Mentor': entry.mentor?.name || 'Unassigned',
                'Mentor Email': entry.mentor?.email || 'N/A',
                'Mentor Responded': entry.mentorRespondedAt ? 'Yes' : 'No',
                'Response Time (hrs)': entry.mentorRespondedAt
                    ? Math.round((new Date(entry.mentorRespondedAt) - new Date(entry.createdAt)) / 360000) / 10
                    : 'N/A',
                'Status': entry.status,
                'AI Summary': entry.aiAnalysis?.summary || '',
            };
            cb(null, rowToCSV(row, FLAGGED_FIELDS));
        },
    });

    cursor.pipe(transform).pipe(res);

    await new Promise((resolve, reject) => {
        res.on('finish', resolve);
        res.on('error', reject);
        cursor.on('error', reject);
    });
}

module.exports = { streamAnalyticsCSV, streamFlaggedEntriesCSV };
