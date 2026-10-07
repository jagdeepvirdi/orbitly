import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { NAV_ICONS, NAV_DEFS, UTILITY_ICONS } from '../../data/navConfig';
import { useClerk } from '@clerk/clerk-react';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const FIXED_IDS = ['today', 'calendar', 'tasks', 'health'];
const FIXED_TABS = NAV_DEFS.filter(([id]) => FIXED_IDS.includes(id));
const MORE_SECTIONS = NAV_DEFS.filter(([id]) => !FIXED_IDS.includes(id));

function SignOutBtn() {
  const { signOut } = useClerk();
  return (
    <button
      onClick={() => signOut()}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
        padding: '11px 12px',
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: 13, cursor: 'pointer', color: 'var(--text-3)',
        fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: UTILITY_ICONS.signOut }} style={{ display: 'flex' }} />
      <span>Sign out</span>
    </button>
  );
}

function TabButton({ id, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        flex: 1, padding: 4, background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit',
        color: active ? 'var(--accent)' : 'var(--text-3)',
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: NAV_ICONS[id] }} style={{ display: 'flex' }} />
      <span style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

export default function BottomTabBar() {
  const { state, dispatch } = useAppStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMoreActive = !FIXED_IDS.includes(state.section);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setSheetOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen]);

  const goTo = (section) => {
    dispatch({ type: 'SET_SECTION', section });
    setSheetOpen(false);
  };

  return (
    <>
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        display: 'flex', justifyContent: 'space-around',
        padding: 'calc(9px + env(safe-area-inset-bottom)) 6px 9px',
        background: 'var(--bar)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border)',
      }}>
        {FIXED_TABS.map(([id, label]) => (
          <TabButton
            key={id} id={id} label={label}
            active={state.section === id}
            onClick={() => dispatch({ type: 'SET_SECTION', section: id })}
          />
        ))}
        <button
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            flex: 1, padding: 4, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
            color: isMoreActive ? 'var(--accent)' : 'var(--text-3)',
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: UTILITY_ICONS.more }} style={{ display: 'flex' }} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>More</span>
        </button>
      </nav>

      {/* Backdrop */}
      <div
        onClick={() => setSheetOpen(false)}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 35,
          background: 'rgba(0,0,0,0.5)',
          opacity: sheetOpen ? 1 : 0,
          pointerEvents: sheetOpen ? 'auto' : 'none',
          transition: 'opacity .25s ease',
        }}
      />

      {/* More sheet */}
      <div role="dialog" aria-modal="true" aria-label="More sections" aria-hidden={!sheetOpen} inert={!sheetOpen} style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 36,
        visibility: sheetOpen ? 'visible' : 'hidden',
        maxHeight: '78vh', overflowY: 'auto',
        background: 'var(--surface-solid)',
        borderTop: '1px solid var(--border)',
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        padding: '10px 20px calc(20px + env(safe-area-inset-bottom))',
        boxShadow: '0 -12px 30px rgba(0,0,0,0.35)',
        transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: sheetOpen ? 'transform .28s cubic-bezier(.32,.72,0,1)' : 'transform .28s cubic-bezier(.32,.72,0,1), visibility 0s linear .28s',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--border-strong)', margin: '6px auto 18px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {MORE_SECTIONS.map(([id, label]) => {
            const active = state.section === id;
            return (
              <button
                key={id}
                onClick={() => goTo(id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '12px 4px', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', color: active ? 'var(--accent)' : 'var(--text-2)',
                }}
              >
                <span style={{
                  width: 46, height: 46, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: active ? 'var(--accent)' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--text-2)',
                }}>
                  <span dangerouslySetInnerHTML={{ __html: NAV_ICONS[id] }} style={{ display: 'flex' }} />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center' }}>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '18px 0 12px' }} />

        <button
          onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 12px', marginBottom: 8,
            background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 13, cursor: 'pointer', color: 'var(--text-2)',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500,
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: state.theme === 'dark' ? UTILITY_ICONS.sun : UTILITY_ICONS.moon }} style={{ display: 'flex' }} />
          <span>{state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {CLERK_KEY && <SignOutBtn />}
      </div>
    </>
  );
}
