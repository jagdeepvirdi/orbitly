import { Router } from 'express';
import { getCache, setCache, clearCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();
const MATCH_TTL = 60 * 60 * 1000;       // 1 hour
const STANDINGS_TTL = 3 * 60 * 60 * 1000; // 3 hours

const COMP_NAMES = {
  PL: 'Premier League', PD: 'La Liga', CL: 'UEFA Champions League',
  WC: 'FIFA World Cup', EC: 'UEFA Euros', SA: 'Serie A',
  BL1: 'Bundesliga', FL1: 'Ligue 1',
};

function mapStatus(s) {
  if (['IN_PLAY', 'LIVE', 'PAUSED'].includes(s)) return 'live';
  if (['FINISHED'].includes(s)) return 'done';
  return 'upcoming';
}

function fmtScore(score) {
  if (!score?.fullTime) return null;
  const h = score.fullTime.home;
  const a = score.fullTime.away;
  if (h === null && a === null) return null;
  return `${h ?? '-'} : ${a ?? '-'}`;
}

async function fetchComp(comp, apiKey, daysAhead = 30) {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
  const r = await fetch(
    `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${from}&dateTo=${to}`,
    { headers: { 'X-Auth-Token': apiKey } }
  );
  if (!r.ok) return [];
  const json = await r.json();
  return (json.matches || []).map(m => ({
    id: m.id,
    competition: COMP_NAMES[comp] || comp,
    compCode: comp,
    stage: m.stage?.replace(/_/g, ' ') || '',
    matchday: m.matchday,
    homeTeam: m.homeTeam.shortName || m.homeTeam.name,
    awayTeam: m.awayTeam.shortName || m.awayTeam.name,
    date: m.utcDate,
    status: mapStatus(m.status),
    score: fmtScore(m.score),
  }));
}

router.get('/matches', async (req, res) => {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) {
    return res.json({ placeholder: true, error: 'FOOTBALL_DATA_KEY not set in .env', data: [] });
  }

  const competitions = (req.query.competitions || 'WC,PL,PD,CL,EC').split(',');
  const key = `football-matches-${competitions.join('-')}`;
  const cached = getCache(key);
  if (cached) return res.json({ data: cached });

  try {
    const all = [];
    for (const comp of competitions) {
      // Small delay between requests to stay within 10 req/min limit
      if (all.length > 0) await new Promise(r => setTimeout(r, 300));
      const matches = await fetchComp(comp, apiKey);
      all.push(...matches);
    }
    all.sort((a, b) => new Date(a.date) - new Date(b.date));
    setCache(key, all, MATCH_TTL);
    res.json({ data: all });
  } catch (e) {
    console.error('[football]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/standings/:comp', async (req, res) => {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) return res.json({ placeholder: true, error: 'FOOTBALL_DATA_KEY not set in .env' });

  const { comp } = req.params;
  const key = `football-standings-${comp}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(
      `https://api.football-data.org/v4/competitions/${comp}/standings`,
      { headers: { 'X-Auth-Token': apiKey } }
    );
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error' });
    const json = await r.json();
    const table = json.standings?.[0]?.table || [];
    const data = table.slice(0, 10).map(e => ({
      pos: e.position,
      team: e.team.shortName || e.team.name,
      crestUrl: e.team.crest,
      played: e.playedGames,
      won: e.won,
      draw: e.draw,
      lost: e.lost,
      gd: e.goalDifference,
      pts: e.points,
    }));
    setCache(key, data, STANDINGS_TTL);
    res.json(data);
  } catch (e) {
    console.error('[football]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/refresh', (req, res) => {
  clearCache('football-matches');
  res.json({ ok: true });
});

export default router;
