import express from 'express';
import University from '../models/University.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const universities = await University.find({}, 'name _id');
    res.json(universities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch universities' });
  }
});

export default router;
