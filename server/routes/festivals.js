import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/festivals — returns all global default festivals as a flat array
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM festivals
       WHERE user_id = ''
       ORDER BY event_date`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
