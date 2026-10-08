import { describe, it, expect } from 'vitest';
import { matchTeams, filterByTeams, collectTeams, sortMatches } from './sportsUtils';

const fb = (id, home, away, status = 'upcoming', date = '2026-10-10T12:00:00Z') => ({ id, homeTeam: home, awayTeam: away, status, date });
const cr = (id, teams, status = 'upcoming', date = '2026-10-10T12:00:00Z') => ({ id, teams, status, date });

describe('matchTeams', () => {
  it('reads football home/away and cricket teams[]', () => {
    expect(matchTeams(fb(1, 'Arsenal', 'Chelsea'))).toEqual(['Arsenal', 'Chelsea']);
    expect(matchTeams(cr(2, ['India', 'England']))).toEqual(['India', 'England']);
  });
  it('tolerates missing teams', () => {
    expect(matchTeams({})).toEqual([]);
    expect(matchTeams(cr(3, []))).toEqual([]);
  });
});

describe('filterByTeams', () => {
  const matches = [fb(1, 'Arsenal', 'Chelsea'), fb(2, 'Liverpool', 'Everton'), fb(3, 'Spurs', 'Arsenal')];
  it('returns everything when no teams are followed', () => {
    expect(filterByTeams(matches, [])).toHaveLength(3);
    expect(filterByTeams(matches, undefined)).toHaveLength(3);
  });
  it('keeps matches where either side is followed, ignoring case and spacing', () => {
    expect(filterByTeams(matches, [' arsenal ']).map(m => m.id)).toEqual([1, 3]);
  });
  it('works for cricket teams[]', () => {
    const c = [cr(1, ['India', 'England']), cr(2, ['Australia', 'Pakistan'])];
    expect(filterByTeams(c, ['India']).map(m => m.id)).toEqual([1]);
  });
  it('passes null through', () => {
    expect(filterByTeams(null, ['India'])).toBeNull();
  });
});

describe('collectTeams', () => {
  it('lists unique teams A-Z and keeps followed teams that have no match in the window', () => {
    const matches = [fb(1, 'Chelsea', 'Arsenal'), fb(2, 'arsenal', 'Spurs')];
    expect(collectTeams(matches, ['Brighton'])).toEqual(['Arsenal', 'Brighton', 'Chelsea', 'Spurs']);
  });
});

describe('sortMatches', () => {
  it('orders live, then upcoming soonest-first, then results newest-first', () => {
    const list = [
      fb('done-old', 'A', 'B', 'done', '2026-10-01T00:00:00Z'),
      fb('up-late', 'A', 'B', 'upcoming', '2026-10-20T00:00:00Z'),
      fb('live', 'A', 'B', 'live', '2026-10-08T00:00:00Z'),
      fb('done-new', 'A', 'B', 'done', '2026-10-05T00:00:00Z'),
      fb('up-soon', 'A', 'B', 'upcoming', '2026-10-09T00:00:00Z'),
    ];
    expect(sortMatches(list).map(m => m.id)).toEqual(['live', 'up-soon', 'up-late', 'done-new', 'done-old']);
  });
  it('does not mutate its input', () => {
    const list = [fb(1, 'A', 'B', 'done'), fb(2, 'A', 'B', 'live')];
    sortMatches(list);
    expect(list.map(m => m.id)).toEqual([1, 2]);
  });
});
