import express from 'express';
import {
    optimize,
    generateFeature,
    audit,
    generateTests,
    applyPatch
} from '../ai-agent/agentController.js';

import { getSupportedModes } from '../ai-agent/promptEngine.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';
// import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

/**
 * EduCred AI Agent Routes (Optimized)
 *
 * Principles:
 * - Thin routing layer (no business logic)
 * - Centralized controller handling
 * - Strict human-in-the-loop flow
 * - Secure by default
 *
 * Base: /api/ai
 /

// ─────────────────────────────────────────────
// 🔒 GLOBAL SECURITY
// ─────────────────────────────────────────────

router.use(protect);
router.use(requireRole('admin', 'super_admin'));

// ─────────────────────────────────────────────
// 🧠 CORE AI ROUTES (AUTO-MAPPED)
// ─────────────────────────────────────────────

/*
 * Centralized route mapping → avoids repetition
 * Easier to scale when adding new modes
 */
const ROUTES = {
    '/optimize': optimize,
    '/generate-feature': generateFeature,
    '/audit': audit,
    '/generate-tests': generateTests,
    '/apply-patch': applyPatch,
};

// Register routes dynamically
Object.entries(ROUTES).forEach(([path, handler]) => {
    router.post(path, handler);
});

// ─────────────────────────────────────────────
// 🩺 META ROUTES
// ─────────────────────────────────────────────

// Dynamically fetch supported modes from prompt engine
router.get('/modes', (req, res) => {
    res.json({
        modes: getSupportedModes(),
    });
});

// Health check (useful for monitoring / debugging)
router.get('/health', (req, res) => {
    res.json({
        status: 'AI Agent active',
        version: '1.0',
        safe: true,
        humanInLoop: true,
        timestamp: new Date().toISOString(),
    });
});

// ─────────────────────────────────────────────
// 🚫 FALLBACK HANDLER (INVALID ROUTES)
// ─────────────────────────────────────────────

router.use((req, res) => {
    res.status(404).json({
        error: 'Invalid AI route',
        availableEndpoints: [
            'POST /optimize',
            'POST /generate-feature',
            'POST /audit',
            'POST /generate-tests',
            'POST /apply-patch',
            'GET /modes',
            'GET /health'
        ],
    });
});

export default router;