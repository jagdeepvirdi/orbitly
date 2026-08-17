import { Router } from 'express';
import { getCache, setCache, clearCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();
const TTL = 15 * 60 * 1000; // 15 min

const INDIA_TEAMS = ['India', 'India Women', 'India A'];
const IPL_KEYWORDS = ['indian premier league', 'ipl', 'csk', 'mi ', 'rcb', 'kkr', 'dc ', 'srh', 'pbks', 'rr ', 'lsg', 'gt '];

function isRelevant(match) {
  const name = (match.name || '').toLowerCase();
  const teams = (match.teams || []).join(' ').toLowerCase();
  const isIndia = INDIA_TEAMS.some(t => teams.includes(t.toLowerCase()));
  const isIPL = IPL_KEYWORDS.some(k => name.includes(k) || teams.includes(k));
  return isIndia || isIPL;
}

function parseStatus(m) {
  if (m.matchStarted && !m.matchEnded) return 'live';
  if (m.matchEnded) return 'done';
  return 'upcoming';
}

function parseScore(m) {
  if (!m.score || !m.score.length) return '';
  return m.score.map(s => `${s.inning}: ${s.r}/${s.w} (${s.o} ov)`).join('  |  ');
}

router.get('/matches', async (req, res) => {
  const apiKey = process.env.CRICAPI_KEY;
  if (!apiKey) {
    return res.json({ placeholder: true, error: 'CRICAPI_KEY not set in .env', data: [] });
  }

  const cached = getCache('cricket-matches');
  if (cached) return res.json({ data: cached });

  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/matches?apikey=${apiKey}&offset=0`
    );
    if (!r.ok) return res.status(r.status).json({ error: 'CricAPI upstream error' });
    const json = await r.json();
    if (json.status !== 'success') {
      return res.status(400).json({ error: json.message || 'CricAPI error' });
    }

    const matches = (json.data || [])
      .filter(isRelevant)
      .map(m => ({
        id: m.id,
        match: m.name,
        matchType: m.matchType,
        venue: m.venue || '',
        date: m.dateTimeGMT || m.date,
        status: parseStatus(m),
        score: parseScore(m),
        teams: m.teams || [],
      }));

    setCache('cricket-matches', matches, TTL);
    res.json({ data: matches });
  } catch (e) {
    console.error('[cricket]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/refresh', (req, res) => {
  clearCache('cricket-matches');
  res.json({ ok: true });
});

export default router;
