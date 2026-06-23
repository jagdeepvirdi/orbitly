import { Router } from 'express';
import { getCache, setCache, clearCache } from '../cache.js';

const router = Router();
const H = 3600 * 1000;

// Seed games for NBA (Boston Celtics vs Dallas Mavericks - NBA Finals 2026)
const NBA_SEED_DATA = [
  { id: 'nba1', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 1', teams: 'Celtics vs Mavericks', date: '2026-06-18T20:00:00Z', status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' },
  { id: 'nba2', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 2', teams: 'Celtics vs Mavericks', date: '2026-06-21T20:00:00Z', status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' },
  { id: 'nba3', match: 'Boston Celtics vs Dallas Mavericks', stage: 'NBA Finals - Game 3', teams: 'Celtics vs Mavericks', date: '2026-06-24T20:00:00Z', status: 'upcoming', homeTeam: 'Boston Celtics', awayTeam: 'Dallas Mavericks', score: '' }
];

router.get('/games', async (req, res) => {
  const cacheKey = 'nba-games-cache';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    // If no API key is set, return seed data
    return res.json({ data: NBA_SEED_DATA, live: false });
  }

  try {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.now() + i * 24 * 3600 * 1000);
      dates.push(d.toISOString().slice(0, 10));
    }

    const queryParams = dates.map(date => `dates[]=${date}`).join('&');
    const url = `https://api.balldontlie.io/v1/games?per_page=50&${queryParams}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }

    const json = await response.json();
    const games = (json.data || []).map(g => {
      const isDone = g.status?.toLowerCase().includes('final');
      const isLive = g.status?.toLowerCase().includes('qtr') || g.status?.toLowerCase().includes('half');
      return {
        id: g.id,
        match: `${g.home_team.full_name} vs ${g.visitor_team.full_name}`,
        homeTeam: g.home_team.full_name,
        awayTeam: g.visitor_team.full_name,
        date: g.date,
        status: isDone ? 'done' : (isLive ? 'live' : 'upcoming'),
        score: g.home_team_score || g.visitor_team_score ? `${g.home_team_score} - ${g.visitor_team_score}` : '',
        stage: g.season ? `Season ${g.season}` : ''
      };
    });

    // If API returned no games, fall back to seed data to ensure the UI is not empty
    const result = games.length > 0 ? games : NBA_SEED_DATA;
    setCache(cacheKey, { data: result, live: true }, H);
    res.json({ data: result, live: true });
  } catch (e) {
    console.warn('[nba-api] Failed fetching NBA games:', e.message);
    // Silent fallback to seed data
    res.json({ data: NBA_SEED_DATA, live: false });
  }
});

router.post('/refresh', (req, res) => {
  clearCache('nba-games-cache');
  res.json({ ok: true });
});

export default router;
