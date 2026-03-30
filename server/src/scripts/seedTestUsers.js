/**
 * seedTestUsers.js — Adds test mentor and admin accounts.
 * Usage: node src/scripts/seedTestUsers.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { initializeSchema } = require('../database/schema');

initializeSchema(db);

const TEST_USERS = [
  { email: 'testmentor@gmail.com', name: 'Test Mentor', role: 'mentor', department: 'CSE' },
  { email: 'testadmin@gmail.com',  name: 'Test Admin',  role: 'admin',  department: null },
];

const PASSWORD_HASH = bcrypt.hashSync('12345678', 12);

const insert = db.prepare(`
  INSERT INTO users (email, password_hash, name, role, department, is_active)
  VALUES (@email, @password_hash, @name, @role, @department, 1)
`);

for (const u of TEST_USERS) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (existing) {
    console.log(`⚠  Already exists: ${u.email} (id ${existing.id}) — skipped`);
    continue;
  }
  insert.run({ ...u, password_hash: PASSWORD_HASH });
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  console.log(`✓  Created ${u.role}: ${u.email}  (id ${row.id})`);
}

process.exit(0);
