// Reusable curated emoji grid + free-type fallback for any emoji field in the app.
// Pass a domain-appropriate `options` list (see FINANCE_EMOJIS, HOME_EMOJIS, etc. in
// the sections that use this) — there's no single "right" set for every context.
export default function EmojiPicker({ value, onChange, options, size = 34 }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(em => (
          <button key={em} type="button" onClick={() => onChange(em)}
            style={{
              width: size, height: size, borderRadius: 9, fontSize: Math.round(size * 0.55),
              lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${value === em ? '#6366f1' : 'var(--border)'}`,
              background: value === em ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
              cursor: 'pointer',
            }}>
            {em}
          </button>
        ))}
      </div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={4}
        placeholder="or paste your own…"
        style={{
          marginTop: 8, width: 130, textAlign: 'center', fontSize: 18, padding: '7px 8px',
          borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
          color: 'var(--text)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
