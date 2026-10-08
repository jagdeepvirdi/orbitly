// Team filtering / ordering for the shared cricket + football match feeds.
// A subscription's `teams` list is a filter on the feed: empty means "all teams".

const norm = s => String(s || '').trim().toLowerCase();

// Team names in a match, for both feed shapes (football: homeTeam/awayTeam, cricket: teams[]).
export function matchTeams(m) {
  if (Array.isArray(m.teams)) return m.teams.filter(Boolean);
  return [m.homeTeam, m.awayTeam].filter(Boolean);
}

export function filterByTeams(matches, teams) {
  if (!matches) return matches;
  if (!teams || teams.length === 0) return matches;
  const wanted = new Set(teams.map(norm));
  return matches.filter(m => matchTeams(m).some(t => wanted.has(norm(t))));
}

// Every team seen in the feed (plus any already-selected ones that have no match in the
// current window, so they can still be deselected), sorted A-Z.
export function collectTeams(matches, selected = []) {
  const byKey = new Map();
  [...selected, ...(matches || []).flatMap(matchTeams)].forEach(t => {
    if (t && !byKey.has(norm(t))) byKey.set(norm(t), t);
  });
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

// Live first, then upcoming soonest-first, then results most-recent-first.
export function sortMatches(matches) {
  const rank = { live: 0, upcoming: 1, done: 2 };
  const time = m => new Date(m.date).getTime() || 0;
  return [...matches].sort((a, b) => {
    const ra = rank[a.status] ?? 1;
    const rb = rank[b.status] ?? 1;
    if (ra !== rb) return ra - rb;
    return a.status === 'done' ? time(b) - time(a) : time(a) - time(b);
  });
}
