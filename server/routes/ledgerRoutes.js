import express from 'express';
import Ledger from '../models/Ledger.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const events = await Ledger.find().sort({ createdAt: -1 }).limit(100);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export default router;
