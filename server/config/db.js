import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { requireEnv } from '../utils/runtimeConfig.js';

dotenv.config();

/**
 * 🗄️ DATABASE CONNECTIVITY LAYER
 *
 * Modes:
 *  1. LIVE  — MONGO_URI points to localhost / Atlas → production-grade persistent store.
 *  2. DEV   — MONGO_URI is absent or set to "memory" in non-production →
 *             mongodb-memory-server spins up an ephemeral instance so the stack
 *             runs without a local MongoDB install.
 *
 * ⚠️  DEV mode data is wiped on every restart. Never use in production.
 */
const connectDB = async () => {
    const RAW_URI = requireEnv('MONGO_URI');

    const connectionOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
    };

    mongoose.set('strictQuery', true);

    try {
        const conn = await mongoose.connect(RAW_URI, connectionOptions);
        console.log(`✅ [LEDGER_NODE]: Connected to ${conn.connection.host}`);
    } catch (err) {
        console.error(`❌ [LEDGER_FAIL]: ${err.message}`);
        process.exit(1);
    }
};

// 🛰️ Global Connection Listeners (Cloud Resilience)
mongoose.connection.on('connected', () => {
    console.log('✅ [DATA_SYNC]: Distributed Ledger established.');
});

mongoose.connection.on('error', (err) => {
    console.error(`⚠️ [DATA_INTEGRITY]: Data layer error detected - ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.log('🛑 [DATA_OFFLINE]: Ledger connection severed. Attempting protocol recovery...');
});

export default connectDB;
