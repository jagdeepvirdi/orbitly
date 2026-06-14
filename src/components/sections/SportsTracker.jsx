import { useAppStore } from '../../store/appStore';
import { F1_CALENDAR, F1_DRIVERS, F1_CONSTRUCTORS, F1_RACE_RESULTS, CRICKET_MATCHES, FOOTBALL_FIXTURES } from '../../data/sportsData';
import { daysAway } from '../../utils/dateUtils';
import { useLiveF1 } from '../../hooks/useLiveF1';
import { useLiveCricket } from '../../hooks/useLiveCricket';
import { useLiveFootball } from '../../hooks/useLiveFootball';

function SportToggle({ label, on, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
        borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
        border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
        background: on ? 'rgba(99,102,241,0.16)' : 'transparent',
        color: on ? 'var(--text)' : 'var(--text-3)',
      }}
    >{label}</button>
  );
}

function LiveBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99,
      background: 'rgba(16,185,129,0.18)', color: '#34d399',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', animation: 'om-pulse 1.4s infinite' }} />
      LIVE
    </span>
  );
}

function DataSourceBadge({ live }) {
  return (
    <span style={{
      fontSize: 10.5, padding: '3px 9px', borderRadius: 99,
      background: live ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.14)',
      color: live ? '#6ee7b7' : '#94a3b8', fontWeight: 600,
    }}>
      {live ? '● Live' : '◌ Seed data'}
    </span>
  );
}

function ApiKeyPrompt({ sport, href }) {
  return (
    <div style={{
      padding: '18px 22px', borderRadius: 16,
      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ fontSize: 22 }}>🔑</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fcd34d' }}>API key needed for live {sport} data</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3 }}>
          Register free at <strong>{href}</strong>, add key to <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 4 }}>.env</code>, then restart the server.
          Showing seed data below.
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    live:     { bg: 'rgba(16,185,129,0.16)', color: '#34d399', label: '🔴 LIVE' },
    upcoming: { bg: 'rgba(56,189,248,0.1)',  color: '#7dd3fc', label: 'Upcoming' },
    done:     { bg: 'rgba(100,116,139,0.1)', color: '#6c6c80', label: 'Result' },
  };
  const s = map[status] || map.upcoming;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function fmtMatchDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ─── F1 section ────────────────────────────────────────────────────────────────

