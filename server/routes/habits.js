import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await db.query(
      `SELECT h.*, COALESCE(c.done, FALSE) AS done
       FROM habits h
       LEFT JOIN habit_checkins c ON c.habit_id = h.id AND c.checkin_date = $1
       WHERE h.user_id = $2 AND h.deleted_at IS NULL
       ORDER BY h.sort_order`,
      [date, req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO habit_checkins (habit_id, checkin_date, done, user_id)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT (habit_id, checkin_date)
       DO UPDATE SET done = NOT habit_checkins.done
       RETURNING done`,
      [id, date, req.userId]
    );
    res.json({ done: rows[0].done });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { label, icon = '⭐', sort_order = 99 } = req.body;
  if (!label?.trim()) return res.status(400).json({ error: 'label required' });
  const id = 'h_' + Date.now();
  try {
    const { rows } = await db.query(
      `INSERT INTO habits (id, label, icon, sort_order, user_id, is_default)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [id, label.trim(), icon, sort_order, req.userId]
    );
    res.status(201).json({ ...rows[0], done: false });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', async (req, res) => {
  const { label, icon } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE habits SET
         label = COALESCE($3, label),
         icon  = COALESCE($4, icon)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, label?.trim() || null, icon || null]
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
      `UPDATE habits SET deleted_at = NOW()
       WHERE id = $1 AND user_id = $2 AND (is_default IS NULL OR is_default = false)`,
      [req.params.id, req.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found or protected' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
