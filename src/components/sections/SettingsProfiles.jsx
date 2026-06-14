import { useState, useEffect } from 'react';
import { useAppStore, CAT } from '../../store/appStore';
import { USERS } from '../../data/users';
import IcsImportModal from '../ui/IcsImportModal';

const NOTIF_ROWS = [
  { key: 'meds', label: 'Medication reminders', desc: 'Daily at 08:00 and 20:00 Bangkok time' },
  { key: 'learning', label: 'Learning session', desc: 'Morning of each scheduled session' },
  { key: 'festivals', label: 'Festival & holiday reminders', desc: '2 weeks before each festival' },
  { key: 'f1race', label: 'F1 race alerts', desc: '1 day before and 1 hour before race start' },
  { key: 'birthday', label: 'Birthday & anniversary reminders', desc: '1 week before each date' },
  { key: 'evening_wrap', label: 'Evening Day Wrap', desc: 'Daily at 21:00 — tasks completed, sessions done' },
  { key: 'weekly_digest', label: 'Weekly Digest', desc: 'Every Sunday at 19:00 — preview of the week ahead' },
];

// ── AI status helpers ─────────────────────────────────────────────────────────
async function fetchAiStatus() {
  const r = await fetch('http://localhost:3003/api/extract/status');
  if (!r.ok) throw new Error('server error');
  return r.json();
}

const GEMINI_STATE_STYLE = {
  active:        { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)',  dot: '#34d399', glow: true,  label: 'Active' },
  quota_exceeded:{ bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)',  dot: '#f59e0b', glow: false, label: 'Quota exceeded' },
  rate_limited:  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.28)',  dot: '#f59e0b', glow: false, label: 'Rate limited' },
  invalid_key:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.28)',   dot: '#ef4444', glow: false, label: 'Invalid key' },
  unconfigured:  { bg: 'rgba(107,114,128,0.12)', border: 'rgba(107,114,128,0.22)', dot: '#6b7280', glow: false, label: 'Not configured' },
};

function StatusBadge({ active, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: active ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', border: `1px solid ${active ? 'rgba(16,185,129,0.28)' : 'rgba(107,114,128,0.22)'}` }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#34d399' : '#6b7280', boxShadow: active ? '0 0 6px #34d399' : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#34d399' : '#9ca3af' }}>{label}</span>
    </div>
  );
}

function GeminiStateBadge({ state }) {
  const s = GEMINI_STATE_STYLE[state] || GEMINI_STATE_STYLE.unconfigured;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, boxShadow: s.glow ? `0 0 6px ${s.dot}` : 'none' }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: s.dot }}>{s.label}</span>
    </div>
  );
}

