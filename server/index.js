import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
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
import studentRoutes from './routes/studentRoutes.js';
import systemRoutes from './routes/systemRoutes.js'; // Added your new system routes
import adminRoutes from './routes/adminRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import connectDB from './config/db.js';
import passport from 'passport';
import { configurePassport } from './config/passport.js';
import session from 'express-session';

import User from './models/User.js';
import University from './models/University.js';
import { getAllowedOrigins, isProduction, sessionSecret, validateServerEnv, requireEnv } from './utils/runtimeConfig.js';
import { isPinataConfigured, testPinataConnection } from './utils/ipfsService.js';

dotenv.config();
validateServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const allowedOrigins = getAllowedOrigins();
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});
app.set('io', io); // make io accessible in controllers via req.app.get('io')

io.on('connection', (socket) => {
  if (!isProduction) console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join_institutional_room', (universityId) => {
    socket.join(`university_${universityId}`);
  });

  socket.on('leave_institutional_room', (universityId) => {
    socket.leave(`university_${universityId}`);
  });

  socket.on('join_user_room', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('leave_user_room', (userId) => {
    socket.leave(`user_${userId}`);
  });

  socket.on('join_admin_room', () => {
    socket.join('admin_room');
  });

  socket.on('leave_admin_room', () => {
    socket.leave('admin_room');
  });

  socket.on('disconnect', () => {
    if (!isProduction) console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

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
      scriptSrc: ["'self'", "'unsafe-inline'", ...(isProduction ? [] : ["'unsafe-eval'"]), "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", ...allowedOrigins, "http://localhost:5001", "http://127.0.0.1:8545", "https://accounts.google.com"],
    },
  },
}));
app.use(compression()); // Compress response bodies for speed
app.use(morgan('dev')); // HTTP request logging

// ─── STRICT CORS PROTOCOL ────────────────────────────
const corsOptions = {
  origin: allowedOrigins,
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

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

if (!isProduction) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ─── Routes ───────────────────────────────────────────
app.use('/api', apiLimiter); // Apply rate limiter to all /api routes
app.use('/auth', authRoutes); // OAuth top-level callback support
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/user', userRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/system', systemRoutes); // Mount system stats endpoint
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/ledger', ledgerRoutes);

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', async (req, res) => {
  res.status(200).json({
    status: 'Online',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    ipfs: isPinataConfigured() ? 'Configured' : 'Unconfigured',
    uptime: process.uptime()
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  // LOG: Internal monitoring (do not expose to client)
  console.error(`[❌ PROTOCOL_ERROR] ${err.message}${!isProduction ? `\n${err.stack}` : ''}`);

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});

// ─── Static Frontend Serving (Production) ─────────────
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// ─── API 404 (Must be before SPA fallback) ──────────
app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ─── SPA Fallback (MUST BE LAST ROUTE) ────────────────
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ─── Seed Data (System Authorization) ────────────────
async function seedSystem() {
  try {
    const adminEmail = requireEnv('ADMIN_EMAIL');
    const adminPassword = requireEnv('ADMIN_PASSWORD');
    const shouldSeedAdmin = process.env.SEED_DEFAULT_ADMIN === 'true';

    if (!shouldSeedAdmin) {
      return;
    }

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
      role: 'admin',
      isEmailVerified: true
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
    server = httpServer.listen(PORT, '0.0.0.0', async () => {
      console.log(`\n🚀 EduCred Node Active`);
      console.log(`📡 Local:   http://localhost:${PORT}`);
      console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
      console.log(`⚡ Socket.io enabled`);

      // ─── IPFS Connectivity Diagnostic ───
      if (isPinataConfigured()) {
        console.log(`📦 IPFS: Detected Pinata configuration. Testing connectivity...`);
        const isIpfsReady = await testPinataConnection();
        if (isIpfsReady) {
          console.log(`✅ IPFS: Decentralized storage layer active.\n`);
        } else {
          console.log(`⚠️ IPFS: Configuration detected but authentication failed.\n`);
        }
      } else {
        console.log(`💡 IPFS: Service not configured. Using local storage fallback.\n`);
      }
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
