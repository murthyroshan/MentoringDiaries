const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath;
if (process.env.DB_PATH === ':memory:') {
    dbPath = ':memory:';
} else if (process.env.DB_PATH) {
    dbPath = path.resolve(process.env.DB_PATH);
} else {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    dbPath = path.join(dataDir, 'mentoring.db');
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
