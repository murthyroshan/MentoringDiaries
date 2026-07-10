const db = require('../database/db');

const escapeCSV = (val) => {
    let str = val == null ? '' : String(val);
    // Neutralise spreadsheet formula injection: a field beginning with =, +, -, @,
    // or a control char is executed as a formula by Excel/Sheets. Prefix with a
    // single quote so it is rendered as literal text.
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
};

const csvHeader = (fields) => fields.map(escapeCSV).join(',') + '\n';
const rowToCSV  = (row, fields) => fields.map(f => escapeCSV(row[f] ?? '')).join(',') + '\n';

const ANALYTICS_FIELDS = [
    'Entry Date', 'Student Name', 'Student Email', 'Department', 'Section', 'Roll Number',
    'Week', 'Academic Year', 'Mood (1-5)', 'Sentiment',
    'Risk Level', 'Risk Score', 'Flagged', 'Status', 'AI Summary',
];

const FLAGGED_FIELDS = [
    'Entry Date', 'Student Name', 'Roll Number', 'Department', 'Email',
    'Risk Level', 'Risk Score', 'Sentiment', 'Status', 'AI Summary',
];

async function streamAnalyticsCSV(res, startDate, endDate) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(csvHeader(ANALYTICS_FIELDS));

    let sql = `
        SELECT de.*, u.name as student_name, u.email as student_email,
               u.department, u.section, u.roll_number, u.batch
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        WHERE 1=1
    `;
    const params = [];
    if (startDate) { sql += ' AND de.created_at >= ?'; params.push(startDate); }
    if (endDate)   { sql += ' AND de.created_at <= ?'; params.push(endDate); }

    const entries = db.prepare(sql).all(...params);
    for (const entry of entries) {
        res.write(rowToCSV({
            'Entry Date':     new Date(entry.created_at).toLocaleDateString(),
            'Student Name':   entry.student_name  || 'N/A',
            'Student Email':  entry.student_email || 'N/A',
            'Department':     entry.department    || 'N/A',
            'Section':        entry.section       || 'N/A',
            'Roll Number':    entry.roll_number   || 'N/A',
            'Week':           entry.week_number,
            'Academic Year':  entry.academic_year,
            'Mood (1-5)':     entry.mood,
            'Sentiment':      entry.ai_sentiment  || 'N/A',
            'Risk Level':     entry.ai_risk_level || 'N/A',
            'Risk Score':     entry.ai_risk_score ?? 0,
            'Flagged':        entry.is_flagged ? 'Yes' : 'No',
            'Status':         entry.status,
            'AI Summary':     entry.ai_summary    || '',
        }, ANALYTICS_FIELDS));
    }
    res.end();
}

async function streamFlaggedEntriesCSV(res) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="flagged-entries.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.write(csvHeader(FLAGGED_FIELDS));

    const entries = db.prepare(`
        SELECT de.*, u.name as student_name, u.email as student_email,
               u.department, u.roll_number
        FROM diary_entries de
        JOIN users u ON u.id = de.student_id
        WHERE de.is_flagged = 1
        ORDER BY de.ai_risk_score DESC
    `).all();

    for (const entry of entries) {
        res.write(rowToCSV({
            'Entry Date':   new Date(entry.created_at).toLocaleDateString(),
            'Student Name': entry.student_name  || 'N/A',
            'Roll Number':  entry.roll_number   || 'N/A',
            'Department':   entry.department    || 'N/A',
            'Email':        entry.student_email || 'N/A',
            'Risk Level':   (entry.ai_risk_level || 'N/A').toUpperCase(),
            'Risk Score':   entry.ai_risk_score ?? 0,
            'Sentiment':    entry.ai_sentiment  || 'N/A',
            'Status':       entry.status,
            'AI Summary':   entry.ai_summary    || '',
        }, FLAGGED_FIELDS));
    }
    res.end();
}

module.exports = { streamAnalyticsCSV, streamFlaggedEntriesCSV };
