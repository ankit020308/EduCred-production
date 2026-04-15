/**
 * ─── EduCred: System Reset & Provisioning Tool ──────────────────────────────
 *
 * Purges all dummy data from MongoDB and the filesystem.
 * Provision a fresh institutional administrator for the demo.
 *
 * Usage:
 *   node server/scripts/reset-system.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import Models
import User from '../models/User.js';
import University from '../models/University.js';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';
import Ledger from '../models/Ledger.js';
import FraudAlert from '../models/FraudAlert.js';
import Request from '../models/Request.js';
import AuditLog from '../models/AuditLog.js';
import VerificationLog from '../models/VerificationLog.js';
import UniversityGeo from '../models/UniversityGeo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/educred';
const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function resetSystem() {
  console.log('\n🧹 [SYSTEM_RESET]: Initializing global purge...');

  try {
    // 1. Database Connection
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 2. Purge Collections
    const models = [
      User, University, Certificate, Student, Ledger,
      FraudAlert, Request, AuditLog, VerificationLog, UniversityGeo
    ];

    for (const model of models) {
      const count = await model.countDocuments();
      await model.deleteMany({});
      console.log(`🗑️  Purged ${model.modelName} (${count} records removed)`);
    }

    // 3. Clear Filesystem
    if (fs.existsSync(UPLOADS_DIR)) {
      const files = fs.readdirSync(UPLOADS_DIR);
      let removedCount = 0;
      for (const file of files) {
        if (file !== '.gitkeep' && (file.endsWith('.pdf') || file.endsWith('.jpg') || file.endsWith('.png'))) {
          fs.unlinkSync(path.join(UPLOADS_DIR, file));
          removedCount++;
        }
      }
      console.log(`📂  Cleared Uploads (${removedCount} files removed)`);
    }

    // 4. Provision Fresh Admin (Institution)
    console.log('\n🔑 [PROVISIONING]: Creating Demo Authority...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@educred.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'ankit123'; // Default for demo

    const adminUser = await User.create({
      name: 'EduCred University Admin',
      email: adminEmail,
      passwordHash: adminPass, // Will be hashed by pre-save hook
      role: 'university',
      isEmailVerified: true
    });

    const university = await University.create({
      name: 'EduCred University',
      email: adminEmail,
      userId: adminUser._id,
      status: 'APPROVED',
      isVerified: true,
      address: 'EduCred Decentralized Campus v1',
      description: 'Primary institutional node for credential issuance and verification.'
    });

    adminUser.linkedUniversityId = university._id;
    await adminUser.save();

    console.log('✅ Created Demo Institution');
    console.log(`   📧 Email:    ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPass}`);

    console.log('\n────────────────────────────────────────────────────────────────');
    console.log('🎉 SYSTEM RESET COMPLETE — READY FOR DEMO');
    console.log('────────────────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (err) {
    console.error('\n💥 [ERROR]: Reset failed:');
    console.error(err.message);
    process.exit(1);
  }
}

resetSystem();
