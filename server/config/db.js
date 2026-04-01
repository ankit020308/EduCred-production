import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Establishment of the primary Data Layer.
 * Connects to MongoDB Atlas, local MongoDB, or falls back to an In-Memory instance.
 */
const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    try {
        if (uri && uri.startsWith('mongodb+srv')) {
            // Production: Atlas Connection
            await mongoose.connect(uri);
            console.log('✅ PROTOCOL: Connected to Distributed Data Mesh (MongoDB Atlas)');
        } else if (uri && uri.startsWith('mongodb://localhost')) {
            // Development: Local Node
            try {
                await mongoose.connect(uri);
                console.log('✅ PROTOCOL: Connected to Local Data Node');
            } catch (err) {
                console.warn('⚠️ LOCAL NODE OFFLINE: Initiating In-Memory Fallback...');
                await startMemoryServer();
            }
        } else {
            // Fallback: In-Memory (Episodic Storage)
            await startMemoryServer();
        }
    } catch (err) {
        console.error('❌ PROTOCOL ERROR: Data Layer Failed to Initialize');
        console.error(err.message);
        process.exit(1);
    }
};

/**
 * Local In-Memory Fallback Logic
 */
async function startMemoryServer() {
    try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const memoryUri = mongod.getUri();
        await mongoose.connect(memoryUri);
        console.log('✅ PROTOCOL: Connected to Episodic In-Memory Node (Testing Mode)');
    } catch (err) {
        console.error('❌ CRITICAL: Memory Server Logic Unavailable');
        throw err;
    }
}

export default connectDB;
