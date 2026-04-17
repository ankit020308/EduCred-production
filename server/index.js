import './utils/envLoader.js'; // 🛡️ LOAD ENV FIRST
import express from 'express';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Enterprise Packages ──────────────────────────────
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// ─── Local Imports ────────────────────────────────────
import certificateRoutes from './routes/certificateRoutes.js';
import authRoutes from './routes/authRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import userRoutes from './routes/userRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import systemRoutes from './routes/systemRoutes.js'; 
import adminRoutes from './routes/adminRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import ledgerRoutes from './routes/ledgerRoutes.js';
import Registry from './services/registryService.js';
import aiRoutes from './routes/aiRoutes.js';
import passport from 'passport';
import { configurePassport } from './config/passport.js';
import session from 'express-session';

import { getAllowedOrigins, isProduction, sessionSecret, validateServerEnv, requireEnv } from './utils/runtimeConfig.js';
import { isPinataConfigured, testPinataConnection } from './utils/ipfsService.js';
import { getBlockchainRuntimeInfo } from './utils/blockchain.js';

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
app.use(compression()); 
app.use(morgan('dev')); 

// ─── STRICT CORS PROTOCOL ────────────────────────────
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // Elevated for dev
  skip: (req) => !isProduction || req.ip === '::1' || req.ip === '127.0.0.1', 
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use('/api', apiLimiter); 
app.use('/auth', authRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/user', userRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/system', systemRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/ai', aiRoutes);

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'EduCred Protocol Node: Online',
    timestamp: new Date().toISOString(),
    documentation: 'https://github.com/ankit020308/EduCred-production'
  });
});

// ─── Health Check ─────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const bcInfo = getBlockchainRuntimeInfo();
  
  res.status(200).json({
    status: 'Online',
    timestamp: new Date().toISOString(),
    registry: 'Operational (SQL-Hybrid)',
    blockchain: bcInfo.mode,
    ipfs: isPinataConfigured() ? 'Connected (Pinata)' : 'Fallback (Local)',
    uptime: `${(process.uptime() / 60).toFixed(2)}m`,
    env: isProduction ? 'production' : 'development'
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[❌ PROTOCOL_ERROR] ${err.message}${!isProduction ? `\n${err.stack}` : ''}`);

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  });
});



// ─── Seed Data (System Authorization) ────────────────
async function seedSystem() {
  try {
    const shouldSeedAdmin = process.env.SEED_DEFAULT_ADMIN === 'true';
    if (!shouldSeedAdmin) return;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.warn('⚠️ [SEED]: Skipping administrative seeding - ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
      return;
    }

    const adminExists = await Registry.findOne('users', { email: adminEmail });
    if (adminExists) {
      console.log(`📡 ROOT AUTHORITY: Node verified (${adminEmail}). Bypassing seeding cycle.`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);
    const bcInfo = getBlockchainRuntimeInfo();

    await Registry.insert('users', {
      name: 'System Controller',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
      isEmailVerified: true,
      walletAddress: bcInfo.contractAddress ? process.env.PRIVATE_KEY_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' : null 
    });
    console.log(`✅ ROOT AUTHORITY: Global Admin established (${adminEmail})`);
  } catch (error) {
    console.error('❌ Error seeding system:', error);
  }
}

// ─── Server Startup Protocol ─────────────────────────
let server;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
      try {
          // Step 1: Initialize Registry
          await Registry.init();
          console.log(`[REGISTRY] Storage layer initialized.`);
          
          // Step 2: Seed System Authority
          await seedSystem();
  
          // Step 3: Launch Node
          server = httpServer.listen(PORT, '0.0.0.0', async () => {
            console.log(`[BACKEND] Server running on port ${PORT}`);
            console.log(`[BACKEND] EduCred Node Active [HYBRID-SQL]`);
  
            // Check blockchain contract state
            try {
              const bcInfo = getBlockchainRuntimeInfo();
              if (bcInfo.contractAddress) {
                console.log(`[BLOCKCHAIN] Connected to contract at ${bcInfo.contractAddress}`);
              } else {
                console.log(`[BLOCKCHAIN] Warning: No active contract address found. Run deployment script.`);
              }
            } catch (bcError) {
              console.warn(`[BLOCKCHAIN] ⚠️ External ledger unreachable: ${bcError.message}`);
              console.info(`[BLOCKCHAIN] 🚀 Falling back to SIMULATION MODE (Mock Provider).`);
            }
  
            if (isPinataConfigured()) {
              try {
                const isIpfsReady = await testPinataConnection();
                if (isIpfsReady) {
                  console.log(`✅ IPFS: Decentralized storage layer active.`);
                }
              } catch (ipfsError) {
                console.warn(`[IPFS] ⚠️ Connectivity failed. Continuing without decentralized storage.`);
              }
            }
          });
      } catch (err) {
          console.error('🛑 CRITICAL: Node failed to initialize. Review logs.', err);
          // Only exit on fatal internal errors, but allow Simulation Mode to proceed
          if (!Registry.isSimulation) process.exit(1); 
      }
  })();
}

const shutdown = (signal) => {
  console.log(`\n⚠️ [DEVOPS]: ${signal} received. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('🛑 HTTP: Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
