import express from 'express';
import Registry from '../services/registryService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const events = Registry.find('ledger').slice(-100).reverse();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export default router;
