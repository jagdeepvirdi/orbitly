import { Router } from 'express';
import db from '../db.js';

const router = Router();

const CATALOG = [
  { "id": "f1", "name": "Formula 1", "emoji": "🏎️", "leagues": [] },
  { "id": "cricket", "name": "Cricket", "emoji": "🏏", "leagues": [
      { "id": "ipl", "name": "IPL" }, { "id": "icc-test", "name": "ICC Tests" },
      { "id": "icc-odi", "name": "ICC ODIs" }, { "id": "icc-t20wc", "name": "T20 World Cup" }
    ]
  },
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

const DEFAULT_SPORTS_SUBS = [
  { sport: 'f1', leagues: [] },
  { sport: 'cricket', leagues: ['ipl'] },
  { sport: 'football', leagues: ['PL', 'CL'] }
];

router.get('/subscriptions', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT sport_id, leagues FROM user_sport_subscriptions WHERE user_id = $1 ORDER BY added_at ASC',
      [req.userId]
    );
    if (rows.length === 0) {
      return res.json({ subscriptions: DEFAULT_SPORTS_SUBS });
    }
    res.json({
      subscriptions: rows.map(r => ({
        sport: r.sport_id,
        leagues: typeof r.leagues === 'string' ? JSON.parse(r.leagues) : r.leagues
      }))
    });
  } catch (e) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/subscriptions', async (req, res) => {
  const { sport, leagues } = req.body;
  if (!sport) {
    return res.status(400).json({ error: 'sport is required' });
  }
  const leaguesJson = JSON.stringify(leagues || []);
  try {
    await db.query(
      `INSERT INTO user_sport_subscriptions (user_id, sport_id, leagues)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, sport_id) DO UPDATE SET leagues = $3`,
      [req.userId, sport, leaguesJson]
    );
    res.json({ ok: true });
  } catch (e) {
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
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
