import { Router } from 'express';
import { getCache, setCache } from '../cache.js';
import * as Sentry from '@sentry/node';

const router = Router();

const TEAM_COLORS = {
  'Red Bull': '#0600ef', 'Ferrari': '#dc143c', 'McLaren': '#ff8000',
  'Mercedes': '#00d2be', 'Aston Martin': '#006f62', 'Alpine': '#0090ff',
  'Williams': '#005aff', 'RB': '#6692ff', 'Kick Sauber': '#52e252',
  'Haas F1 Team': '#b6babd',
};

function colorForTeam(name) {
  for (const [k, v] of Object.entries(TEAM_COLORS)) {
    if (name.includes(k)) return v;
  }
  return '#6c6c80';
}

// Always fetch from Ergast's "current" endpoint — returns the active/most-recent season
// regardless of calendar year, so we never get "no data" for a new season.
const ERGAST = 'https://api.jolpi.ca/ergast/f1/current';
const CACHE_TTL = {
  schedule:     6  * 60 * 60 * 1000,  // 6 h  (race dates don't change)
  standings:    30 * 60 * 1000,        // 30 min (points change after each race)
  constructors: 30 * 60 * 1000,
  results:      30 * 60 * 1000,
};

async function scheduleHandler(req, res) {
  const key = 'f1-schedule-current';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${ERGAST}/races.json?limit=50`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error' });
    const json = await r.json();
    const season = json.MRData?.RaceTable?.season || new Date().getFullYear();
    const races = (json.MRData?.RaceTable?.Races || []).map(race => {
      const d = new Date(race.date + (race.time ? 'T' + race.time : 'T00:00:00Z'));
      return {
        round:       parseInt(race.round),
        season:      parseInt(season),
        gp:          race.raceName,
        circuit:     race.Circuit.circuitName,
        locality:    race.Circuit.Location.locality,
        country:     race.Circuit.Location.country,
        date:        race.date,                   // ISO YYYY-MM-DD
        time:        race.time || null,
        year:        d.getFullYear(),
        month:       d.getMonth(),                // 0-indexed for daysAway()
        day:         d.getDate(),
        displayDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      };
    });

    setCache(key, races, CACHE_TTL.schedule);
    res.json(races);
  } catch (e) {
    console.error('[f1]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
}
router.get('/schedule/:season', scheduleHandler); // legacy — still works
router.get('/schedule', scheduleHandler);

async function standingsHandler(req, res) {
  const key = 'f1-standings-current';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${ERGAST}/driverstandings.json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error' });
    const json = await r.json();
    const season = json.MRData?.StandingsTable?.season;
    const list   = json.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
    const drivers = list.map(d => ({
      pos:    parseInt(d.position),
      season: parseInt(season),
      name:   `${d.Driver.givenName} ${d.Driver.familyName}`,
      code:   d.Driver.code,
      team:   d.Constructors[0]?.name || '',
      pts:    parseFloat(d.points),
      wins:   parseInt(d.wins),
      color:  colorForTeam(d.Constructors[0]?.name || ''),
    }));

    setCache(key, drivers, CACHE_TTL.standings);
    res.json(drivers);
  } catch (e) {
    console.error('[f1]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
}
router.get('/standings/:season', standingsHandler);
router.get('/standings', standingsHandler);

// Constructor standings
async function constructorStandingsHandler(req, res) {
  const key = 'f1-constructors-current';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${ERGAST}/constructorstandings.json`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error' });
    const json = await r.json();
    const season = json.MRData?.StandingsTable?.season;
    const list   = json.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
    const constructors = list.map(c => ({
      pos:    parseInt(c.position),
      season: parseInt(season),
      name:   c.Constructor.name,
      pts:    parseFloat(c.points),
      wins:   parseInt(c.wins),
      color:  colorForTeam(c.Constructor.name),
    }));
    setCache(key, constructors, CACHE_TTL.constructors);
    res.json(constructors);
  } catch (e) {
    console.error('[f1]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
}
router.get('/constructors/:season', constructorStandingsHandler);
router.get('/constructors', constructorStandingsHandler);

// Race results — winner (pos 1) for each completed race this season
async function raceResultsHandler(req, res) {
  const key = 'f1-results-current';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const r = await fetch(`${ERGAST}/results/1.json?limit=30`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(r.status).json({ error: 'Upstream error' });
    const json = await r.json();
    const races = (json.MRData?.RaceTable?.Races || []).map(race => {
      const winner = race.Results?.[0];
      return {
        round:  parseInt(race.round),
        gp:     race.raceName,
        date:   race.date,
        winner: winner ? `${winner.Driver.givenName} ${winner.Driver.familyName}` : '—',
        team:   winner?.Constructor?.name || '—',
        color:  colorForTeam(winner?.Constructor?.name || ''),
      };
    });
    setCache(key, races, CACHE_TTL.results);
    res.json(races);
  } catch (e) {
    console.error('[f1]', e);
    Sentry.captureException(e);
    res.status(500).json({ error: e.message });
  }
}
router.get('/results/:season', raceResultsHandler);
router.get('/results', raceResultsHandler);

// Cache bust — clears all in-memory F1 cache entries so next request re-fetches live
router.post('/refresh', (req, res) => {
  ['f1-schedule-current','f1-standings-current','f1-constructors-current','f1-results-current'].forEach(k => {
    // setCache with TTL 0 effectively deletes (expires immediately)
    setCache(k, null, 0);
  });
  res.json({ ok: true, message: 'F1 server cache cleared' });
});

export default router;
