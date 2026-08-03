import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Returns every logged (course_id, log_date, seconds) row for the user — the
// frontend aggregates today's vs lifetime totals per course from this.
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT course_id, log_date, seconds FROM course_time_logs WHERE user_id = $1`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Adds `seconds` to today's running total for a course (upsert). Called
// periodically while a timer/stopwatch is running, so at most a few seconds
// of an in-progress session are ever at risk of being lost.
router.post('/increment', async (req, res) => {
  const { course_id, seconds } = req.body;
  const delta = Math.round(Number(seconds));
  if (!course_id || !Number.isFinite(delta) || delta <= 0) {
    return res.status(400).json({ error: 'course_id and a positive seconds value are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO course_time_logs (course_id, user_id, log_date, seconds)
       VALUES ($1, $2, CURRENT_DATE, $3)
       ON CONFLICT (course_id, user_id, log_date)
       DO UPDATE SET seconds = course_time_logs.seconds + EXCLUDED.seconds
       RETURNING course_id, log_date, seconds`,
      [course_id, req.userId, delta]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
