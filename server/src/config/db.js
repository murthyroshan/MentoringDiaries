const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

/**
 * Connect to MongoDB with exponential-style retry.
 * Returns a Promise that resolves once the first successful connection is made,
 * or rejects (and exits the process) after MAX_RETRIES failures.
 */
const connectDB = () =>
    new Promise((resolve, reject) => {
        let retries = MAX_RETRIES;

        const attempt = async () => {
            try {
                const conn = await mongoose.connect(process.env.MONGO_URI);
                logger.info({ host: conn.connection.host }, 'MongoDB connected');

                mongoose.connection.on('disconnected', () => {
                    logger.warn('MongoDB disconnected — attempting reconnect');
                    setTimeout(() => attempt(), RETRY_DELAY_MS);
                });

                mongoose.connection.on('error', (err) => {
                    logger.error({ error: err.message }, 'MongoDB runtime error');
                });

                resolve();
            } catch (error) {
                logger.error({ error: error.message, retriesLeft: retries - 1 }, 'MongoDB connection failed');
                if (retries-- > 0) {
                    logger.info({ retryInMs: RETRY_DELAY_MS }, 'Retrying DB connection');
                    setTimeout(attempt, RETRY_DELAY_MS);
                } else {
                    logger.error('MongoDB max retries exceeded — exiting');
                    process.exit(1);
                }
            }
        };

        attempt();
    });

module.exports = connectDB;
