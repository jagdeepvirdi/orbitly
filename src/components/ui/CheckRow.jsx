export default function CheckRow({ done, onToggle, label, sublabel, tagLabel, tagBg, tagColor, accent = '#10b981' }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, width: '100%',
        padding: '10px 10px', margin: '0 -10px', borderRadius: 12,
        border: 'none', background: 'transparent', cursor: 'pointer',
        fontFamily: 'inherit', transition: 'background .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{
        flex: '0 0 22px', width: 22, height: 22, borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .2s',
        border: `2px solid ${done ? accent : 'var(--border-strong)'}`,
        background: done ? accent : 'transparent',
      }}>
        {done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" style={{ animation: 'om-pop .3s ease' }}>
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        )}
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>
        <span style={{
          display: 'block', fontSize: 14, fontWeight: 600,
          ...(done ? { textDecoration: 'line-through', color: 'var(--text-3)' } : {}),
        }}>{label}</span>
        {sublabel && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)' }}>{sublabel}</span>}
      </span>
      {tagLabel && (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
          background: tagBg, color: tagColor,
        }}>
          {tagLabel}
        </span>
      )}
    </button>
  );
}
