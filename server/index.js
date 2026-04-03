import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Enterprise Packages ──────────────────────────────
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// ─── Local Imports ────────────────────────────────────
import certificateRoutes from './routes/certificateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import systemRoutes from './routes/systemRoutes.js'; // Added your new system routes
import connectDB from './config/db.js';

import User from './models/User.js';
import University from './models/University.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// ─── CLOUD PROXY CONFIGURATION ────────────────────────
// Trust the first proxy (Render, AWS, Vercel load balancers).
// Prevents rate-limiting false-positives across the fleet.
app.set('trust proxy', 1);

// ─── Security & Performance Middleware ────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "http://localhost:5001", "https://accounts.google.com"],
    },
  },
}));
app.use(compression()); // Compress response bodies for speed
app.use(morgan('dev')); // HTTP request logging

// ─── STRICT CORS PROTOCOL ────────────────────────────
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

// API Rate Limiting to prevent abuse/DDoS
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files locally

// ─── Routes ───────────────────────────────────────────
app.use('/api', apiLimiter); // Apply rate limiter to all /api routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/user', userRoutes);
app.use('/api/system', systemRoutes); // Mount system stats endpoint

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Online',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime()
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // LOG: Internal monitoring (do not expose to client)
  console.error(`[❌ PROTOCOL_ERROR] ${err.message}${!isProd ? `\n${err.stack}` : ''}`);

  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// ─── Static Frontend Serving (Production) ─────────────
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// ─── SPA Fallback (MUST BE LAST ROUTE) ────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Seed Data (System Authorization) ────────────────
async function seedSystem() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@educred.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminExists = await User.findOne({ email: adminEmail });
    if (adminExists) {
      console.log(`📡 ROOT AUTHORITY: Node verified (${adminEmail}). Bypassing seeding cycle.`);
      return;
    }

    // Provision new administrative node
    await User.create({
      name: 'System Controller',
      email: adminEmail,
      passwordHash: adminPassword, // Let pre-save hook hash it
      role: 'admin'
    });
    console.log(`✅ ROOT AUTHORITY: Global Admin established (${adminEmail})`);
  } catch (error) {
    console.error('❌ Error seeding system:', error);
  }
}

// ─── Server Startup & Graceful Shutdown ───────────────
let server;

connectDB()
  .then(async () => {
    await seedSystem();
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 EduCred Node Active`);
      console.log(`📡 Local:   http://localhost:${PORT}`);
      console.log(`🌐 Network: http://0.0.0.0:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

// Graceful Shutdown Protocol
const shutdown = (signal) => {
  console.log(`\n⚠️ [DEVOPS]: ${signal} received. Initiating graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('🛑 HTTP: Server closed.');
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.close();
          console.log('🗄️ DATA: Ledger connection safely severed.');
        }
        process.exit(0);
      } catch (err) {
        console.error('❌ Shutdown Conflict:', err);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));