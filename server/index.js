import './utils/envLoader.js'; // LOAD ENV FIRST
import { initSentry, Sentry } from './utils/sentrySetup.js';
initSentry(); // must run before any other imports that might throw
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
import billingRoutes from './routes/billingRoutes.js';
import healthRoutes from './routes/health.js';
import metricsRoutes, { httpRequestsTotal, httpRequestDurationMicroseconds } from './routes/metrics.js';
import Registry from './services/registryService.js';
import { logger, stream } from './utils/winstonLogger.js';
import { initSocket } from './utils/socketService.js';
import { startCertificateWorker, stopCertificateWorker } from './queues/workers.js';
import { BlacklistedToken } from './models/index.js';
import fs from 'fs';

import { getAllowedOrigins, isProduction, sessionSecret, validateServerEnv, requireEnv } from './utils/runtimeConfig.js';
import { RATE_LIMIT_WINDOW_MS, TOKEN_CLEANUP_INTERVAL_MS } from './constants/limits.js';
import { isPinataConfigured, testPinataConnection } from './utils/ipfsService.js';
import { getBlockchainRuntimeInfo } from './utils/blockchain.js';
import { closeRedisConnection } from './config/redis.js';

// [SECURITY] BOOT-TIME PERMISSION GUARD
const bootPath = path.resolve(process.cwd(), 'write_test.tmp');
try {
  fs.writeFileSync(bootPath, 'BOOT_TEST');
  fs.unlinkSync(bootPath);
} catch (err) {
  logger.error('\n\n[ERROR] [CRITICAL] Filesystem is READ-ONLY for Node. Check your terminal perms!');
  logger.error(`Attempted write at: ${bootPath}`);
  logger.error(`Error: ${err.message}\n\n`);
  process.exit(1);
}

validateServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowedOrigins = getAllowedOrigins();

let server; // Assigned in startNode()
let worker; // BullMQ worker — assigned on server start, used in graceful shutdown

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
app.use(morgan(isProduction ? 'combined' : 'dev', { stream }));

// ─── METRICS MIDDLEWARE ───────────────────────────────
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationSeconds = duration[0] + duration[1] / 1e9;
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
    httpRequestDurationMicroseconds.observe(
      { method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode },
      durationSeconds
    );
  });
  next();
});

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
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: isProduction ? 100 : 1000,
  skip: (req) => !isProduction && (req.ip === '::1' || req.ip === '127.0.0.1'),
  message: { success: false, message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: 20,
  message: { success: false, message: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

app.use(express.json({
  limit: '50kb',
  verify: (req, _res, buf) => {
    // Stash raw body for Razorpay webhook signature verification
    if (req.path === '/api/billing/webhook') req.rawBody = buf;
  },
}));
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
app.use('/api/billing', billingRoutes);
app.use('/api/health', healthRoutes);
app.use('/metrics', metricsRoutes);

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

// ─── SENTRY ERROR HANDLER (must come before custom error handler) ─────
if (process.env.SENTRY_DSN) {
  app.use(Sentry.expressErrorHandler());
}

// ─── GLOBAL ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  logger.error(`[ERROR] [PROTOCOL_ERROR] ${err.message}${!isProduction ? `\n${err.stack}` : ''}`);

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
      logger.warn('[WARNING] [SEED]: Skipping administrative seeding - ADMIN_EMAIL or ADMIN_PASSWORD missing in .env');
      return;
    }

    const adminExists = await Registry.findOne('users', { email: adminEmail });
    if (adminExists) {
      logger.info(`[NETWORK] ROOT AUTHORITY: Node verified (${adminEmail}). Bypassing seeding cycle.`);
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
    logger.info(`[SUCCESS] ROOT AUTHORITY: Global Admin established (${adminEmail})`);
  } catch (error) {
    logger.error(' Error seeding system:', error);
  }
}

if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      // Step 1: Initialize Registry
      await Registry.init();
      logger.info(`[REGISTRY] Storage layer initialized.`);

      // 🛰️ PROACTIVE CORS AUDIT
      const allowed = getAllowedOrigins();
      logger.info(`[SECURITY] Allowed Origins: ${allowed.join(', ')}`);
      if (isProduction && allowed.some(o => o.includes('localhost'))) {
        logger.warn('[CAUTION] [SECURITY]: Production node is allowing localhost. Check CLIENT_URL in Render dashboard.');
      }

      // Step 2: Seed System Authority
      await seedSystem();

      // Step 3: Launch Node
      server = app.listen(PORT, '0.0.0.0', async () => {
        initSocket(server);
        worker = startCertificateWorker(); // Returns null gracefully if Redis unavailable
        logger.info(`\n[STARTUP] [EDUCRED NODE] Startup Complete`);
        logger.info(`[NETWORK] Network: http://localhost:${PORT}`);
        logger.info(`[STORAGE] Storage: AUTHORITATIVE (SQL)`);
        logger.info(`[LEDGER]  Ledger:  ${getBlockchainRuntimeInfo().mode === 'LIVE' ? 'SEP-LIVE' : 'OFFLINE'}`);
        logger.info(`[ASSETS]  Assets:  ${isPinataConfigured() ? 'DECENTRALIZED (PINATA)' : 'LOCAL (UPLOADS)'}`);
        logger.info(`[EMAIL]  Provider: ${process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp')}`);
        logger.info(`-------------------------------------------------\n`);

        // Purge expired blacklisted tokens every 6 hours to keep auth lookups fast
        setInterval(async () => {
          try {
            await BlacklistedToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
          } catch { /* non-fatal */ }
        }, TOKEN_CLEANUP_INTERVAL_MS);

        // Background Connectivity Check
        if (isPinataConfigured()) {
          try {
            const isIpfsReady = await testPinataConnection();
            if (isIpfsReady) {
              logger.info(`[SUCCESS] IPFS: Decentralized storage layer active.`);
            }
          } catch (ipfsError) {
            logger.warn(`[IPFS] [WARNING] Connectivity failed. Continuing without decentralized storage.`);
          }
        }
      });
    } catch (err) {
      logger.error('[STOP] CRITICAL: Node failed to initialize. Review logs.', err);
      process.exit(1);
    }
  })();
}

const shutdown = async (signal) => {
  logger.info(`\n⚠️ [DEVOPS]: ${signal} received. Initiating graceful shutdown...`);

  // 1. Stop accepting new HTTP traffic
  if (server) server.close(() => logger.info('[STOP] HTTP: Server closed.'));

  // 2. Drain in-flight queue jobs before closing worker
  await stopCertificateWorker(worker);

  // 3. Release Redis connection
  await closeRedisConnection();

  logger.info('[STOP] Shutdown complete.');
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app };
