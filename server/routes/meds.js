import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/meds?date=2026-06-13  — meds with today's done state merged in
router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await db.query(
      `SELECT m.*, COALESCE(c.done, FALSE) AS done
       FROM medications m
       LEFT JOIN med_checkins c ON c.med_id = m.id AND c.checkin_date = $1
       ORDER BY m.sort_order`,
      [date]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/meds/:id/toggle?date=2026-06-13
router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO med_checkins (med_id, checkin_date, done)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (med_id, checkin_date)
       DO UPDATE SET done = NOT med_checkins.done
       RETURNING done`,
      [id, date]
    );
    res.json({ done: rows[0].done });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  const { name, dose, time, sort_order = 99, who = 'Jagdeep', doctor = '', notes = '', start_date = '', prescription_id = null } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO medications (id, name, dose, time, sort_order, who, doctor, notes, start_date, prescription_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [`m${Date.now()}`, name, dose, time, sort_order, who, doctor, notes, start_date, prescription_id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM medications WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
