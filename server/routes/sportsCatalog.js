import { Router } from 'express';
import db from '../db.js';
import * as Sentry from '@sentry/node';

const router = Router();

const CATALOG = [
  { "id": "f1", "name": "Formula 1", "emoji": "🏎️", "leagues": [] },
  // Cricket has no league filter: the feed shows every match and users narrow it by team.
  { "id": "cricket", "name": "Cricket", "emoji": "🏏", "leagues": [] },
  { "id": "football", "name": "Football / Soccer", "emoji": "⚽", "leagues": [
      { "id": "PL", "name": "Premier League" }, { "id": "PD", "name": "La Liga" },
      { "id": "CL", "name": "Champions League" }, { "id": "WC", "name": "FIFA World Cup" },
      { "id": "SA", "name": "Serie A" }, { "id": "BL1", "name": "Bundesliga" },
      { "id": "FL1", "name": "Ligue 1" }, { "id": "EC", "name": "European Championship" }
    ]
  },
  { "id": "nba", "name": "Basketball (NBA)", "emoji": "🏀", "leagues": [
      { "id": "nba", "name": "NBA" }
    ]
  },
  { "id": "tennis", "name": "Tennis", "emoji": "🎾", "leagues": [
      { "id": "atp", "name": "ATP Tour" }, { "id": "wta", "name": "WTA Tour" },
      { "id": "wimbledon", "name": "Wimbledon" }, { "id": "us-open", "name": "US Open" },
      { "id": "french-open", "name": "Roland Garros" }, { "id": "aus-open", "name": "Australian Open" }
    ]
  },
  { "id": "badminton", "name": "Badminton (BWF)", "emoji": "🏸", "leagues": [
      { "id": "bwf-world-tour", "name": "BWF World Tour" }
    ]
  }
];

router.get('/catalog', (req, res) => {
  res.json(CATALOG);
});

// Which live data sources are configured on this server (no upstream calls).
router.get('/status', (req, res) => {
  res.json({
    cricket: !!process.env.CRICAPI_KEY,
    football: !!process.env.FOOTBALL_DATA_KEY,
  });
});

const parseJson = v => (typeof v === 'string' ? JSON.parse(v) : v);

// New users start with no sports; they pick their own in Manage Sports.
router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT sport_id, leagues, teams FROM user_sport_subscriptions WHERE user_id = $1 ORDER BY added_at ASC',
      [req.userId]
    );
    res.json({
      subscriptions: rows.map(r => ({
        sport: r.sport_id,
        leagues: parseJson(r.leagues),
        teams: parseJson(r.teams) || [],
      }))
    });
  } catch (e) {
    console.error('[sportsCatalog]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/subscriptions', async (req, res) => {
  const { sport, leagues, teams } = req.body;
  if (!sport) {
    return res.status(400).json({ error: 'sport is required' });
  }
  if (teams !== undefined && (!Array.isArray(teams) || teams.length > 100 || teams.some(t => typeof t !== 'string' || t.length > 100))) {
    return res.status(400).json({ error: 'teams must be an array of up to 100 short strings' });
  }
  const leaguesJson = JSON.stringify(leagues || []);
  // teams omitted -> keep what is stored (league toggles must not wipe followed teams)
  const teamsJson = teams === undefined ? null : JSON.stringify(teams);
  try {
    await db.query(
      `INSERT INTO user_sport_subscriptions (user_id, sport_id, leagues, teams)
       VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb))
       ON CONFLICT (user_id, sport_id) DO UPDATE
         SET leagues = $3,
             teams   = COALESCE($4::jsonb, user_sport_subscriptions.teams)`,
      [req.userId, sport, leaguesJson, teamsJson]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[sportsCatalog]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.delete('/subscriptions/:sport', async (req, res) => {
  const { sport } = req.params;
  try {
    await db.query(
      'DELETE FROM user_sport_subscriptions WHERE user_id = $1 AND sport_id = $2',
      [req.userId, sport]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[sportsCatalog]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
