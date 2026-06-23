import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT gender, share_cycle_tracker FROM user_profiles WHERE user_id = $1`,
      [req.userId]
    );
    if (!rows.length) {
      return res.json({ gender: 'prefer-not-to-say', share_cycle_tracker: false });
    }
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/', async (req, res) => {
  const { gender, share_cycle_tracker } = req.body;
  const valid = ['male', 'female', 'other', 'prefer-not-to-say'];
  const safeGender = valid.includes(gender) ? gender : 'prefer-not-to-say';
  try {
    const { rows } = await db.query(
      `INSERT INTO user_profiles (user_id, gender, share_cycle_tracker)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         gender = EXCLUDED.gender,
         share_cycle_tracker = EXCLUDED.share_cycle_tracker
       RETURNING gender, share_cycle_tracker`,
      [req.userId, safeGender, share_cycle_tracker ?? false]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
