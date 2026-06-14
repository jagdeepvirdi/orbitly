import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [{ rows: festivals }, { rows: sikh }] = await Promise.all([
      db.query('SELECT * FROM festivals ORDER BY event_date'),
      db.query('SELECT * FROM sikh_events ORDER BY event_date'),
    ]);
    res.json({ festivals, sikh_events: sikh });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, event_date, cat, emoji, action, reminder = false } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO festivals (name, event_date, cat, emoji, action, reminder)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, event_date, cat, emoji, action, reminder]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM festivals WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
