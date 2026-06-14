export default function StatPill({ icon, value, label, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '9px 14px 9px 11px',
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 13, backdropFilter: 'blur(10px)',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
      }} dangerouslySetInnerHTML={{ __html: icon }} />
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}
