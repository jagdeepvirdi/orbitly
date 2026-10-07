import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { USERS } from '../../data/users';
import { APP_TODAY, formatDate } from '../../utils/dateUtils';
import { ACCENT_SWATCHES } from '../../utils/colorUtils';

const SECTION_LABELS = {
  today: 'Today', calendar: 'Calendar', learning: 'Learning', tasks: 'Tasks',
  health: 'Health', birthdays: 'Birthdays & Anniversaries', finance: 'Finance', festivals: 'Festivals', sports: 'Sports',
  hobby: 'Hobby', food: 'Food', home: 'Home', family: 'Family', settings: 'Settings',
};

function useAiStatus() {
  const [status, setStatus] = useState(null); // null = unknown
  useEffect(() => {
    fetch('/api/extract/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ anyActive: false, ollama: { active: false }, gemini: { active: false } }));
  }, []);
  return status;
}

export default function TopBar() {
  const { state, dispatch } = useAppStore();
  const user = USERS[state.userId] || USERS.jagdeep;
  const aiStatus = useAiStatus();
  const isMobile = state.isMobile;

  const aiTitle = (() => {
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
  })();
  const aiDotColor = (() => {
    if (!aiStatus) return '#6b7280';
    if (aiStatus.gemini?.state === 'quota_exceeded' && !aiStatus.ollama?.active) return '#f59e0b';
    if (aiStatus.anyActive) return '#34d399';
    return '#ef4444';
  })();

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16,
      padding: isMobile ? '14px 16px' : '18px 34px',
      background: 'var(--bar)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
          textTransform: 'uppercase', color: 'var(--accent)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {SECTION_LABELS[state.section] || 'Today'}
        </div>
        <div style={{
          fontSize: 13, color: 'var(--text-3)', marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {isMobile ? formatDate(APP_TODAY) : `${formatDate(APP_TODAY)} · Bangkok`}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10 }}>
        {/* Accent picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 6 }} title="Your accent">
          {ACCENT_SWATCHES.map(color => {
            const active = state.accent === color;
            const base = isMobile ? 9 : 12;
            const activeSize = isMobile ? 11 : 15;
            return (
              <button
                key={color}
                onClick={() => dispatch({ type: 'SET_ACCENT', color })}
                aria-label={`Set accent ${color}`}
                style={{
                  width: active ? activeSize : base, height: active ? activeSize : base, borderRadius: '50%',
                  border: 'none', cursor: 'pointer', padding: 0, background: color,
                  boxShadow: active
                    ? `0 0 0 2px var(--surface-solid), 0 0 0 4px ${color}`
                    : '0 0 0 1px rgba(255,255,255,0.14)',
                  transition: 'all .15s',
                }}
              />
            );
          })}
        </div>

        {/* Search */}
        {isMobile ? (
          <button
            aria-label="Search"
            style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
            </svg>
          </button>
        ) : (
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
            <span>Search Mosaic Life…</span>
            <span style={{
              marginLeft: 'auto', fontSize: 11,
              border: '1px solid var(--border)', borderRadius: 5, padding: '1px 5px',
            }}>⌘K</span>
          </div>
        )}

        {/* AI status indicator */}
        <button
          onClick={() => {
            dispatch({ type: 'SET_SECTION', section: 'settings' });
            dispatch({ type: 'SET_SETTINGS_TAB', tab: 'connections' });
          }}
          title={aiTitle}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: isMobile ? 0 : 6,
            width: isMobile ? 38 : undefined, height: isMobile ? 38 : undefined,
            padding: isMobile ? 0 : '6px 11px', borderRadius: 11, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-2)',
            transition: 'all .15s',
            position: 'relative', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
        >
          {/* AI icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          {!isMobile && <span>AI</span>}
          {/* Status dot */}
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            position: isMobile ? 'absolute' : 'static',
            top: isMobile ? 7 : undefined, right: isMobile ? 7 : undefined,
            border: isMobile ? '2px solid var(--surface-solid)' : 'none',
            background: aiDotColor,
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
          position: 'relative', flexShrink: 0,
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
          </svg>
          <span style={{
            position: 'absolute', top: 8, right: 9,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid var(--surface-solid)',
          }} />
        </button>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: isMobile ? 0 : 4, flexShrink: 0 }}>
          <div
            title={user.name}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              border: '2px solid var(--accent)',
              background: 'var(--accent)', color: '#fff',
              fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 0 3px var(--surface-solid)`,
            }}
          >
            {user.initials}
          </div>
        </div>
      </div>
    </div>
  );
}
