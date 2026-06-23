import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM appointments WHERE user_id = $1 ORDER BY appt_date ASC NULLS LAST, created_at ASC',
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/', async (req, res) => {
  const { who, type, appt_date, doctor, location, appt_time, notes } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO appointments (who, type, appt_date, doctor, location, appt_time, notes, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [who || null, type || null, appt_date || null,
       doctor || null, location || null, appt_time || null, notes || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', async (req, res) => {
  const { who, type, appt_date, doctor, location, appt_time, notes, done } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE appointments
       SET who = $3, type = $4, appt_date = $5, doctor = $6,
           location = $7, appt_time = $8, notes = $9,
           done = COALESCE($10, done)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, who || null, type || null, appt_date || null,
       doctor || null, location || null, appt_time || null, notes || null, done ?? null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.patch('/:id', async (req, res) => {
  const { done } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE appointments SET done = $2 WHERE id = $1 AND user_id = $3 RETURNING *',
      [req.params.id, done, req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM appointments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
