import { useState, useEffect } from 'react';
import { useAppStore, CAT } from '../../store/appStore';
import { USERS } from '../../data/users';
import { api } from '../../api/client';
import { parseICS } from '../../utils/icsParser';
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
  const r = await fetch('/api/extract/status');
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

const CALENDAR_PACKS = [
  { id: 'IN',           flag: '🇮🇳', label: 'India',         desc: 'National public holidays (Nager API)',  color: '#fdba74' },
  { id: 'TH',           flag: '🇹🇭', label: 'Thailand',      desc: 'National public holidays (Nager API)',  color: '#fca5a5' },
  { id: 'hindu',        flag: '🕉️', label: 'Hindu',          desc: 'Diwali, Holi, Navratri, Maha Shivaratri & more (2026–2030)', color: '#fcd34d' },
  { id: 'sikh',         flag: '🪯', label: 'Sikh / Punjabi', desc: 'Gurpurabs, Vaisakhi, Hola Mohalla, Bandi Chhor Divas (2026–2030)', color: '#fb923c' },
  { id: 'islamic',      flag: '☪️', label: 'Islamic',         desc: 'Eid ul-Fitr, Eid ul-Adha, Ramadan, Mawlid — approximate dates (2026–2030)', color: '#34d399' },
  { id: 'thai-buddhist',flag: '🙏', label: 'Thai Buddhist',  desc: 'Makha Bucha, Visakha Bucha, Asalha Bucha, Khao Phansa, Ok Phansa (2026–2030)', color: '#c4b5fd' },
  { id: 'christian',    flag: '✝️', label: 'Christian',       desc: 'Easter, Christmas, Ash Wednesday, Pentecost & more (2026–2030)', color: '#93c5fd' },
  { id: 'jain',         flag: '🔱', label: 'Jain',            desc: 'Mahavir Jayanti, Paryushana, Samvatsari, Diwali & more (2026–2030)', color: '#a78bfa' },
];

