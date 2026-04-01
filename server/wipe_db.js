import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import University from './models/University.js';
import Student from './models/Student.js';
import Certificate from './models/Certificate.js';

dotenv.config();

/**
 * 🧹 PROTOCOL WIPE: Total Data Reset
 * This script clears all primary data collections to ensure a clean slate.
 */
const wipeDatabase = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/educred';

    try {
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB for Protocol Reset');

        const collections = ['users', 'universities', 'students', 'certificates'];
        
        for (const colName of collections) {
            const collection = mongoose.connection.collections[colName];
            if (collection) {
                await collection.drop();
                console.log(`🗑️  Dropped Collection: ${colName}`);
            } else {
                console.warn(`⚠️  Collection not found: ${colName}`);
            }
        }

        console.log('✨ PROTOCOL RESET COMPLETE: The Data Node is now clean.');
        process.exit(0);

    } catch (err) {
        console.error('❌ RESET FAILED: Invalid Protocol Command');
        console.error(err.message);
        process.exit(1);
    }
};

wipeDatabase();
