import { useAppStore } from '../../store/appStore';

const TABS = [
  {
    id: 'today', label: 'Today',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>',
  },
  {
    id: 'calendar', label: 'Calendar',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></svg>',
  },
  {
    id: 'tasks', label: 'Tasks',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  },
  {
    id: 'health', label: 'Health',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
  },
  {
    id: 'family', label: 'Family',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.2"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h3A4.5 4.5 0 0 1 15 18.5V20M15.5 20v-1a3.5 3.5 0 0 1 3.5-3.5h0a2 2 0 0 1 2 2V20"/></svg>',
  },
];

export default function BottomTabBar() {
  const { state, dispatch } = useAppStore();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
      display: 'flex', justifyContent: 'space-around',
      padding: 'calc(9px + env(safe-area-inset-bottom)) 6px 9px',
      background: 'var(--bar)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
    }}>
      {TABS.map(tab => {
        const active = state.section === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_SECTION', section: tab.id })}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              flex: 1, padding: 4, background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
              color: active ? 'var(--accent)' : 'var(--text-3)',
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: tab.icon }} style={{ display: 'flex' }} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
