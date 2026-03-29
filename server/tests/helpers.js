/**
 * Test helpers — creates an isolated in-memory SQLite DB per test suite.
 * Each call to createTestApp() returns a fresh Express app wired to :memory:.
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ensure JWT secrets are set for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_must_be_at_least_32_chars_long!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_at_least_32_chars_long!!!!!!';
process.env.NODE_ENV = 'test';

const { initializeSchema } = require('../src/database/schema');

/**
 * Create a new isolated in-memory DB, initialise schema, and return the db instance.
 * The caller is responsible for closing the DB after all tests.
 */
function createTestDB() {
    const db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
    return db;
}

/**
 * Seed a test DB with minimal data: admin, 1 mentor, 1 student.
 * Returns { adminId, mentorId, studentId } numeric IDs.
 */
function seedTestDB(db) {
    const hash = (pw) => bcrypt.hashSync(pw, 4); // low rounds for test speed

    // Admin
    db.prepare(`
        INSERT INTO users (email, password_hash, name, role, is_active)
        VALUES ('admin@gcet.edu.in', ?, 'Admin', 'admin', 1)
    `).run(hash('Admin@123'));
    const adminId = db.prepare("SELECT id FROM users WHERE email = 'admin@gcet.edu.in'").get().id;

    // Mentor
    db.prepare(`
        INSERT INTO users (email, password_hash, name, role, department, is_active)
        VALUES ('mentor1@gcet.edu.in', ?, 'Dr. Ramesh', 'mentor', 'CSE', 1)
    `).run(hash('Mentor@123'));
    const mentorId = db.prepare("SELECT id FROM users WHERE email = 'mentor1@gcet.edu.in'").get().id;

    // Student
    db.prepare(`
        INSERT INTO users (email, password_hash, name, role, department, section, roll_number,
                           batch, current_semester, mentor_id, is_active)
        VALUES ('cse.a1@gcet.edu.in', ?, 'Student CSE-A1', 'student', 'CSE', 'A', 1,
                '2023-2027', 4, ?, 1)
    `).run(hash('Student@123'), mentorId);
    const studentId = db.prepare("SELECT id FROM users WHERE email = 'cse.a1@gcet.edu.in'").get().id;

    // Attendance row for student
    db.prepare(`
        INSERT INTO attendance (department, section, roll_number, week_number, academic_year, semester, cumulative_pct, weekly_pct)
        VALUES ('CSE', 'A', 1, 10, '2024-25', 4, 82.5, 80.0)
    `).run();

    return { adminId, mentorId, studentId };
}

/**
 * Generate a signed JWT for a user ID (for use in test requests).
 */
function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Monkey-patch the singleton db module to use our test DB instance.
 * Returns a restore function to un-patch after tests.
 */
function patchDB(testDB) {
    const dbModule = require('../src/database/db');
    // Overwrite module exports in place (the require cache holds a reference)
    const original = Object.assign({}, dbModule);
    // better-sqlite3 Database is a class instance; we copy all methods/properties
    Object.setPrototypeOf(dbModule, Object.getPrototypeOf(testDB));
    Object.assign(dbModule, testDB);
    return () => {
        Object.setPrototypeOf(dbModule, Object.getPrototypeOf(original));
        Object.assign(dbModule, original);
    };
}

module.exports = { createTestDB, seedTestDB, signToken, patchDB };
