import { useAppStore } from '../../store/appStore';
import { USERS } from '../../data/users';
import { NAV_ICONS, NAV_DEFS, UTILITY_ICONS } from '../../data/navConfig';
import { useClerk } from '@clerk/clerk-react';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function SignOutBtn() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut()}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '10px 12px', marginTop: 6,
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: 13, cursor: 'pointer', color: 'var(--text-3)',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
      </svg>
      Sign out
    </button>
  );
}

const ICON = { ...NAV_ICONS, ...UTILITY_ICONS };

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 18px' }}>
        <img src="/mosaic-heart-logo.png" alt="Mosaic Life" style={{ width: 34, height: 34, objectFit: 'contain', flex: '0 0 34px' }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--text)' }}>Mosaic Life</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 8, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#1d98d9' }}>Everything.</span> <span style={{ color: '#86ba46' }}>Together.</span> <span style={{ color: '#fea91a' }}>Balanced.</span>
          </div>
        </div>
      </div>

      {/* User profile pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%',
        padding: '9px 10px', marginBottom: 16,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, color: 'inherit',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, color: '#fff', flex: '0 0 32px',
        }}>
          {user.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{user.role}</div>
        </div>
      </div>

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

      {CLERK_KEY && <SignOutBtn />}
    </aside>
  );
}
