import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import certificateRoutes from './routes/certificateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectDB from './config/db.js';

import User from './models/User.js';
import University from './models/University.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// ─── Middleware ───────────────────────────────────────
app.use(helmet()); // Secure HTTP headers

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ─── Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/user', userRoutes);

/**
 * ─── EduCred: Issuance Flow (Section 2.6) ───
 */

// ─── Static Frontend Serving (Production) ─────────────
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Online',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});


// ─── Seed Data (System Authorization) ────────────────
async function seedSystem() {
  // 1. Seed Global Admin from Environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@educred.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const adminExists = await User.findOne({ 
    role: { $in: ['admin', 'super_admin', 'verifier'] } 
  });

  if (!adminExists) {
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      existingUser.role = 'admin';
      existingUser.passwordHash = adminPassword; // Reset to bootstrap password
      await existingUser.save();
      console.log(`✅ ROOT AUTHORITY: Existing account promoted to Global Admin (${adminEmail})`);
    } else {
      await User.create({
        name: 'System Controller',
        email: adminEmail,
        passwordHash: adminPassword,
        role: 'admin'
      });
      console.log(`✅ ROOT AUTHORITY: Global Admin established (${adminEmail})`);
    }
  }
}

// ─── Root ─────────────────────────────────────────────
// ─── SPA Fallback (MUST BE LAST) ──────────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Start Server ─────────────────────────────────────
connectDB()
  .then(async () => {
    await seedSystem();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 EduCred Node: http://localhost:${PORT}`);
      console.log(`🌐 Network Access: http://0.0.0.0:${PORT}`);
    });
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });