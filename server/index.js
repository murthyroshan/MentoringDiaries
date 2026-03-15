require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const { initSocket } = require('./src/socket');
const logger = require('./src/utils/logger');

const server = http.createServer(app);

initSocket(server);
connectDB();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.info({
        port: PORT,
        env: process.env.NODE_ENV || 'development',
    }, 'Mentoring Diaries server started');
});

module.exports = app;
