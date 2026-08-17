import { Router } from 'express';
import db from '../db.js';
import { syncUserFestivals } from './festivalSync.js';
import * as Sentry from '@sentry/node';

const router = Router();

// GET /api/festivals — returns the user's selected/subscribed festivals via user_festivals mapping table
router.get('/', async (req, res) => {
  try {
    await syncUserFestivals(req.userId);
    const { rows } = await db.query(
      `SELECT f.* FROM festivals f
       JOIN user_festivals uf ON f.id = uf.festival_id
       WHERE uf.user_id = $1
       ORDER BY f.event_date`,
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
