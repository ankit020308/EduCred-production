import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import University from '../models/University.js';
import Certificate from '../models/Certificate.js';
import Student from '../models/Student.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/educred';

async function runSeed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clean DB
    await User.deleteMany({});
    await University.deleteMany({});
    await Certificate.deleteMany({});
    await Student.deleteMany({});
    console.log('Cleared DB');

    // Demo Admin (Institution) — plain password, pre-save hook hashes it
    const adminUser = await User.create({
      name: 'EduCred University Admin',
      email: 'admin@educred.com',
      passwordHash: '123456',
      role: 'university',
      isEmailVerified: true
    });

    const university = await University.create({
      name: 'EduCred University',
      email: 'admin@educred.com',
      userId: adminUser._id,
      status: 'APPROVED',
      isVerified: true
    });

    adminUser.linkedUniversityId = university._id;
    await adminUser.save();

    console.log('Created Demo Institution (admin@educred.com:123456)');

    // System Admin — plain password, pre-save hook hashes it
    await User.create({
      name: 'System Administrator',
      email: 'sysadmin@educred.com',
      passwordHash: '123456',
      role: 'admin',
      isEmailVerified: true
    });
    console.log('Created System Admin (sysadmin@educred.com:123456)');

    // Demo Student — plain password, pre-save hook hashes it
    const studentUser = await User.create({
      name: 'John Doe',
      email: 'student@educred.com',
      passwordHash: '123456',
      role: 'student',
      isEmailVerified: true
    });

    // Create Student profile record
    const studentRecord = await Student.create({ name: 'John Doe', userId: studentUser._id });

    // Demo certificates
    const studentsData = [
      { name: 'John Doe', email: 'student@educred.com', phone: '9876543210', course: 'Computer Science', studentId: studentRecord._id },
      { name: 'Isha Patel', email: 'isha@example.com', phone: '9876543211', course: 'Information Technology' },
      { name: 'Rohan Gupta', email: 'rohan@example.com', phone: '9876543212', course: 'Mechanical Engineering' },
      { name: 'Ananya Iyer', email: 'ananya@example.com', phone: '9876543213', course: 'Electronics' },
      { name: 'Vikram Singh', email: 'vikram@example.com', phone: '9876543214', course: 'Civil Engineering' }
    ];

    for (let i = 0; i < studentsData.length; i++) {
      const s = studentsData[i];
      const year = new Date().getFullYear();
      const seq = 10001 + i;
      const certData = {
        certificateId: `EDUCRED-${year}-CS-${seq}`,
        studentName: s.name,
        studentEmail: s.email,
        studentPhone: s.phone,
        studentId: s.studentId || undefined,
        course: s.course,
        issuer: university.name,
        fileUrl: `/uploads/demo_cert_${i}.pdf`,
        status: 'CONFIRMED',
        workflowStatus: 'ISSUED',
        issuedBy: adminUser._id,
        universityId: university._id,
        blockchainTxHash: '0x' + crypto.randomBytes(32).toString('hex')
      };

      const certString = JSON.stringify({ studentEmail: s.email, course: s.course, seq });
      const certificateHash = crypto.createHash('sha256').update(certString).digest('hex');
      
      await Certificate.create({
        ...certData,
        certificateHash
      });
      console.log(`Seeded Certificate for: ${s.name}`);
    }

    console.log('✅ Seeding Successfully Completed!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

runSeed();
