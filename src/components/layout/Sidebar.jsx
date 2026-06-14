import { useAppStore } from '../../store/appStore';
import { USERS } from '../../data/users';

const ICON = {
  today: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
  calendar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>',
  learning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
  tasks: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  health: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
  birthdays: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 20H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2z"/><path d="M2 14h20M12 10V7M8 10V8M16 10V8"/><path d="M8 7c0-1.1.9-2 2-2s2 .9 2 2M12 7c0-1.1.9-2 2-2s2 .9 2 2"/></svg>',
  finance: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><circle cx="16.5" cy="15" r="1.4" fill="currentColor" stroke="none"/></svg>',
  festivals: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 2l2.4 5 5.6.5-4.2 3.7 1.3 5.5L12 19l-5.1 2.7 1.3-5.5L4 12.5 9.6 12z"/></svg>',
  sports: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 3h12v6a6 6 0 0 1-12 0V3zM9 21h6M12 15v6"/></svg>',
  family: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20M15.5 20v-1a3.5 3.5 0 0 1 3.5-3.5h0a2 2 0 0 1 2 2V20"/></svg>',
  hobby: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  food: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>',
  settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.7.65 1.65 1.65 0 0 0-1.01 1.51V22a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 8.5 20.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .65-2.7H4.5a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.01 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 11.5 3.6V3.5a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.01 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V11a1.65 1.65 0 0 0 1.51 1.01H22a2 2 0 0 1 0 4h-.09A1.65 1.65 0 0 0 19.4 15z"/></svg>',
  sun: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  moon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};

const NAV_DEFS = [
  ['today', 'Today'],
  ['calendar', 'Calendar'],
  ['learning', 'Learning'],
  ['tasks', 'Tasks'],
  ['health', 'Health'],
  ['birthdays', 'Birthdays'],
  ['finance', 'Finance'],
  ['festivals', 'Festivals'],
  ['sports', 'Sports'],
  ['hobby', 'Hobby'],
  ['food', 'Food'],
  ['family', 'Family'],
  ['settings', 'Settings'],
];

export default function Sidebar() {
  const { state, dispatch } = useAppStore();
  const user = USERS[state.userId];
  const allTasks = state.workTasks.concat(state.personalTasks);
  const incompleteTasks = allTasks.filter(t => t.status !== 'done').length;

  const navStyle = (id) => {
    const active = state.section === id;
    if (active) {
      return {
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, transition: 'background .15s, color .15s',
        background: 'var(--accent)', color: '#fff',
        boxShadow: '0 6px 16px var(--glow)',
      };
    }
    return {
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, transition: 'background .15s, color .15s',
      background: 'transparent', color: 'var(--text-2)',
    };
  };

  return (
    <aside style={{
      width: 248, flex: '0 0 248px', height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--sidebar)', borderRight: '1px solid var(--border)',
      padding: '20px 14px', zIndex: 2, overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 10px 18px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 11,
          background: 'linear-gradient(140deg,#6366f1,#a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(99,102,241,0.4)',
        }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" fill="#fff"/>
            <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" opacity="0.95"/>
            <ellipse cx="12" cy="12" rx="10" ry="4.4" stroke="#fff" strokeWidth="1.6" transform="rotate(60 12 12)" opacity="0.6"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: 23, fontWeight: 600, letterSpacing: '-0.01em' }}>Orbitly</div>
      </div>

      {/* User switcher */}
      <button
        onClick={() => dispatch({ type: 'CYCLE_USER' })}
        style={{
          display: 'flex', alignItems: 'center', gap: 11, width: '100%',
          padding: '9px 10px', marginBottom: 16,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, cursor: 'pointer', color: 'inherit', textAlign: 'left',
          transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: user.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, color: '#fff', flex: '0 0 32px',
        }}>
          {user.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.role}</div>
        </div>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
          <path d="M8 9l4-4 4 4M8 15l4 4 4-4"/>
        </svg>
      </button>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto' }}>
        {NAV_DEFS.map(([id, label]) => {
          const badge = id === 'tasks' ? incompleteTasks : 0;
          return (
            <button
              key={id}
              onClick={() => dispatch({ type: 'SET_SECTION', section: id })}
              style={navStyle(id)}
              onMouseEnter={e => { if (state.section !== id) e.currentTarget.style.background = 'var(--surface)'; }}
              onMouseLeave={e => { if (state.section !== id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', width: 20, height: 20, flex: '0 0 20px' }} dangerouslySetInnerHTML={{ __html: ICON[id] }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
              {badge > 0 && (
                <span style={{
                  fontSize: 10.5, fontWeight: 700, background: 'var(--accent)', color: '#fff',
                  borderRadius: 99, minWidth: 18, height: 18, padding: '0 5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 12px', marginTop: 10,
          background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 13, cursor: 'pointer', color: 'var(--text-2)',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span dangerouslySetInnerHTML={{ __html: state.theme === 'dark' ? ICON.sun : ICON.moon }} style={{ display: 'flex' }} />
        <span>{state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </button>
    </aside>
  );
}
