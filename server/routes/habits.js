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
       ORDER BY h.sort_order`,
      [date]
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
      `INSERT INTO habit_checkins (habit_id, checkin_date, done)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (habit_id, checkin_date)
       DO UPDATE SET done = NOT habit_checkins.done
       RETURNING done`,
      [id, date]
    );
    res.json({ done: rows[0].done });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
