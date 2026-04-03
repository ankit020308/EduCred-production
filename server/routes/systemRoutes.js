import express from 'express';
import { getSystemStats, getNetworkMap, getTickerData } from '../controllers/systemController.js';

const router = express.Router();

/**
 * @desc Get global system statistics
 * @route GET /stats
 */
router.get('/stats', getSystemStats);

/**
 * @desc Get real-time Network Map (Institutional Nodes)
 * @route GET /map
 */
router.get('/map', getNetworkMap);

/**
 * @desc Get real-time Protocol Event Ticker
 * @route GET /ticker
 */
router.get('/ticker', getTickerData);

export default router;