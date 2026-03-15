const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

const connectDB = async (retries = MAX_RETRIES) => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting reconnect...');
            setTimeout(() => connectDB(1), RETRY_DELAY_MS);
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB error:', err.message);
        });
    } catch (error) {
        console.error(`❌ MongoDB connection error: ${error.message}`);
        if (retries > 0) {
            console.log(`🔄 Retrying in ${RETRY_DELAY_MS / 1000}s... (${retries} retries left)`);
            setTimeout(() => connectDB(retries - 1), RETRY_DELAY_MS);
        } else {
            console.error('💀 MongoDB connection failed after max retries. Exiting.');
            process.exit(1);
        }
    }
};

module.exports = connectDB;
