import { useState, useMemo, useEffect } from 'react';
import { INDIAN_HOLIDAYS, THAI_HOLIDAYS } from '../../data/holidayCalendar';
import { CHRISTIAN_HOLIDAYS } from '../../data/christianHolidays';
import { JAIN_HOLIDAYS } from '../../data/jainHolidays';
import { APP_TODAY } from '../../utils/dateUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysFrom(date) {
  const a = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate());
  return Math.round((date - a) / 86400000);
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function urgentColor(days) {
  if (days < 0)  return '#6c6c80';
  if (days === 0) return '#34d399';
  if (days <= 7)  return '#ef4444';
  if (days <= 21) return '#f59e0b';
  return '#6c6c80';
}

function daysStr(days) {
  if (days < 0)  return 'Passed';
  if (days === 0) return 'Today!';
  return String(days);
}

function parseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Convert static holiday arrays into displayable items
function toItems(arr, cat) {
  return arr.map(h => ({
    name:    h.name,
    date:    parseDate(h.date),
    dateStr: h.date,          // original ISO string — used for deduplication
    cat,
    emoji:   h.emoji || (cat === 'thai' ? '🇹🇭' : '🇮🇳'),
    action:  h.action  || null,
    reminder:h.reminder || null,
    desc:    null,
  }));
}

// ─── Category styles ──────────────────────────────────────────────────────────

const CAT_STYLE = {
  gurpurab:  { bg: 'linear-gradient(120deg,rgba(212,175,55,0.14),rgba(99,102,241,0.06))',  border: 'rgba(212,175,55,0.35)', label: 'Gurpurab',        color: '#fde68a' },
  shahidi:   { bg: 'linear-gradient(120deg,rgba(239,68,68,0.10),rgba(168,85,247,0.06))',   border: 'rgba(239,68,68,0.28)',  label: 'Shaheedi Diwas',  color: '#fca5a5' },
  cultural:  { bg: 'linear-gradient(120deg,rgba(245,158,11,0.12),rgba(212,175,55,0.06))',  border: 'rgba(245,158,11,0.28)', label: 'Cultural',         color: '#fcd34d' },
  indian:    { bg: 'linear-gradient(120deg,rgba(255,153,51,0.12),rgba(19,136,8,0.06))',    border: 'rgba(255,153,51,0.32)', label: '🇮🇳 Indian',       color: '#fdba74' },
  thai:      { bg: 'linear-gradient(120deg,rgba(220,38,38,0.10),rgba(30,64,175,0.06))',    border: 'rgba(220,38,38,0.22)',  label: '🇹🇭 Thai',         color: '#fca5a5' },
  christian: { bg: 'linear-gradient(120deg,rgba(59,130,246,0.12),rgba(147,197,253,0.06))', border: 'rgba(59,130,246,0.30)', label: '✝️ Christian',     color: '#93c5fd' },
  jain:      { bg: 'linear-gradient(120deg,rgba(167,139,250,0.12),rgba(196,181,253,0.06))',border: 'rgba(167,139,250,0.30)',label: '🔱 Jain',           color: '#c4b5fd' },
};

// ─── Filter pill ──────────────────────────────────────────────────────────────

function Pill({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 16px', borderRadius: 99, cursor: 'pointer', fontFamily: 'inherit',
      fontSize: 12.5, fontWeight: 700,
      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
      color: active ? 'var(--text)' : 'var(--text-3)',
    }}>{label}</button>
  );
}

// ─── Festival card ────────────────────────────────────────────────────────────

function FestivalCard({ item }) {
  const days = daysFrom(item.date);
  const cs   = CAT_STYLE[item.cat] || CAT_STYLE.indian;
  const rakhi = item.name === 'Raksha Bandhan' && days > 0 && days <= 21;

  return (
    <div style={{ borderRadius: 20, padding: '20px 20px 16px', border: `1px solid ${cs.border}`, background: cs.bg, display: 'flex', flexDirection: 'column', gap: 0, opacity: days < 0 ? 0.55 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 99, background: 'rgba(255,255,255,0.07)', color: cs.color }}>
              {cs.label}
            </span>
          </div>
          <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18, margin: 0, lineHeight: 1.25 }}>
            {item.emoji} {item.name}
          </h3>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: urgentColor(days) }}>
            {daysStr(days)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>days away</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginBottom: item.desc || item.action ? 8 : 0 }}>
        {fmtDate(item.date)}
      </div>
      {item.desc && (
        <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 6 }}>{item.desc}</div>
      )}
      {item.action && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2z"/></svg>
          {item.action}
        </div>
      )}
      {item.reminder && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>
          {item.reminder.startsWith('Reminder') ? item.reminder : `Reminder: ${item.reminder}`}
        </div>
      )}
      {rakhi && (
        <div style={{ marginTop: 8, padding: '7px 11px', borderRadius: 10, background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', fontSize: 12, fontWeight: 700, color: '#fda4af' }}>
          🎀 Rakhi Mode — order now!
        </div>
      )}
    </div>
  );
}