function UsageBar({ used, limit, pct, resetsAt, state }) {
  const barColor = pct >= 95 || state === 'quota_exceeded' ? '#ef4444'
    : pct >= 80 ? '#f59e0b'
    : '#34d399';
  const resetsLocal = resetsAt ? new Date(resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div style={{ marginTop: 10, marginLeft: 58 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-3)', marginBottom: 5 }}>
        <span><strong style={{ color: 'var(--text-2)' }}>{used.toLocaleString()}</strong> / {limit.toLocaleString()} requests used today</span>
        {resetsLocal && <span>resets {resetsLocal} local</span>}
      </div>
      <div style={{ height: 5, borderRadius: 99, background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: barColor, borderRadius: 99, transition: 'width .4s ease' }} />
      </div>
      {state === 'quota_exceeded' && (
        <div style={{ marginTop: 7, fontSize: 12, color: '#f59e0b' }}>
          Daily quota reached — <strong>Ollama is now your primary AI</strong>. Gemini resets at {resetsLocal} local time.
        </div>
      )}
      {state === 'rate_limited' && (
        <div style={{ marginTop: 7, fontSize: 12, color: '#f59e0b' }}>
          Per-minute rate limit hit. Will retry on next extraction. (Ollama handles it in the meantime.)
        </div>
      )}
      {state === 'invalid_key' && (
        <div style={{ marginTop: 7, fontSize: 12, color: '#fca5a5' }}>
          API key is invalid. Check GEMINI_API_KEY in your .env file.
        </div>
      )}
    </div>
  );
}

function AiBackendsPanel() {
  const [status, setStatus] = useState(null);  // null = not checked yet
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);

  async function check() {
    setChecking(true);
    setError(false);
    try {
      setStatus(await fetchAiStatus());
    } catch {
      setError(true);
      setStatus(null);
    }
    setChecking(false);
  }

  useEffect(() => { check(); }, []);

  const ollama  = status?.ollama;
  const geminiS = status?.gemini;

  return (
    <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 18 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 14px' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>AI Backends</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Used to extract data from prescriptions &amp; test results</div>
        </div>
        <button onClick={check} disabled={checking}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: checking ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, opacity: checking ? 0.6 : 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ animation: checking ? 'om-spin 1s linear infinite' : 'none' }}>
            <path d="M21 12a9 9 0 11-2.6-6.4"/><path d="M21 3v5h-5"/>
          </svg>
          {checking ? 'Checking…' : 'Refresh'}
        </button>
      </div>

      {/* Server unreachable */}
      {error && (
        <div style={{ margin: '0 22px 14px', padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)', fontSize: 12.5, color: '#fca5a5' }}>
          Could not reach the Orbitly server. Make sure <code>npm run dev</code> is running.
        </div>
      )}

      {/* ── Ollama row ── */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(99,102,241,0.14)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <circle cx="8.5" cy="10" r="1.5"/><circle cx="15.5" cy="10" r="1.5"/>
              <path d="M8.5 10s1 2 3.5 2 3.5-2 3.5-2"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>Ollama</span>
              <code style={{ fontSize: 11, padding: '1px 7px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-3)', fontFamily: 'monospace' }}>{ollama?.model ?? 'gemma3:4b'}</code>
              {status?.primary === 'ollama' && <span style={{ fontSize: 10.5, padding: '1px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 700 }}>PRIMARY</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Local · GPU-accelerated · Files never leave your machine</div>
          </div>
          {status === null && !error
            ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>checking…</span>
            : <StatusBadge active={ollama?.active} label={ollama?.active ? 'Active' : 'Offline'} />}
        </div>
        {ollama?.active && !ollama?.modelLoaded && (
          <div style={{ marginTop: 9, marginLeft: 58, padding: '8px 12px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 12, color: '#fcd34d' }}>
            Model not found in Ollama. Run: <code>ollama pull gemma3:4b</code>
          </div>
        )}
        {!ollama?.active && status !== null && (
          <div style={{ marginTop: 9, marginLeft: 58, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'var(--text-3)' }}>
            Make sure Ollama is running — check the system tray icon.
          </div>
        )}
      </div>

      {/* ── Gemini row ── */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(245,158,11,0.14)', color: '#fcd34d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>Gemini Flash</span>
              <code style={{ fontSize: 11, padding: '1px 7px', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-3)', fontFamily: 'monospace' }}>gemini-1.5-flash</code>
              {status?.primary === 'gemini' && <span style={{ fontSize: 10.5, padding: '1px 8px', borderRadius: 99, background: 'rgba(245,158,11,0.15)', color: '#fcd34d', fontWeight: 700 }}>PRIMARY</span>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Cloud fallback · {(geminiS?.limit ?? 1500).toLocaleString()} requests/day free · Google AI Studio</div>
          </div>
          {status === null && !error
            ? <span style={{ fontSize: 12, color: 'var(--text-3)' }}>checking…</span>
            : <GeminiStateBadge state={geminiS?.state ?? 'unconfigured'} />}
        </div>

        {/* Usage bar — shown when configured */}
        {geminiS?.configured && status !== null && (
          <UsageBar
            used={geminiS.used}
            limit={geminiS.limit}
            pct={geminiS.pct}
            resetsAt={geminiS.resetsAt}
            state={geminiS.state}
          />
        )}

        {/* Not configured hint */}
        {geminiS?.state === 'unconfigured' && (
          <div style={{ marginTop: 9, marginLeft: 58, padding: '8px 12px', borderRadius: 10, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: 'var(--text-3)' }}>
            Optional fallback. Add <code>GEMINI_API_KEY</code> to .env — free key at aistudio.google.com
          </div>
        )}
      </div>

      {/* Priority note */}
      {status?.ollama?.active && geminiS?.configured && (
        <div style={{ padding: '11px 22px', fontSize: 12, color: 'var(--text-3)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span><strong style={{ color: 'var(--text-2)' }}>Priority:</strong> Ollama always runs first (local &amp; private). Gemini is only called if Ollama is unavailable — including when quota is exceeded, Ollama automatically takes over.</span>
        </div>
      )}
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px', borderRadius: 11, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, transition: 'all .15s',
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >{label}</button>
  );
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsProfiles() {
  const { state, dispatch } = useAppStore();
  const tab = state.settingsTab;
  const allUsers = Object.values(USERS);
  const [icsToast, setIcsToast]       = useState(false);
  const [showIcsImport, setShowIcsImport] = useState(false);

  function handleExportJSON() {
    const raw = localStorage.getItem('orbitly-state');
    const data = raw ? JSON.parse(raw) : {};
    downloadJSON(`orbitly-${new Date().toISOString().slice(0, 10)}.json`, data);
  }

  function handleExportICS() {
    setIcsToast(true);
    setTimeout(() => setIcsToast(false), 2800);
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '26px 34px 60px' }}>
      <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 30, margin: '0 0 22px' }}>
        Settings & Profiles
      </h2>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 4, padding: 5,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, marginBottom: 28, width: 'fit-content',
      }}>
        {[['profiles', 'Profiles'], ['notifications', 'Notifications'], ['connections', 'Connections'], ['export', 'Export']].map(([key, label]) => (
          <TabBtn key={key} label={label} active={tab === key} onClick={() => dispatch({ type: 'SET_SETTINGS_TAB', tab: key })} />
        ))}
      </div>

      {/* PROFILES */}
      {tab === 'profiles' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 14, marginBottom: 26 }}>
            {allUsers.map(u => {
              const isActive = u.id === state.userId;
              return (
                <button
                  key={u.id}
                  onClick={() => dispatch({ type: 'SET_USER', id: u.id })}
                  style={{
                    padding: 22, borderRadius: 20, cursor: 'pointer', transition: 'all .2s',
                    border: `2px solid ${isActive ? u.accent : 'var(--border)'}`,
                    background: isActive ? u.accentSoft : 'var(--surface)',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <div style={{
                    width: 56, height: 56, borderRadius: 17, background: u.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 13,
                  }}>
                    {u.initials}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{u.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginBottom: 12 }}>{u.role} · Bangkok (ICT)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', width: 'fit-content' }}>
                    <div style={{ width: 13, height: 13, borderRadius: '50%', background: u.accent }} />
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: u.accent }}>Accent</span>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '18px 22px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>Timezone</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ padding: '10px 16px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 14, fontWeight: 600 }}>
                🌏 Asia/Bangkok (ICT, UTC+7)
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)' }}>All times shown in Bangkok time</div>
            </div>
          </div>
        </>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          {NOTIF_ROWS.map((n, i) => {
            const on = state.notifications[n.key];
            return (
              <div key={n.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '17px 22px', borderBottom: i < NOTIF_ROWS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{n.desc}</div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_NOTIF', key: n.key })}
                  style={{
                    width: 44, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
                    transition: 'background .2s', position: 'relative',
                    background: on ? 'var(--accent)' : 'rgba(255,255,255,0.14)',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                    background: '#fff', transition: 'all .2s',
                    ...(on ? { right: 3 } : { left: 3 }),
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* CONNECTIONS */}
      {tab === 'connections' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
          {allUsers.map((u, i) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: u.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {u.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{u.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{u.role} · Connected · Bangkok</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 99, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#34d399' }}>Active</span>
              </div>
            </div>
          ))}
          <div style={{ padding: '17px 22px' }}>
            <button style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '11px 18px', borderRadius: 12,
              border: '1px dashed var(--border)', background: 'transparent',
              color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Invite someone to your orbit
            </button>
          </div>
          <AiBackendsPanel />
        </div>
      )}

      {/* IMPORT / EXPORT */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Import section */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Import</div>
            <div style={{ padding: 22, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Import Calendar (.ics)</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Load events from Google Calendar, Apple Calendar, or Outlook and assign a category</div>
              </div>
              <button
                onClick={() => setShowIcsImport(true)}
                style={{ padding: '11px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, border: '1px solid rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.12)', color: '#fdba74', whiteSpace: 'nowrap' }}
              >Import .ics</button>
            </div>

            {/* Import history */}
            {(state.importHistory || []).length > 0 && (
              <div style={{ marginTop: 12, padding: '16px 20px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Import History</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(state.importHistory || []).map(batch => (
                    <div key={batch.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: CAT[batch.category] || '#6c6c80', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{batch.filename}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {batch.count} event{batch.count !== 1 ? 's' : ''} · {batch.category} · {new Date(batch.importedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_CAL_BATCH', batchId: batch.id })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 5 }}
                        title="Remove import"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export section */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Export</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 22, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px' }}
                  dangerouslySetInnerHTML={{ __html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Export all data as JSON</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Full backup of tasks, learning plan, events & health data</div>
                </div>
                <button
                  onClick={handleExportJSON}
                  style={{ padding: '11px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.14)', color: '#a5b4fc' }}
                >Export JSON</button>
              </div>

              <div style={{ padding: 22, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px' }}
                  dangerouslySetInnerHTML={{ __html: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>Export calendar as ICS</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                    {icsToast ? <span style={{ color: '#f59e0b', fontWeight: 600 }}>Coming soon — ICS export is planned for a future update</span> : 'Import into Google Calendar, Apple Calendar, Outlook'}
                  </div>
                </div>
                <button
                  onClick={handleExportICS}
                  style={{ padding: '11px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.14)', color: '#6ee7b7' }}
                >Export ICS</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIcsImport && (
        <IcsImportModal
          onClose={() => setShowIcsImport(false)}
          onImport={(events, category, filename) => {
            dispatch({ type: 'ADD_CAL_EVENTS', events, category, filename });
            setShowIcsImport(false);
          }}
        />
      )}
    </div>
  );
}
