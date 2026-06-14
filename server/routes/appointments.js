import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM appointments ORDER BY created_at');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { who, type, appt_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (id, who, type, appt_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [`a${Date.now()}`, who, type, appt_date]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { done } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE appointments SET done = $2 WHERE id = $1 RETURNING *',
      [req.params.id, done]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM appointments WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
