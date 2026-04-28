import './utils/envLoader.js'; // LOAD ENV FIRST
import express from 'express';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';

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
import supportRoutes from './routes/supportRoutes.js';
import healthRoutes from './routes/health.js';
import Registry from './services/registryService.js';
import { initSocket } from './utils/socketService.js';
import { BlacklistedToken } from './models/index.js';
import fs from 'fs';

import { getAllowedOrigins, isProduction, sessionSecret, validateServerEnv, requireEnv } from './utils/runtimeConfig.js';
import { isPinataConfigured, testPinataConnection } from './utils/ipfsService.js';
import { getBlockchainRuntimeInfo } from './utils/blockchain.js';

// [SECURITY] BOOT-TIME PERMISSION GUARD
const bootPath = path.resolve(process.cwd(), 'write_test.tmp');
try {
  fs.writeFileSync(bootPath, 'BOOT_TEST');
  fs.unlinkSync(bootPath);
} catch (err) {
  console.error('\n\n[ERROR] [CRITICAL] Filesystem is READ-ONLY for Node. Check your terminal perms!');
  console.error(`Attempted write at: ${bootPath}`);
  console.error(`Error: ${err.message}\n\n`);
  process.exit(1);
}

validateServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = getAllowedOrigins();
// WebSockets (socket.io) disabled for architectural stability.


// Asynchronous background workers (BullMQ) disabled for architectural stability.


const PORT = process.env.PORT || 5001;

// ─── CLOUD PROXY CONFIGURATION ────────────────────────
app.set('trust proxy', 1);

// ─── Security & Performance Middleware ────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // unsafe-inline only needed in dev for Vite HMR; production build uses external JS files only
      scriptSrc: [
        "'self'",
        ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
        "https://accounts.google.com",
      ],
      frameSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://*.pinata.cloud", "https://gateway.pinata.cloud", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: [
        "'self'",
        ...allowedOrigins,
        ...(isProduction ? [] : ["http://localhost:5001", "http://127.0.0.1:8545"]),
        "https://accounts.google.com",
        "https://*.pinata.cloud",
        "https://gateway.pinata.cloud",
      ],
    },
  },
}));
app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));

// ─── STRICT CORS PROTOCOL ────────────────────────────
const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable preflight for all routes

// ─── CSRF ORIGIN VALIDATION ───────────────────────────
// Browsers always send the Origin header on cross-site requests. If Origin
// is present but not in our allowlist, reject the request — this blocks
// CSRF attacks that exploit sameSite:none cookies in production.
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      return res.status(403).json({ error: 'CSRF validation failed.' });
    }
  }
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  skip: (req) => !isProduction && (req.ip === '::1' || req.ip === '127.0.0.1'),
  message: { success: false, message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());

// JWT strictly used for authentication.


if (!isProduction) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ─── Routes ───────────────────────────────────────────
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes); // Apply strict auth limits

app.use('/api/certificates', certificateRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/user', userRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/health', healthRoutes);
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'EduCred Protocol Node: Online',
    timestamp: new Date().toISOString(),
    documentation: 'https://github.com/ankit020308/EduCred-production'
  });
});

// ─── Health check legacy handler removed - replaced by healthRoutes ───

// ─── Catch-All 404 ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] [PROTOCOL_ERROR] ${err.message}${!isProduction ? `\n${err.stack}` : ''}`);

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
      console.warn('[WARNING] [SEED]: Skipping administrative seeding - ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
      return;
    }

    const adminExists = await Registry.findOne('users', { email: adminEmail });
    if (adminExists) {
      console.log(`[NETWORK] ROOT AUTHORITY: Node verified (${adminEmail}). Bypassing seeding cycle.`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);

    await Registry.insert('users', {
      name: 'System Controller',
      email: adminEmail,
      passwordHash: hash,
      role: 'super_admin',
      isSuperAdmin: true,
      isEmailVerified: true
    });
    console.log(`[SUCCESS] ROOT AUTHORITY: Global Admin established (${adminEmail})`);
  } catch (error) {
    console.error(' Error seeding system:', error);
  }
}


let server;

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      // Step 1: Initialize Registry
      await Registry.init();
      console.log(`[REGISTRY] Storage layer initialized.`);

      // 🛰️ PROACTIVE CORS AUDIT
      const allowed = getAllowedOrigins();
      console.log(`[SECURITY] Allowed Origins: ${allowed.join(', ')}`);
      if (isProduction && allowed.some(o => o.includes('localhost'))) {
        console.warn('[CAUTION] [SECURITY]: Production node is allowing localhost. Check CLIENT_URL in Render dashboard.');
      }

      // Step 2: Seed System Authority
      await seedSystem();

      // Step 3: Launch Node
      server = app.listen(PORT, '0.0.0.0', async () => {
        initSocket(server);
        console.log(`\n[STARTUP] [EDUCRED NODE] Startup Complete`);
        console.log(`[NETWORK] Network: http://localhost:${PORT}`);
        console.log(`[STORAGE] Storage: AUTHORITATIVE (SQL)`);
        console.log(`[LEDGER]  Ledger:  ${getBlockchainRuntimeInfo().mode === 'LIVE' ? 'SEP-LIVE' : 'OFFLINE'}`);
        console.log(`[ASSETS]  Assets:  ${isPinataConfigured() ? 'DECENTRALIZED (PINATA)' : 'LOCAL (UPLOADS)'}`);
        console.log(`-------------------------------------------------\n`);

        // Purge expired blacklisted tokens every 6 hours to keep auth lookups fast
        setInterval(async () => {
          try {
            await BlacklistedToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
          } catch { /* non-fatal */ }
        }, 6 * 60 * 60 * 1000);

        // Background Connectivity Check
        if (isPinataConfigured()) {
          try {
            const isIpfsReady = await testPinataConnection();
            if (isIpfsReady) {
              console.log(`[SUCCESS] IPFS: Decentralized storage layer active.`);
            }
          } catch (ipfsError) {
            console.warn(`[IPFS] [WARNING] Connectivity failed. Continuing without decentralized storage.`);
          }
        }
      });
    } catch (err) {
      console.error('[STOP] CRITICAL: Node failed to initialize. Review logs.', err);
      process.exit(1);
    }
  })();
}

const shutdown = (signal) => {
  console.log(`\n⚠️ [DEVOPS]: ${signal} received. Initiating graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('[STOP] HTTP: Server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
