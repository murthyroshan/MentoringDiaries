const db = require('../database/db');
const { initializeSchema } = require('../database/schema');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const connectDB = () => {
    initializeSchema(db);
    logger.info('SQLite schema initialized');

    // Auto-seed if empty. The seed creates demo accounts with well-known
    // passwords (published in the repo), so it must NOT run automatically on a
    // fresh production database — that would ship a live admin@... / Admin@123
    // login. In production, seeding requires an explicit SEED_ON_EMPTY=true opt-in.
    const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
    const seedAllowed = process.env.NODE_ENV !== 'production' || process.env.SEED_ON_EMPTY === 'true';
    if (userCount === 0 && seedAllowed) {
        try {
            logger.info('No users found — running seed...');
            require('../database/seed');
        } catch (err) {
            logger.warn({ error: err.message }, 'Seed failed (non-fatal)');
        }
    } else if (userCount === 0) {
        logger.warn('No users found and auto-seed disabled in production. Set SEED_ON_EMPTY=true or provision an admin manually.');
    }

    return Promise.resolve();
};

module.exports = connectDB;
