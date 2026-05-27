import express from 'express';
import client from 'prom-client';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Initialize default metrics collection (CPU, Memory, Event Loop Lag, etc.)
client.collectDefaultMetrics({ prefix: 'educred_' });

// Example custom metrics
export const httpRequestsTotal = new client.Counter({
  name: 'educred_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'educred_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const activeConnectionsGauge = new client.Gauge({
  name: 'educred_active_connections',
  help: 'Number of active Socket.io connections',
});

// Expose the metrics endpoint — restricted to admins only
router.get('/', protect, requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

export default router;
