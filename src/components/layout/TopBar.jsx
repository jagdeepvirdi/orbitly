import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { USERS } from '../../data/users';
import { APP_TODAY, formatDate } from '../../utils/dateUtils';

const SECTION_LABELS = {
  today: 'Today', calendar: 'Calendar', learning: 'Learning', tasks: 'Tasks',
  health: 'Health', birthdays: 'Birthdays & Anniversaries', finance: 'Finance', festivals: 'Festivals', sports: 'Sports', family: 'Family', settings: 'Settings',
};

function useAiStatus() {
  const [status, setStatus] = useState(null); // null = unknown
  useEffect(() => {
    fetch('http://localhost:3003/api/extract/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ anyActive: false, ollama: { active: false }, gemini: { active: false } }));
  }, []);
  return status;
}

export default function TopBar() {
  const { state, dispatch } = useAppStore();
  const allUsers = Object.values(USERS);
  const aiStatus = useAiStatus();

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '18px 34px',
      background: 'var(--bar)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: 'var(--accent)',
        }}>
          {SECTION_LABELS[state.section] || 'Today'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 1 }}>
          {formatDate(APP_TODAY)} · Bangkok
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 13px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, color: 'var(--text-3)', fontSize: 13,
          cursor: 'text', minWidth: 180,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
          </svg>
          <span>Search Orbitly…</span>
          <span style={{
            marginLeft: 'auto', fontSize: 11,
            border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px',
          }}>⌘K</span>
        </div>

        {/* AI status indicator */}
        <button
          onClick={() => {
            dispatch({ type: 'SET_SECTION', section: 'settings' });
            dispatch({ type: 'SET_SETTINGS_TAB', tab: 'connections' });
          }}
          title={(() => {
            if (!aiStatus) return 'AI status: checking…';
            const o = aiStatus.ollama;
            const g = aiStatus.gemini;
            const parts = [];
            if (o?.active) parts.push(`Ollama (${o.model}) active`);
            else parts.push('Ollama offline');
            if (g?.state === 'active') parts.push(`Gemini ${g.used}/${g.limit} used today`);
            else if (g?.state === 'quota_exceeded') parts.push('Gemini quota exceeded — Ollama is primary');
            else if (g?.state === 'rate_limited')   parts.push('Gemini rate-limited (temporary)');
            else if (g?.state === 'invalid_key')    parts.push('Gemini key invalid');
            else if (g?.state === 'unconfigured')   parts.push('Gemini not configured');
            return parts.join(' · ') + ' — click for details';
          })()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 11px', borderRadius: 11, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-2)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
        >
          {/* AI icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span>AI</span>
          {/* Status dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: (() => {
              if (!aiStatus) return '#6b7280';
              if (aiStatus.gemini?.state === 'quota_exceeded' && !aiStatus.ollama?.active) return '#f59e0b';
              if (aiStatus.anyActive) return '#34d399';
              return '#ef4444';
            })(),
            boxShadow: aiStatus?.anyActive ? '0 0 5px #34d399' : 'none',
            transition: 'background .4s, box-shadow .4s',
          }} />
        </button>

        {/* Bell */}
        <button style={{
          width: 38, height: 38, borderRadius: 11,
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--text-2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
          </svg>
          <span style={{
            position: 'absolute', top: 8, right: 9,
            width: 7, height: 7, borderRadius: '50%',
            background: '#f43f5e', border: '2px solid var(--surface-solid)',
          }} />
        </button>

        {/* User avatars */}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 4 }}>
          {allUsers.map((u, i) => (
            <button
              key={u.id}
              onClick={() => dispatch({ type: 'SET_USER', id: u.id })}
              title={u.name}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: `2px solid ${u.id === state.userId ? u.accent : 'var(--surface-solid)'}`,
                background: u.accent, color: '#fff',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                marginLeft: -8, zIndex: 10 - i,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {u.initials}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