// ─── Main festivals tab ───────────────────────────────────────────────────────

function FestivalsTab() {
  const [filter,   setFilter]   = useState('all');
  const [showPast, setShowPast] = useState(false);
  const [dbRows,   setDbRows]   = useState([]);

  // Load all festivals (sikh + indian cultural) from the DB
  useEffect(() => {
    fetch('/api/festivals')
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then(rows => setDbRows(Array.isArray(rows) ? rows : []));
  }, []);

  // DB rows → display items
  const sikhItems = dbRows
    .filter(r => r.calendar === 'sikh')
    .map(r => ({ name: r.name, date: parseDate(r.event_date), cat: r.cat, emoji: r.emoji, action: r.action, reminder: r.reminder, desc: r.description }));

  const culturalItems = dbRows
    .filter(r => r.calendar === 'indian')
    .map(r => {
      const d = parseDate(r.event_date);
      const ds = r.event_date.slice(0, 10);
      return { name: r.name, date: d, dateStr: ds, cat: r.cat, emoji: r.emoji, action: r.action, reminder: r.reminder, desc: r.description };
    });
  const indianItems    = toItems(INDIAN_HOLIDAYS, 'indian');
  const thaiItems      = toItems(THAI_HOLIDAYS, 'thai');
  const christianItems = toItems(CHRISTIAN_HOLIDAYS, 'christian');
  const jainItems      = toItems(JAIN_HOLIDAYS, 'jain');

  // Merge & deduplicate: DB cultural items take priority over INDIAN_HOLIDAYS duplicates
  // Compare on original ISO dateStr to avoid timezone-shift bugs
  const culturalKeys = new Set(
    culturalItems
      .filter(i => i.dateStr)
      .map(i => `${i.dateStr}:${i.name.toLowerCase().slice(0, 10)}`)
  );
  // Also key on just the name-prefix to catch slight name differences (e.g. "Navratri begins" vs "Navratri")
  const culturalNames = new Set(culturalItems.map(i => i.name.toLowerCase().slice(0, 10)));
  const deduped = indianItems.filter(i => {
    const k = `${i.dateStr}:${i.name.toLowerCase().slice(0, 10)}`;
    return !culturalKeys.has(k) && !culturalNames.has(i.name.toLowerCase().slice(0, 10));
  });

  const all = useMemo(() => {
    const CAT_GROUPS = {
      sikh:      ['gurpurab', 'shahidi', 'cultural'],
      indian:    ['indian'],
      thai:      ['thai'],
      christian: ['christian'],
      jain:      ['jain'],
    };
    let items = [...sikhItems, ...culturalItems, ...deduped, ...thaiItems, ...christianItems, ...jainItems];
    if (filter !== 'all') {
      const allowed = CAT_GROUPS[filter] || [];
      items = items.filter(i => allowed.includes(i.cat));
    }
    return items
      .map(i => ({ ...i, _days: daysFrom(i.date) }))
      .filter(i => showPast || i._days >= 0)
      .sort((a, b) => a._days - b._days);
  }, [filter, showPast, dbRows]);

  const count = (cats) => {
    const base = [...sikhItems, ...culturalItems, ...deduped, ...thaiItems, ...christianItems, ...jainItems];
    return base.filter(i => cats.includes(i.cat) && daysFrom(i.date) >= 0).length;
  };

  const sikhCount      = count(['gurpurab','shahidi','cultural']);
  const indianCount    = count(['indian']);
  const thaiCount      = count(['thai']);
  const christianCount = count(['christian']);
  const jainCount      = count(['jain']);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Pill label={`All upcoming`}                   active={filter === 'all'}       onClick={() => setFilter('all')} />
          <Pill label={`🪯 Sikh (${sikhCount})`}        active={filter === 'sikh'}      onClick={() => setFilter('sikh')} />
          <Pill label={`🇮🇳 Indian (${indianCount})`}   active={filter === 'indian'}    onClick={() => setFilter('indian')} />
          <Pill label={`🇹🇭 Thai (${thaiCount})`}       active={filter === 'thai'}      onClick={() => setFilter('thai')} />
          <Pill label={`✝️ Christian (${christianCount})`} active={filter === 'christian'} onClick={() => setFilter('christian')} />
          <Pill label={`🔱 Jain (${jainCount})`}        active={filter === 'jain'}      onClick={() => setFilter('jain')} />
        </div>
        <button
          onClick={() => setShowPast(p => !p)}
          style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: showPast ? 'rgba(99,102,241,0.12)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: showPast ? 'var(--text)' : 'var(--text-3)' }}
        >
          {showPast ? '✓ Showing past' : 'Show past'}
        </button>
      </div>

      {all.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
          No upcoming events in this category.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 13 }}>
          {all.map((item, i) => <FestivalCard key={i} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function FestivalsRecurring() {
  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      <FestivalsTab />
    </div>
  );
}
