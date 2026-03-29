/**
 * seedAdmin.js — Creates default admin user in SQLite.
 * Usage: npm run seed:admin
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

if (process.env.NODE_ENV === 'production') {
    console.error('seedAdmin.js must NOT be run in production. Aborting.');
    process.exit(1);
}

const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { initializeSchema } = require('../database/schema');

initializeSchema(db);

const ADMIN_EMAIL    = 'admin@gcet.edu.in';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_NAME     = 'Administrator';

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
if (existing) {
    console.log(`Admin "${ADMIN_EMAIL}" already exists.`);
    process.exit(0);
}

const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
db.prepare(`INSERT INTO users (email, password_hash, name, role, is_active)
            VALUES (?, ?, ?, 'admin', 1)`).run(ADMIN_EMAIL, hash, ADMIN_NAME);

console.log('Admin user created:', ADMIN_EMAIL);
process.exit(0);
