import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🗄️ PRODUCTION DATA LAYER: MongoDB Atlas Connectivity
 * Engineered for high-concurrency certificate registry operations.
 * Enforces strict URI requirements and connection pooling.
 */
const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI;

    if (!MONGO_URI) {
        console.error("❌ [FATAL]: MONGO_URI environment variable is missing. Node initialization aborted.");
        process.exit(1);
    }

    const connectionOptions = {
        maxPoolSize: 10,             // Efficient connection pooling for distributed queries
        serverSelectionTimeoutMS: 5000, // Fail fast if Atlas is unreachable
        socketTimeoutMS: 45000,      // Pre-emptively close hanging sockets
        family: 4                    // Use IPv4 if available
    };

    mongoose.set('strictQuery', true);

    try {
        const conn = await mongoose.connect(MONGO_URI, connectionOptions);
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
