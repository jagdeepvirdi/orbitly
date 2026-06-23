import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { F1_CALENDAR, F1_DRIVERS, F1_CONSTRUCTORS, F1_RACE_RESULTS, CRICKET_MATCHES, FOOTBALL_FIXTURES, NBA_FIXTURES, TENNIS_TOURNAMENTS } from '../../data/sportsData';
import { daysAway } from '../../utils/dateUtils';
import { useLiveF1 } from '../../hooks/useLiveF1';
import { useLiveCricket } from '../../hooks/useLiveCricket';
import { useLiveFootball } from '../../hooks/useLiveFootball';
import { useLiveNba } from '../../hooks/useLiveNba';
import { api } from '../../api/client';

// SportToggle helper is replaced by modal configuration flow

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

// ─── NBA section ───────────────────────────────────────────────────────────────

function NBASection() {
  const { games, loading, live: isLive, error, refresh } = useLiveNba();
  const displayGames = games || NBA_FIXTURES;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏀</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Basketball (NBA)</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>NBA Finals & Matches</div>
        </div>
        <DataSourceBadge live={isLive} />
        <RefreshBtn onClick={refresh} loading={loading} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {loading && [1, 2, 3].map(i => (
          <div key={i} style={{ height: 110, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', opacity: 0.5, animation: 'om-pulse 1.4s infinite' }} />
        ))}
        {!loading && displayGames.map((g, i) => (
          <div key={g.id || i} style={{ background: 'var(--surface)', border: `1px solid ${g.status === 'live' ? 'rgba(249,115,22,0.35)' : 'var(--border)'}`, borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3 }}>{g.match}</span>
              <StatusPill status={g.status} />
            </div>
            {g.stage && <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{g.stage}</div>}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtMatchDate(g.date) || g.date}</div>
            {g.score && (
              <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800, color: '#fed7aa', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                {g.score}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tennis section ────────────────────────────────────────────────────────────

function TennisSection() {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎾</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Tennis</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Grand Slams 2026 Season</div>
        </div>
        <DataSourceBadge live={false} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
        {TENNIS_TOURNAMENTS.map(t => (
          <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t.name}</span>
              <StatusPill status={t.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>{t.venue}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{t.date}</div>
            {t.winner && (
              <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--accent)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                🏆 Champions: {t.winner}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Badminton section ─────────────────────────────────────────────────────────

function BadmintonSection() {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏸</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Badminton (BWF)</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>BWF World Tour</div>
        </div>
        <DataSourceBadge live={false} />
      </div>
      <div style={{ padding: '24px 20px', borderRadius: 18, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-3)', textAlign: 'center' }}>
        🏸 BWF World Tour live scoring coming soon. Showing seed fixtures.
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function SportsTracker() {
  const { state, dispatch } = useAppStore();
  const { sportSubscriptions } = state;
  const [catalog, setCatalog] = useState([]);
  const [showManageModal, setShowManageModal] = useState(false);

  // Hook statuses to evaluate API key placeholder states dynamically
  const { placeholder: cricketPlaceholder } = useLiveCricket();
  const { placeholder: footballPlaceholder } = useLiveFootball();
  const { live: nbaLive } = useLiveNba();

  // Load sports catalog on mount
  useEffect(() => {
    api.getSportsCatalog().then(res => setCatalog(res || []));
  }, []);

  useEffect(() => {
    if (localStorage.getItem('open-sports-manage') === 'true') {
      setShowManageModal(true);
      localStorage.removeItem('open-sports-manage');
    }
  }, []);

  const footballSub = sportSubscriptions.find(s => s.sport === 'football');
  const competitions = (footballSub?.leagues && footballSub.leagues.length > 0 ? footballSub.leagues : ['WC','PL','PD','CL','EC']).join(',');

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      
      {/* Hero Banner */}
      <div style={{
        borderRadius: 20, padding: '26px 28px', marginBottom: 26,
        background: 'linear-gradient(120deg, rgba(99,102,241,0.15), rgba(168,85,247,0.08))',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(140deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(99,102,241,0.3)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M6 12A6 6 0 0 1 12 6M18 12a6 6 0 0 1-6 6"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: 28, fontWeight: 600, fontStyle: 'italic' }}>Sports Tracker</div>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginTop: 2 }}>
              Follow your favorite leagues, matches, and race results live
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setShowManageModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
            borderRadius: 11, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text-2)',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Manage Sports
        </button>
      </div>

      {/* Sport sections rendering in subscription order */}
      {sportSubscriptions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border)', color: 'var(--text-3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No Subscribed Sports</div>
          <div style={{ fontSize: 14, marginBottom: 20 }}>Click "Manage Sports" to subscribe to your favorite sports and leagues.</div>
          <button onClick={() => setShowManageModal(true)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
            Configure Subscriptions
          </button>
        </div>
      ) : (
        sportSubscriptions.map(sub => {
          if (sub.sport === 'f1') return <F1Section key="f1" dispatch={dispatch} />;
          if (sub.sport === 'cricket') return <CricketSection key="cricket" />;
          if (sub.sport === 'football') return <FootballSection key="football" competitions={competitions} />;
          if (sub.sport === 'nba') return <NBASection key="nba" />;
          if (sub.sport === 'tennis') return <TennisSection key="tennis" />;
          if (sub.sport === 'badminton') return <BadmintonSection key="badminton" />;
          return null;
        })
      )}

      {/* Manage Sports modal */}
      {showManageModal && (
        <div onClick={() => setShowManageModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, background: 'var(--surface-solid)', borderRadius: 18, border: '1px solid var(--border-strong)', padding: '22px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>Your Sports Subscriptions</div>
              <button onClick={() => setShowManageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Sports List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
              {catalog.map(sport => {
                const sub = sportSubscriptions.find(s => s.sport === sport.id);
                const isSubbed = !!sub;

                // Determine status and badges
                let isLiveAvailable = false;
                let keyLink = null;
                let keyText = '';

                if (sport.id === 'f1') {
                  isLiveAvailable = true;
                } else if (sport.id === 'cricket') {
                  isLiveAvailable = !cricketPlaceholder;
                  keyLink = 'https://cricapi.com';
                  keyText = 'CricAPI key required';
                } else if (sport.id === 'football') {
                  isLiveAvailable = !footballPlaceholder;
                  keyLink = 'https://www.football-data.org';
                  keyText = 'football-data.org key required';
                } else if (sport.id === 'nba') {
                  isLiveAvailable = nbaLive;
                  keyLink = 'https://balldontlie.io';
                  keyText = 'Optional balldontlie key';
                }

                return (
                  <div key={sport.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>{sport.emoji}</span>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{sport.name}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                            <span style={{
                              fontSize: 10, padding: '2px 6px', borderRadius: 99,
                              background: isLiveAvailable ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.14)',
                              color: isLiveAvailable ? '#6ee7b7' : '#94a3b8', fontWeight: 600,
                            }}>
                              {isLiveAvailable ? '● Live Data' : '◌ Seed Data Only'}
                            </span>
                            {keyLink && !isLiveAvailable && (
                              <a href={keyLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#fbbf24', textDecoration: 'underline' }}>
                                {keyText}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Subscription Toggle */}
                      <button
                        onClick={() => {
                          if (isSubbed) {
                            dispatch({ type: 'REMOVE_SPORT_SUBSCRIPTION', sport: sport.id });
                            api.deleteSportSubscription(sport.id).catch(() => {});
                          } else {
                            // Add default leagues if applicable
                            let defaultLeagues = [];
                            if (sport.id === 'cricket') defaultLeagues = ['ipl'];
                            if (sport.id === 'football') defaultLeagues = ['PL', 'CL'];
                            if (sport.id === 'tennis') defaultLeagues = ['wimbledon', 'us-open', 'french-open', 'aus-open'];
                            dispatch({ type: 'ADD_SPORT_SUBSCRIPTION', sport: sport.id, leagues: defaultLeagues });
                            api.setSportSubscription(sport.id, defaultLeagues).catch(() => {});
                          }
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                          background: isSubbed ? 'rgba(239,68,68,0.15)' : 'var(--accent)',
                          color: isSubbed ? '#fca5a5' : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        {isSubbed ? 'Unsubscribe' : 'Subscribe'}
                      </button>
                    </div>

                    {/* League Picker (Only if subbed and has leagues) */}
                    {isSubbed && sport.leagues?.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', marginBottom: 6 }}>Followed Leagues / Events:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px' }}>
                          {sport.leagues.map(league => {
                            const isChecked = sub.leagues?.includes(league.id);
                            return (
                              <label key={league.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, cursor: 'pointer', color: 'var(--text-2)' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextLeagues = isChecked
                                      ? sub.leagues.filter(id => id !== league.id)
                                      : [...(sub.leagues || []), league.id];
                                    dispatch({ type: 'UPDATE_SPORT_LEAGUES', sport: sport.id, leagues: nextLeagues });
                                    api.setSportSubscription(sport.id, nextLeagues).catch(() => {});
                                  }}
                                  style={{ cursor: 'pointer' }}
                                />
                                {league.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer / Issues Link */}
            <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a href="https://github.com/users/orbitly/issues" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
                ❓ Add a sport not listed?
              </a>
              <button
                onClick={() => setShowManageModal(false)}
                style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
