/**
 * seedAdmin.js — Development-only script to create a default admin user.
 *
 * Usage:
 *   cd server
 *   npm run seed:admin
 *
 * Safe guard: exits immediately if NODE_ENV is "production".
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// ── Safety guard ────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
    console.error('❌  seedAdmin.js must NOT be run in production. Aborting.');
    process.exit(1);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── Admin credentials (development only) ────────────────────────────────────
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Administrator';

async function seed() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('❌  MONGO_URI is not set in your .env file.');
        process.exit(1);
    }

    console.log('🔌  Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅  Connected.');

    // Inline minimal User schema so the script is self-contained.
    // We require the real model to get the exact schema + bcrypt pre-save hook.
    const User = require('../models/User');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        console.log(`ℹ️   Admin user "${ADMIN_EMAIL}" already exists. Nothing to do.`);
        await mongoose.disconnect();
        process.exit(0);
    }

    // Hash password manually (bypassing pre-save hook to avoid double-hashing
    // risk if the model hook is already active — here we save via .save() so
    // the hook WILL run; we set the raw password and let the hook hash it).
    const admin = new User({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // pre-save hook in User.js will bcrypt this
        role: 'admin',
        isActive: true,
    });

    await admin.save();

    console.log('✅  Admin user created successfully!');
    console.log('   Email   :', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Role    : admin');
    console.log('');
    console.log('🚀  You can now log in at http://localhost:5173/login');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
});