function CalendarsTab() {
  const { state, dispatch } = useAppStore();
  const subscribed = state.subscribedCalendars || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Holiday Calendar Packs</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
          Toggle packs to show their holidays in the Calendar view and Festivals section.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px,1fr))', gap: 10 }}>
          {CALENDAR_PACKS.map(pack => {
            const on = subscribed.includes(pack.id);
            return (
              <div
                key={pack.id}
                onClick={() => {
                  dispatch({ type: 'TOGGLE_CALENDAR_PACK', calendarId: pack.id });
                  api.setCalendarSubscription(pack.id, !on).catch(() => {});
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 14, cursor: 'pointer',
                  border: `1px solid ${on ? `${pack.color}50` : 'var(--border)'}`,
                  background: on ? `${pack.color}12` : 'var(--surface)',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{pack.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: on ? pack.color : 'var(--text)' }}>{pack.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4 }}>{pack.desc}</div>
                </div>
                <div style={{
                  width: 36, height: 20, borderRadius: 99, flexShrink: 0,
                  background: on ? pack.color : 'var(--surface-2)',
                  border: `1px solid ${on ? 'transparent' : 'var(--border)'}`,
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: on ? 18 : 2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: on ? '#fff' : 'var(--text-3)',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
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
  const me = USERS.jagdeep;
  const [icsToast, setIcsToast]       = useState(false);
  const [showIcsImport, setShowIcsImport] = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteSent, setInviteSent]     = useState(false);
  const [inviteLink, setInviteLink]     = useState('');
  const [isSending, setIsSending]       = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const [icsUrl, setIcsUrl] = useState('');
  const [isValidatingFeed, setIsValidatingFeed] = useState(false);
  const [validateError, setValidateError] = useState('');
  const [syncingFeeds, setSyncingFeeds] = useState({});

  async function handleAddFeed() {
    if (!icsUrl.trim()) return;
    setValidateError('');
    setIsValidatingFeed(true);

    let url = icsUrl.trim();
    if (url.startsWith('webcal://')) {
      url = 'https://' + url.slice(9);
    } else if (!/^https?:\/\//i.test(url)) {
      setValidateError('URL must start with http://, https:// or webcal://');
      setIsValidatingFeed(false);
      return;
    }

    try {
      const res = await api.fetchProxyIcs(url);
      if (!res || !res.text) {
        throw new Error('No calendar content returned');
      }
      if (!res.text.includes('BEGIN:VCALENDAR')) {
        throw new Error('Invalid calendar format: missing BEGIN:VCALENDAR');
      }

      const nameMatch = res.text.match(/^X-WR-CALNAME(?:;[^:]*)?:(.+)$/im);
      const name = nameMatch ? nameMatch[1].trim() : 'Custom ICS Feed';

      const events = parseICS(res.text);

      const feedId = 'feed_' + Date.now();
      dispatch({ type: 'ADD_ICS_FEED', id: feedId, name, url });
      dispatch({ type: 'SYNC_ICS_FEED', id: feedId, events, lastSynced: new Date().toISOString() });

      setIcsUrl('');
    } catch (err) {
      setValidateError(err.message || 'Failed to fetch calendar feed');
    } finally {
      setIsValidatingFeed(false);
    }
  }

  async function handleSyncFeed(feed) {
    setSyncingFeeds(prev => ({ ...prev, [feed.id]: true }));
    try {
      let url = feed.url;
      if (url.startsWith('webcal://')) {
        url = 'https://' + url.slice(9);
      }
      const res = await api.fetchProxyIcs(url);
      if (res && res.text) {
        const events = parseICS(res.text);
        dispatch({
          type: 'SYNC_ICS_FEED',
          id: feed.id,
          events,
          lastSynced: new Date().toISOString()
        });
      } else {
        alert('Failed to sync feed: Empty response');
      }
    } catch (err) {
      alert(`Failed to sync feed: ${err.message || err}`);
    } finally {
      setSyncingFeeds(prev => ({ ...prev, [feed.id]: false }));
    }
  }

  useEffect(() => {
    if (tab === 'connections') {
      api.getPendingInvites().then(setPendingInvites).catch(() => {});
    }
  }, [tab]);

  async function handleSendInvite() {
    if (!inviteEmail.trim() || isSending) return;
    setIsSending(true);
    try {
      const { invite, inviteLink: link } = await api.createInvite({ email: inviteEmail.trim() });
      setInviteLink(link);
      setInviteEmail('');
      setInviteSent(true);
      setPendingInvites(prev => [...prev, invite]);
    } catch (e) {
      alert(e.message || 'Failed to create invite');
    } finally {
      setIsSending(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch {
      prompt('Copy this invite link:', inviteLink);
    }
  }

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
        {[['profiles', 'Profiles'], ['notifications', 'Notifications'], ['calendars', 'Calendars'], ['connections', 'Connections'], ['export', 'Export']].map(([key, label]) => (
          <TabBtn key={key} label={label} active={tab === key} onClick={() => dispatch({ type: 'SET_SETTINGS_TAB', tab: key })} />
        ))}
      </div>

      {/* PROFILES */}
      {tab === 'profiles' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Your Profile</div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 18,
              padding: 22, borderRadius: 20,
              border: `2px solid ${me.accent}`,
              background: me.accentSoft,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 19, background: me.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 800, color: '#fff', flex: '0 0 64px',
              }}>
                {me.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>{me.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10 }}>{me.role} · Bangkok (ICT)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', width: 'fit-content' }}>
                  <div style={{ width: 11, height: 11, borderRadius: '50%', background: me.accent }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: me.accent }}>Accent colour</span>
                </div>
              </div>
            </div>
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
          <div style={{ padding: '18px 22px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Gender</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>Used to personalise the Health tab (cycle tracker visibility)</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['male','Male'],['female','Female'],['other','Other'],['prefer-not-to-say','Prefer not to say']].map(([val, label]) => {
                const active = (state.userGender || 'prefer-not-to-say') === val;
                return (
                  <button key={val} type="button"
                    onClick={async () => {
                      dispatch({ type: 'SET_GENDER', gender: val });
                      try { await api.updateProfile({ gender: val, share_cycle_tracker: state.householdCycleShared }); } catch {}
                    }}
                    style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${active ? me.accent : 'var(--border)'}`, background: active ? `${me.accent}22` : 'var(--surface-2)', color: active ? me.accent : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: active ? 700 : 500 }}>
                    {label}
                  </button>
                );
              })}
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

      {/* CALENDARS */}
      {tab === 'calendars' && (
        <CalendarsTab />
      )}

      {/* CONNECTIONS */}
      {tab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* You */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '12px 22px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Your Account</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '17px 22px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: me.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {me.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700 }}>{me.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Owner · Bangkok (ICT, UTC+7)</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: me.accent }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: me.accent }}>You</span>
              </div>
            </div>
          </div>

          {/* Invite */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '12px 22px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Connect Family Members</div>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.6 }}>
                Invite your partner or a family member. Once they accept, you can choose what to share with each other — tasks, health summaries, calendar events, and more.
              </div>
              {inviteSent ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', marginBottom: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2"><path d="M20 6L9 17l-5-5"/></svg>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#34d399' }}>Invite created!</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                    Share this link — or add Resend API key to .env to send it by email automatically.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      flex: 1, padding: '9px 12px', borderRadius: 10, fontSize: 12,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', fontFamily: 'monospace',
                    }}>
                      {inviteLink}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      style={{
                        padding: '9px 16px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                        background: inviteLinkCopied ? 'rgba(16,185,129,0.15)' : 'var(--surface)',
                        color: inviteLinkCopied ? '#34d399' : 'var(--text)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {inviteLinkCopied ? '✓ Copied' : 'Copy link'}
                    </button>
                  </div>
                  <button
                    onClick={() => { setInviteSent(false); setInviteLink(''); }}
                    style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    + Invite another person
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="email"
                    placeholder="partner@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                    style={{
                      flex: 1, padding: '11px 15px', borderRadius: 12, fontSize: 14,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSendInvite}
                    disabled={isSending}
                    style={{
                      padding: '11px 20px', borderRadius: 12, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      whiteSpace: 'nowrap', opacity: isSending ? 0.7 : 1,
                    }}
                  >{isSending ? 'Creating…' : 'Send Invite'}</button>
                </div>
              )}
            </div>

            {/* Pending invites list */}
            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Pending Invites</div>
              {pendingInvites.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', color: 'var(--text-3)', fontSize: 13 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  No pending invites
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingInvites.map(inv => (
                    <div key={inv.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 11,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{inv.invitee_email}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
                          Sent {new Date(inv.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
                        background: 'rgba(245,158,11,0.12)', color: '#fcd34d',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}>
                        Pending
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <AiBackendsPanel />

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 6px' }} />

          <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-3)' }}>
            Connected Data Sources
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Calendar Packs Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>Calendar Packs</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    {state.subscribedCalendars?.length || 0} active pack{(state.subscribedCalendars?.length || 0) !== 1 ? 's' : ''} ({((state.subscribedCalendars || []).map(c => c.toUpperCase()).slice(0, 3).join(', ')) || 'none'})
                  </div>
                </div>
                <button
                  onClick={() => dispatch({ type: 'SET_SETTINGS_TAB', tab: 'calendars' })}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Manage Packs &rarr;
                </button>
              </div>
            </div>

            {/* Sports Subscriptions Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34M12 2a6 6 0 0 1 6 6c0 3.25-2.22 5.91-5.2 6.55A3.2 3.2 0 0 1 12 15a3.2 3.2 0 0 1-.8-.09C8.22 13.91 6 11.25 6 8a6 6 0 0 1 6-6z"/></svg>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>Sports Subscriptions</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Subscribed to {(state.sportSubscriptions || []).length} sport{(state.sportSubscriptions || []).length !== 1 ? 's' : ''} ({ (state.sportSubscriptions || []).map(s => s.sport.toUpperCase()).join(', ') || 'none' })
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('open-sports-manage', 'true');
                    dispatch({ type: 'SET_SECTION', section: 'sports' });
                  }}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Manage Sports &rarr;
                </button>
              </div>
            </div>

            {/* Recipe Sources Card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: 20, display: 'flex', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(132,204,22,0.12)', border: '1px solid rgba(132,204,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>Recipe Sources</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    TheMealDB Connected · Global cuisine library discovery database
                  </div>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem('open-food-discover', 'true');
                    dispatch({ type: 'SET_SECTION', section: 'food' });
                  }}
                  style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#84cc16', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Explore Recipes &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Custom Calendar Feeds Section */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '16px 22px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Custom Calendar Feeds</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Subscribe to external public calendars via ICS links</div>
            </div>
            
            <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Add Feed Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Add Public Calendar URL</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="https://calendar.google.com/calendar/ical/.../public/basic.ics"
                    value={icsUrl}
                    onChange={e => { setIcsUrl(e.target.value); setValidateError(''); }}
                    style={{
                      flex: 1, padding: '11px 15px', borderRadius: 12, fontSize: 14,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleAddFeed}
                    disabled={isValidatingFeed || !icsUrl.trim()}
                    style={{
                      padding: '11px 20px', borderRadius: 12, cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      opacity: (isValidatingFeed || !icsUrl.trim()) ? 0.6 : 1,
                      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6
                    }}
                  >
                    {isValidatingFeed ? 'Verifying...' : 'Add Feed'}
                  </button>
                </div>
                {validateError && (
                  <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                    ⚠️ {validateError}
                  </div>
                )}
              </div>

              {/* Saved Feeds List */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>Saved iCal/ICS Feeds</div>
                
                {(!state.icsFeeds || state.icsFeeds.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', border: '1px dashed var(--border)', borderRadius: 14, color: 'var(--text-3)', fontSize: 13.5 }}>
                    No custom calendar feeds added yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {state.icsFeeds.map(feed => {
                      const isSyncing = !!syncingFeeds[feed.id];
                      return (
                        <div key={feed.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <input
                            type="checkbox"
                            checked={feed.enabled}
                            onChange={() => dispatch({ type: 'TOGGLE_ICS_FEED', id: feed.id })}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                            title={feed.enabled ? "Disable feed" : "Enable feed"}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: feed.enabled ? 'var(--text)' : 'var(--text-3)' }}>
                              {feed.name}
                              {!feed.enabled && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 4, textTransform: 'uppercase', fontWeight: 700 }}>Disabled</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={feed.url}>
                              {feed.url.length > 50 ? feed.url.slice(0, 50) + '...' : feed.url}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                              Sync status: {feed.lastSynced ? `Synced ${new Date(feed.lastSynced).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Never synced'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                              onClick={() => handleSyncFeed(feed)}
                              disabled={isSyncing || !feed.enabled}
                              style={{
                                background: 'none', border: '1px solid var(--border)', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4,
                                opacity: (!feed.enabled || isSyncing) ? 0.5 : 1
                              }}
                              title="Sync now"
                            >
                              <svg style={{ animation: isSyncing ? 'spin 1.5s linear infinite' : 'none' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                              {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                            <button
                              onClick={() => dispatch({ type: 'DELETE_ICS_FEED', id: feed.id })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6 }}
                              title="Remove feed"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Manual File Import (Moved from export tab) */}
            <div style={{ padding: '18px 22px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>Manual Calendar File (.ics) Import</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Upload a static .ics file from your device to import events directly.</div>
                </div>
                <button
                  onClick={() => setShowIcsImport(true)}
                  style={{ padding: '9px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, border: '1px solid rgba(249,115,22,0.35)', background: 'rgba(249,115,22,0.12)', color: '#fdba74', whiteSpace: 'nowrap' }}
                >
                  Import File (.ics)
                </button>
              </div>

              {/* Import history inside Connections */}
              {(state.importHistory || []).length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Import History</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(state.importHistory || []).map(batch => (
                      <div key={batch.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT[batch.category] || '#6c6c80', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 600 }}>{batch.filename}</span>
                          <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>
                            ({batch.count} events · {batch.category})
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {new Date(batch.importedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <button
                          onClick={() => dispatch({ type: 'DELETE_CAL_BATCH', batchId: batch.id })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}
                          title="Remove import"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '14px 0 6px' }} />

          {/* Integrations Coming Soon Section */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
              Discover Integrations
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
              Connect Orbitly with your favorite services to automate workflows, sync data, and import habits.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {/* Google Calendar Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4285F4" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16h6"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Google Calendar</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Two-way calendar synchronization. View events and push Orbitly tasks directly to Google.
                  </div>
                </div>
              </div>

              {/* Apple Health Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Apple Health</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Auto-import step count, active minutes, sleep data, and heart rate metrics.
                  </div>
                </div>
              </div>

              {/* Strava Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fc4c02" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Strava</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Log outdoor runs, cycles, and hikes automatically to track fitness goals and habits.
                  </div>
                </div>
              </div>

              {/* Spotify Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1DB954" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12a14.7 14.7 0 0 1 8 0M9 9a18 18 0 0 1 6 0M9 15c1.8-.3 4.2-.3 6 0"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Spotify</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Embed currently playing music or custom study playlists in your dashboard.
                  </div>
                </div>
              </div>

              {/* Todoist Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e44332" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Todoist</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Sync task lists to import, edit, and check off Todoist tasks inside Orbitly Kanban.
                  </div>
                </div>
              </div>

              {/* Notion Card */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, opacity: 0.65, display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2"><path d="M4 4h16v16H4zM4 9h16M9 4v16"/></svg>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Notion</div>
                    <span style={{ fontSize: 9, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-3)', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>
                    Connect and read databases directly to power tables, lists, or custom dashboard logs.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <a
                href="mailto:jagdeep.singh.virdi@gmail.com?subject=Orbitly:%20Integration%20Request"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
              >
                Request an integration &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT / EXPORT */}
      {tab === 'export' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

          {/* Pro Plan */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Plan</div>
            <div style={{ padding: 22, borderRadius: 18, border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg, rgba(245,158,11,0.07) 0%, rgba(99,102,241,0.07) 100%)', display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(245,158,11,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 48px', fontSize: 24 }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Orbitly Pro</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Unlimited AI extractions, priority support, and future premium features</div>
              </div>
              <button
                onClick={() => window.open('mailto:jagdeep.singh.virdi@gmail.com?subject=Orbitly%20Pro%20Enquiry', '_blank')}
                style={{ padding: '11px 20px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.14)', color: '#fcd34d', whiteSpace: 'nowrap' }}
              >Enquire</button>
            </div>
          </div>

          {/* Legal */}
          <div style={{ paddingTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>Legal</div>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: 'var(--text-2)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>🔒</span> Privacy Policy
            </a>
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
