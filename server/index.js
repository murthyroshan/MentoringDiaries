require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/socket');
const logger = require('./src/utils/logger');

// Fail fast — weak or missing secrets make the entire auth system worthless.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    logger.error('JWT_SECRET must be set and at least 32 characters long. Exiting.');
    process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
    logger.error('JWT_REFRESH_SECRET must be set and at least 32 characters long. Exiting.');
    process.exit(1);
}

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

// Connect to DB first; only start accepting traffic once the connection is ready.
connectDB()
    .then(() => {
        server.listen(PORT, () => {
            logger.info({
                port: PORT,
                env: process.env.NODE_ENV || 'development',
            }, 'Mentoring Diaries server started');
        });
    })
    .catch((err) => {
        logger.error({ error: err.message }, 'Failed to connect to DB — server not started');
        process.exit(1);
    });

module.exports = app;
