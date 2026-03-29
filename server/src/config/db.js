const db = require('../database/db');
const { initializeSchema } = require('../database/schema');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

const connectDB = () => {
    initializeSchema(db);
    logger.info('SQLite schema initialized');

    // Auto-seed if empty
    const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
    if (userCount === 0) {
        try {
            logger.info('No users found — running seed...');
            require('../database/seed');
        } catch (err) {
            logger.warn({ error: err.message }, 'Seed failed (non-fatal)');
        }
    }

    return Promise.resolve();
};

module.exports = connectDB;
