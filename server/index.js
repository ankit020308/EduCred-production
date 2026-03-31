import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

import certificateRoutes from './routes/certificateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import userRoutes from './routes/userRoutes.js';

import Certificate from './models/Certificate.js';
import User from './models/User.js';
import University from './models/University.js';

import { generateHash, getDeterministicJSON } from './utils/hashing.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Middleware ───────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// ─── OPTIONAL: Seed (ONLY FOR TESTING, NOT PRODUCTION) ──
app.get('/api/dev/seed-certificates', async (req, res) => {
  try {
    const student = await User.findOne({ email: 'student@educred.com' });
    const admin = await User.findOne({ email: 'admin@educred.com' });

    if (!student || !admin) {
      return res.status(400).json({ error: 'Create student + admin first' });
    }

    await Certificate.deleteMany({});

    const certData = {
      studentName: student.name,
      regNo: 'REAL001',
      universityName: 'EduCred University',
      degreeName: 'B.Tech',
      graduationYear: 2024,
      branch: 'Computer Science',
      cgpa: 8.7,
      semesters: [],
      branding: { color: '#3B82F6' }
    };

    const certificateHash = generateHash(certData);
    const hashPayload = getDeterministicJSON(certData);

    const cert = await Certificate.create({
      ...certData,
      hashPayload,
      certificateHash,
      status: 'MINED',
      issuedBy: admin._id,
      studentId: student._id, // ✅ REAL LINK
      transactionHash: '0x' + crypto.randomBytes(32).toString('hex'),
    });

    res.json({ message: 'Real certificate created', cert });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/user', userRoutes);

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Online',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// ─── DB Connection ────────────────────────────────────
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (uri && uri.startsWith('mongodb+srv')) {
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB Atlas');
  } else if (uri && uri.startsWith('mongodb://localhost')) {
    try {
      await mongoose.connect(uri);
      console.log('✅ Connected to Local MongoDB');
    } catch {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri());
      console.log('✅ Using In-Memory MongoDB');
    }
  } else {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    console.log('✅ Using In-Memory MongoDB');
  }
}

// ─── Seed Admin (ONLY ON FIRST RUN) ───────────────────
async function seedUser() {
  const exists = await User.findOne({ email: 'admin@educred.com' });

  if (!exists) {
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@educred.com',
      passwordHash: 'admin123',
      role: 'university',
      universityName: 'EduCred University'
    });

    await University.create({
      name: 'EduCred University',
      email: admin.email,
      userId: admin._id
    });

    console.log('✅ Admin created');
  }
}

// ─── Root ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 EduCred Backend Running');
});

// ─── Start Server ─────────────────────────────────────
connectDB()
  .then(async () => {
    await seedUser();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });