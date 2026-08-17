import { Router } from 'express';
import db from '../db.js';
import { syncUserFestivals } from './festivalSync.js';
import * as Sentry from '@sentry/node';

const router = Router();

const DEFAULT_SUBSCRIPTIONS = ['IN', 'TH', 'hindu', 'sikh'];

router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT calendar_id FROM user_calendars WHERE user_id = $1 AND enabled = true',
      [req.userId]
    );
    if (rows.length === 0) {
      return res.json({ calendars: DEFAULT_SUBSCRIPTIONS });
    }
    res.json({ calendars: rows.map(r => r.calendar_id) });
  } catch (e) {
    console.error('[calendarSubscriptions]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/subscriptions', async (req, res) => {
  const { calendarId, enabled } = req.body;
  if (!calendarId || typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'calendarId and enabled required' });
  }
  try {
    await db.query(
      `INSERT INTO user_calendars (user_id, calendar_id, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, calendar_id) DO UPDATE SET enabled = $3`,
      [req.userId, calendarId, enabled]
    );
    
    // Sync mapped festivals immediately
    await syncUserFestivals(req.userId);
    
    res.json({ ok: true });
  } catch (e) {
    console.error('[subscriptions] POST error:', e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.get('/proxy-ics', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'url parameter required' });
  }
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch feed: HTTP ${response.status}` });
    }
    const text = await response.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      return res.status(400).json({ error: 'Invalid calendar feed: missing BEGIN:VCALENDAR' });
    }
    res.json({ text });
  } catch (e) {
    console.error('[calendarSubscriptions]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message || 'Failed to fetch calendar feed' });
  }
});

export default router;
