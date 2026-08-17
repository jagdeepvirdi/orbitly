import { Router } from 'express';
import db from '../db.js';
import * as Sentry from '@sentry/node';

const router = Router();
const DEFAULT_CURRENCIES = ['INR', 'THB', 'USD'];

function safeCurrencies(prefs) {
  return Array.isArray(prefs?.currencies) && prefs.currencies.length ? prefs.currencies : DEFAULT_CURRENCIES;
}

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT gender, share_cycle_tracker, prefs FROM user_profiles WHERE user_id = $1`,
      [req.userId]
    );
    if (!rows.length) {
      return res.json({ gender: 'prefer-not-to-say', share_cycle_tracker: false, currencies: DEFAULT_CURRENCIES });
    }
    const { gender, share_cycle_tracker, prefs } = rows[0];
    res.json({ gender, share_cycle_tracker, currencies: safeCurrencies(prefs) });
  } catch (e) {
    console.error('[profile]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.put('/', async (req, res) => {
  const { gender, share_cycle_tracker, currencies } = req.body;
  const valid = ['male', 'female', 'other', 'prefer-not-to-say'];
  const safeGender = valid.includes(gender) ? gender : 'prefer-not-to-say';
  const cleanedCurrencies = Array.isArray(currencies) && currencies.length
    ? [...new Set(currencies.filter(c => typeof c === 'string' && /^[A-Za-z]{3}$/.test(c)).map(c => c.toUpperCase()))].slice(0, 10)
    : null;
  const prefsPatch = cleanedCurrencies && cleanedCurrencies.length ? { currencies: cleanedCurrencies } : {};
  try {
    const { rows } = await db.query(
      `INSERT INTO user_profiles (user_id, gender, share_cycle_tracker, prefs)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET
         gender = EXCLUDED.gender,
         share_cycle_tracker = EXCLUDED.share_cycle_tracker,
         prefs = user_profiles.prefs || EXCLUDED.prefs
       RETURNING gender, share_cycle_tracker, prefs`,
      [req.userId, safeGender, share_cycle_tracker ?? false, JSON.stringify(prefsPatch)]
    );
    const row = rows[0];
    res.json({ gender: row.gender, share_cycle_tracker: row.share_cycle_tracker, currencies: safeCurrencies(row.prefs) });
  } catch (e) {
    console.error('[profile]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
