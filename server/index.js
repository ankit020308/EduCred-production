import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

import certificateRoutes from './routes/certificateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import userRoutes from './routes/userRoutes.js';

import User from './models/User.js';
import University from './models/University.js';

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

// ─── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
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

// ─── Seed Data (ONLY ON FIRST RUN) ───────────────────
async function seedSystem() {
  // 1. Seed Global Admin
  const adminExists = await User.findOne({ email: 'admin@educred.com' });
  if (!adminExists) {
    const admin = await User.create({
      name: 'System Controller',
      email: 'admin@educred.com',
      passwordHash: 'admin123',
      role: 'admin'
    });
    console.log('✅ Global Admin created (admin@educred.com / admin123)');
  }

  // 2. Seed Default University (Approved for Demo)
  const uniUserExists = await User.findOne({ email: 'university@educred.com' });
  if (!uniUserExists) {
    const uniUser = await User.create({
      name: 'EduCred Institute Admin',
      email: 'university@educred.com',
      passwordHash: 'uni123',
      role: 'university',
      universityName: 'EduCred Institute of Technology'
    });

    await University.create({
      name: 'EduCred Institute of Technology',
      email: uniUser.email,
      userId: uniUser._id,
      status: 'APPROVED',
      isVerified: true
    });
    console.log('✅ Demo University created (university@educred.com / uni123)');
  }
}

// ─── Root ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 Anti-Gravity Backend Running');
});

// ─── Start Server ─────────────────────────────────────
connectDB()
  .then(async () => {
    await seedSystem();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });