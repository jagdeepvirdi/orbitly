import { Router } from 'express';
import db from '../db.js';
import { syncUserFestivals } from './festivalSync.js';
import * as Sentry from '@sentry/node';

const router = Router();

// GET /api/festivals — returns the user's selected/subscribed festivals via user_festivals mapping table
router.get('/', async (req, res) => {
  try {
    await syncUserFestivals(req.userId);
    // The same festival may exist under several calendars (e.g. Diwali in 'indian' and
    // 'hindu'); a user subscribed to more than one should see it once. Keep the copy they
    // pinned (so existing pins still match), else the one with a description, else lowest id.
    const { rows } = await db.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (f.name, f.event_date) f.*
         FROM festivals f
         JOIN user_festivals uf ON f.id = uf.festival_id
         LEFT JOIN user_pinned_festivals p ON p.festival_id = f.id AND p.user_id = $1
         WHERE uf.user_id = $1
         ORDER BY f.name, f.event_date,
                  (p.festival_id IS NOT NULL) DESC,
                  (COALESCE(f.description, '') <> '') DESC,
                  f.id
       ) deduped
       ORDER BY event_date, id`,
      [req.userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('[festivals] GET / error:', e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/festivals/pinned — returns all pinned festival IDs for the user
router.get('/pinned', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT festival_id FROM user_pinned_festivals WHERE user_id = $1',
      [req.userId]
    );
    res.json(rows.map(r => r.festival_id));
  } catch (e) {
    console.error('[festivals]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/festivals/pinned — pin a festival
router.post('/pinned', async (req, res) => {
  const { festivalId } = req.body;
  if (!festivalId) {
    return res.status(400).json({ error: 'festivalId required' });
  }
  try {
    await db.query(
      `INSERT INTO user_pinned_festivals (user_id, festival_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, festival_id) DO NOTHING`,
      [req.userId, festivalId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[festivals]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE /api/festivals/pinned/:festivalId — unpin a festival
router.delete('/pinned/:festivalId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM user_pinned_festivals WHERE user_id = $1 AND festival_id = $2',
      [req.userId, req.params.festivalId]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[festivals]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
