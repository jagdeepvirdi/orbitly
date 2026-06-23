import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/festivals — returns all global + user-specific festivals as a flat array
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM festivals
       WHERE user_id = $1 OR user_id = ''
       ORDER BY event_date`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/festivals — add a custom user festival
router.post('/', async (req, res) => {
  const { name, event_date, cat, emoji, action, reminder, calendar = 'custom', description } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO festivals (name, event_date, cat, emoji, action, reminder, calendar, description, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, event_date, cat, emoji, action || null, reminder || null, calendar, description || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE /api/festivals/:id — only user's own custom festivals
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM festivals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found or not yours' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
