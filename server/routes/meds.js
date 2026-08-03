import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await db.query(
      `SELECT m.*, COALESCE(c.done, FALSE) AS done
       FROM medications m
       LEFT JOIN med_checkins c ON c.med_id = m.id AND c.checkin_date = $1
       WHERE m.user_id = $2
       ORDER BY m.sort_order`,
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
      `INSERT INTO med_checkins (med_id, checkin_date, done, user_id)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT (med_id, checkin_date)
       DO UPDATE SET done = NOT med_checkins.done
       RETURNING done`,
      [id, date, req.userId]
    );
    res.json({ done: rows[0].done });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const FOOD_TIMINGS = ['before_food', 'after_food', 'with_food'];
function normDays(days_of_week) {
  return Array.isArray(days_of_week) && days_of_week.length ? days_of_week : [0, 1, 2, 3, 4, 5, 6];
}
function normFoodTiming(food_timing) {
  return FOOD_TIMINGS.includes(food_timing) ? food_timing : null;
}

router.post('/', async (req, res) => {
  const { name, dose, time, sort_order = 99, who = null, doctor = null, notes = null, start_date = null, end_date = null, prescription_id = null, days_of_week = null, food_timing = null } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO medications (name, dose, time, sort_order, who, doctor, notes, start_date, end_date, prescription_id, days_of_week, food_timing, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, dose || null, time || null, sort_order, who || null, doctor || null, notes || null,
       start_date || null, end_date || null, prescription_id, normDays(days_of_week), normFoodTiming(food_timing), req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, dose, time, who, doctor, notes, start_date, end_date, prescription_id, days_of_week, food_timing } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE medications
       SET name = $3, dose = $4, time = $5, who = $6, doctor = $7,
           notes = $8, start_date = $9, end_date = $10, prescription_id = $11,
           days_of_week = $12, food_timing = $13
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.userId, name, dose || null, time || null, who || null,
       doctor || null, notes || null, start_date || null, end_date || null, prescription_id || null,
       normDays(days_of_week), normFoodTiming(food_timing)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM medications WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