function StandingsTable({ title, rows, showWins }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{title}</span>
        {showWins && <span style={{ fontSize: 11, letterSpacing: 0, color: 'var(--text-3)' }}>PTS · W</span>}
      </div>
      {rows.map((d, i) => (
        <div key={d.pos ?? i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
          background: d.pos === 1 ? 'rgba(255,255,255,0.025)' : 'transparent',
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: d.pos === 1 ? 'var(--text)' : 'var(--text-3)', minWidth: 22, textAlign: 'right' }}>{d.pos}</div>
          <div style={{ width: 3, height: 30, borderRadius: 99, background: d.color, flex: '0 0 3px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
            {d.team && <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{d.team}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{d.pts}</div>
            {showWins && (
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', minWidth: 14, textAlign: 'center' }}>
                {d.wins > 0 ? <span style={{ color: '#fbbf24' }}>×{d.wins}</span> : '—'}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function F1Section({ dispatch }) {
  const { schedule, standings, constructors, raceResults, loading, error, refresh, fetchedAt, season } = useLiveF1();

  const rawCalendar     = schedule      || F1_CALENDAR;
  const rawDrivers      = standings     || F1_DRIVERS;
  const rawConstructors = constructors  || F1_CONSTRUCTORS;
  const rawResults      = raceResults   || F1_RACE_RESULTS;
  const isLive = !!schedule;

  // Annotate each race with days-away; split into upcoming vs completed
  const annotated = rawCalendar.map(r => {
    // Live data uses ISO date string; seed data uses year/month/day
    let days;
    if (r.date && r.date.includes('-') && r.date.length === 10) {
      const [y, m, d] = r.date.split('-').map(Number);
      days = daysAway(y, m - 1, d);          // ISO: month is 1-indexed → convert
    } else {
      days = daysAway(r.year, r.month, r.day); // seed: month already 0-indexed
    }
    return { ...r, days };
  });

  const upcoming  = annotated.filter(r => r.days >= 0).sort((a, b) => a.days - b.days);
  const completed = annotated.filter(r => r.days  < 0).sort((a, b) => b.days - a.days); // most recent first

  // For "Recent Results", prefer live raceResults API; fall back to seed F1_RACE_RESULTS
  // Live raceResults are already completed races ordered by round
  const recentResults = raceResults
    ? [...raceResults].reverse().slice(0, 5)  // most recent first, max 5
    : rawResults.slice(0, 3);

  const nextRace = upcoming[0];
  const nextDays = nextRace?.days;
  const nextLabel = nextDays === 0 ? 'Race day!' : nextDays === 1 ? 'Tomorrow' : nextDays != null ? `${nextDays} days away` : '—';

  return (
    <div style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏎️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Formula 1 · {season} Season</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            {loading
              ? 'Fetching live data…'
              : error
                ? 'API unavailable — showing seed data'
                : nextRace
                  ? `Next · ${nextRace.gp} · ${nextLabel}`
                  : 'Season complete'}
            {fetchedAt && !loading && !error && (
              <span style={{ marginLeft: 10, opacity: 0.55 }}>
                · updated {fetchedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
        <DataSourceBadge live={isLive} />
        <button
          onClick={refresh}
          disabled={loading}
          title="Refresh F1 data"
          style={{
            width: 34, height: 34, borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: loading ? 'om-spin 0.8s linear infinite' : 'none' }}>
            <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      </div>

      {/* Row 1: Upcoming Races + Recent Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16, alignItems: 'start' }}>

        {/* Upcoming races */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
            Upcoming Races
          </div>
          {upcoming.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--text-3)' }}>No upcoming races — season complete.</div>
          )}
          {upcoming.map((r, i) => (
            <div key={r.round} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
              borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none',
              background: i === 0 ? 'rgba(239,68,68,0.07)' : 'transparent',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 28 }}>R{r.round}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.gp}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.displayDate || r.date} · {r.locality || r.circuit}</div>
              </div>
              {r.days === 0
                ? <LiveBadge />
                : i === 0
                  ? <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', whiteSpace: 'nowrap' }}>NEXT</span>
                  : <span style={{ fontSize: 11.5, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{r.days}d</span>
              }
            </div>
          ))}
        </div>

        {/* Recent results */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)' }}>
            Recent Results
          </div>
          {recentResults.length === 0 && (
            <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--text-3)' }}>No completed races yet this season.</div>
          )}
          {recentResults.map((r, i) => (
            <div key={r.round} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '12px 18px',
              borderBottom: i < recentResults.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', minWidth: 26 }}>R{r.round}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.flag && <span style={{ marginRight: 5 }}>{r.flag}</span>}{r.gp.replace(' Grand Prix', ' GP')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{r.date?.slice(0, 10) || r.date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 3, height: 28, borderRadius: 99, background: r.color, flex: '0 0 3px' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>🥇 {r.winner}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.team}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Driver Standings + Constructor Standings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <StandingsTable
          title="Driver Standings"
          rows={rawDrivers}
          showWins
        />
        <StandingsTable
          title="Constructor Standings"
          rows={rawConstructors.map(c => ({ ...c, team: null }))}
          showWins
        />
      </div>
    </div>
  );
}

// ─── Cricket section ────────────────────────────────────────────────────────────

function RefreshBtn({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Refresh data"
      style={{
        width: 34, height: 34, borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
        background: 'var(--surface)', border: '1px solid var(--border)',
        color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: loading ? 0.5 : 1,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ animation: loading ? 'om-spin 0.8s linear infinite' : 'none' }}>
        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
      </svg>
    </button>
  );
}

function CricketSection() {
  const { matches, loading, placeholder, error, refresh } = useLiveCricket();
  const displayMatches = matches || CRICKET_MATCHES;
  const isLive = !!matches;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏏</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Cricket</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>India Internationals · IPL</div>
        </div>
        <DataSourceBadge live={isLive} />
        <RefreshBtn onClick={refresh} loading={loading} />
      </div>
      {placeholder && <ApiKeyPrompt sport="cricket" href="cricapi.com" />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12, marginTop: placeholder ? 14 : 0 }}>
        {loading && !placeholder && [1,2,3].map(i => (
          <div key={i} style={{ height: 100, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.5, animation: 'om-pulse 1.4s infinite' }} />
        ))}
        {!loading && displayMatches.map((m, i) => (
          <div key={m.id || i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{m.match}</span>
              <StatusPill status={m.status} />
            </div>
            {m.series && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{m.series}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: m.score ? 10 : 0 }}>
              {m.venue} · {fmtMatchDate(m.date) || m.date}
            </div>
            {m.score && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {m.score}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Football section ───────────────────────────────────────────────────────────

function FootballSection({ competitions }) {
  const { matches, loading, placeholder, error, refresh } = useLiveFootball(competitions);
  const displayMatches = matches || FOOTBALL_FIXTURES;
  const isLive = !!matches;

  // Group by competition
  const grouped = {};
  (matches || []).forEach(m => {
    if (!grouped[m.competition]) grouped[m.competition] = [];
    grouped[m.competition].push(m);
  });
  const hasGroups = Object.keys(grouped).length > 0;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚽</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Football</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            {isLive ? competitions.replace(/,/g, ' · ') : 'FIFA World Cup 2026 · Premier League'}
          </div>
        </div>
        <DataSourceBadge live={isLive} />
        <RefreshBtn onClick={refresh} loading={loading} />
      </div>
      {placeholder && <ApiKeyPrompt sport="football" href="football-data.org" />}

      {loading && !placeholder && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ height: 110, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.5, animation: 'om-pulse 1.4s infinite' }} />
          ))}
        </div>
      )}

      {!loading && hasGroups && Object.entries(grouped).map(([comp, ms]) => (
        <div key={comp} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', marginBottom: 10, paddingLeft: 2 }}>{comp}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 10 }}>
            {ms.map(m => (
              <MatchCard key={m.id} m={m} showComp={false} />
            ))}
          </div>
        </div>
      ))}

      {!loading && !hasGroups && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
          {(displayMatches).map((m, i) => <MatchCard key={m.id || i} m={m} showComp />)}
        </div>
      )}
    </div>
  );
}

function MatchCard({ m, showComp }) {
  const isLiveStatus = m.status === 'live';
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${isLiveStatus ? 'rgba(16,185,129,0.35)' : 'var(--border)'}`, borderRadius: 16, padding: 18 }}>
      {showComp && m.competition && (
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>{m.competition}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          {m.homeTeam || m.teams} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>vs</span> {m.awayTeam}
        </div>
        <StatusPill status={m.status} />
      </div>
      {m.stage && <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>{m.stage}</div>}
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtMatchDate(m.date) || m.date}</div>
      {m.score && (
        <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800, color: '#86efac', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          {m.score}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function SportsTracker() {
  const { state, dispatch } = useAppStore();
  const { sportsToggles } = state;
  const competitions = (state.sportSettings?.football?.competitions || ['WC','PL','PD','CL','EC']).join(',');

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', marginBottom: 26 }}>
        <SportToggle label="🏎️ Formula 1"          on={sportsToggles.f1}       onClick={() => dispatch({ type: 'TOGGLE_SPORT', sport: 'f1' })} />
        <SportToggle label="🏏 Cricket"             on={sportsToggles.cricket}  onClick={() => dispatch({ type: 'TOGGLE_SPORT', sport: 'cricket' })} />
        <SportToggle label="⚽ Football"            on={sportsToggles.football} onClick={() => dispatch({ type: 'TOGGLE_SPORT', sport: 'football' })} />
        <SportToggle label="🎾 Tennis"              on={sportsToggles.badminton} onClick={() => dispatch({ type: 'TOGGLE_SPORT', sport: 'badminton' })} />
      </div>

      {sportsToggles.f1       && <F1Section dispatch={dispatch} />}
      {sportsToggles.cricket  && <CricketSection />}
      {sportsToggles.football && <FootballSection competitions={competitions} />}
      {sportsToggles.badminton && (
        <div style={{ padding: '28px 22px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)', textAlign: 'center' }}>
          🎾 Tennis live data coming soon — Grand Slams, ATP/WTA Finals, Davis Cup
        </div>
      )}
    </div>
  );
}
