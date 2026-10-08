import { Router } from 'express';
import { getCache, setCache, clearCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();
// football-data.org free plan: 10 requests/min. Matches are cached per competition, so users
// following different league mixes share the same upstream calls.
const MATCH_TTL = 15 * 60 * 1000;
const STALE_TTL = 24 * 60 * 60 * 1000;    // served if the API errors or rate-limits us
const STANDINGS_TTL = 3 * 60 * 60 * 1000; // 3 hours
const DAYS_BACK = 7;                      // recent results
const DAYS_AHEAD = 30;                    // upcoming fixtures
const REFRESH_COOLDOWN = 2 * 60 * 1000;

let lastFetchAt = 0;

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

async function fetchComp(comp, apiKey) {
  const from = new Date(Date.now() - DAYS_BACK * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + DAYS_AHEAD * 86400000).toISOString().slice(0, 10);
  lastFetchAt = Date.now();
  const r = await fetch(
    `https://api.football-data.org/v4/competitions/${comp}/matches?dateFrom=${from}&dateTo=${to}`,
    { headers: { 'X-Auth-Token': apiKey } }
  );
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`football-data ${comp} HTTP ${r.status} ${body.slice(0, 200)}`);
  }
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

  // Only known competition codes reach the upstream URL.
  const competitions = [...new Set((req.query.competitions || 'WC,PL,PD,CL,EC').split(','))]
    .filter(c => COMP_NAMES[c]);
  if (competitions.length === 0) return res.json({ data: [] });

  const all = [];
  const failed = [];
  let fetched = 0;
  for (const comp of competitions) {
    const cached = getCache(`football-matches-${comp}`);
    if (cached) { all.push(...cached); continue; }
    try {
      // Small delay between upstream requests to stay within the 10 req/min limit
      if (fetched++ > 0) await new Promise(r => setTimeout(r, 300));
      const matches = await fetchComp(comp, apiKey);
      setCache(`football-matches-${comp}`, matches, MATCH_TTL);
      setCache(`football-stale-${comp}`, matches, STALE_TTL); // not prefixed 'football-matches': refresh must not clear it
      all.push(...matches);
    } catch (e) {
      console.error('[football]', e.message);
      Sentry.captureException(e);
      failed.push(comp);
      const stale = getCache(`football-stale-${comp}`);
      if (stale) all.push(...stale);
    }
  }

  if (failed.length === competitions.length && all.length === 0) {
    return res.status(502).json({ error: 'football-data.org request failed' });
  }
  all.sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ data: all, ...(failed.length && { failed }) });
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
  if (Date.now() - lastFetchAt < REFRESH_COOLDOWN) {
    return res.json({ ok: true, throttled: true });
  }
  clearCache('football-matches');
  res.json({ ok: true });
});

export default router;
