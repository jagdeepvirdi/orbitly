import { Router } from 'express';
import { getCache, setCache, clearCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();

// CricAPI's free plan allows 100 calls/day and every page is one call. The match list is
// shared by all users, so worst case is PAGES calls per TTL: 2 pages x 48 half-hours = 96.
const TTL = 30 * 60 * 1000;
const STALE_TTL = 24 * 60 * 60 * 1000; // served if CricAPI errors or the quota runs out
const PAGE_SIZE = 25;                   // CricAPI returns 25 matches per page
const PAGES = 2;
const REFRESH_COOLDOWN = 5 * 60 * 1000; // the refresh button can't be used to burn the quota

let lastFetchAt = 0;

function parseStatus(m) {
  if (m.matchStarted && !m.matchEnded) return 'live';
  if (m.matchEnded) return 'done';
  return 'upcoming';
}

function parseScore(m) {
  if (!m.score || !m.score.length) return '';
  return m.score.map(s => `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`).join('  |  ');
}

function mapMatch(m) {
  return {
    id: m.id,
    match: m.name,
    matchType: m.matchType,
    venue: m.venue || '',
    date: m.dateTimeGMT || m.date,
    status: parseStatus(m),
    // CricAPI's own result line ("India won by 5 wkts") when there is one
    result: m.status || '',
    score: parseScore(m),
    teams: m.teams || [],
  };
}

async function fetchPage(apiKey, offset) {
  const r = await fetch(`https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=${offset}`);
  if (!r.ok) throw new Error(`CricAPI HTTP ${r.status}`);
  const json = await r.json();
  if (json.status !== 'success') throw new Error(json.reason || json.message || 'CricAPI error');
  return json;
}

router.get('/matches', async (req, res) => {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return res.json({ placeholder: true, error: 'CRICAPI_KEY not set in .env', data: [] });
  }

  const cached = getCache('cricket-matches');
  if (cached) return res.json({ data: cached });

  try {
    lastFetchAt = Date.now();
    const first = await fetchPage(apiKey, 0);
    const rows = [...(first.data || [])];
    const total = first.info?.totalRows ?? rows.length;
    console.log(`[cricket] CricAPI calls today: ${first.info?.hitsToday ?? '?'}/${first.info?.hitsLimit ?? '?'}`);

    for (let p = 1; p < PAGES && rows.length < total; p++) {
      try {
        const next = await fetchPage(apiKey, p * PAGE_SIZE);
        rows.push(...(next.data || []));
      } catch (e) {
        console.error('[cricket] page', p + 1, 'failed, keeping earlier pages:', e.message);
        break;
      }
    }

    const seen = new Set();
    const matches = rows
      .filter(m => m.id && !seen.has(m.id) && seen.add(m.id))
      .map(mapMatch);

    setCache('cricket-matches', matches, TTL);
    setCache('cricket-stale', matches, STALE_TTL); // not prefixed 'cricket-matches': refresh must not clear it
    res.json({ data: matches });
  } catch (e) {
    console.error('[cricket]', e);
    Sentry.captureException(e);
    const stale = getCache('cricket-stale');
    if (stale) return res.json({ data: stale, stale: true });
    res.status(502).json({ error: e.message });
  }
});

router.post('/refresh', (req, res) => {
  if (Date.now() - lastFetchAt < REFRESH_COOLDOWN) {
    return res.json({ ok: true, throttled: true });
  }
  clearCache('cricket-matches');
  res.json({ ok: true });
});

export default router;
