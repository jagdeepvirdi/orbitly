import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
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

// ─── Category styles ──────────────────────────────────────────────────────────

const CAT_STYLE = {
  gurpurab:      { bg: 'linear-gradient(120deg,rgba(212,175,55,0.14),rgba(99,102,241,0.06))',  border: 'rgba(212,175,55,0.35)', label: 'Gurpurab',        color: '#fde68a' },
  shahidi:       { bg: 'linear-gradient(120deg,rgba(239,68,68,0.10),rgba(168,85,247,0.06))',   border: 'rgba(239,68,68,0.28)',  label: 'Shaheedi Diwas',  color: '#fca5a5' },
  cultural:      { bg: 'linear-gradient(120deg,rgba(245,158,11,0.12),rgba(212,175,55,0.06))',  border: 'rgba(245,158,11,0.28)', label: 'Cultural',         color: '#fcd34d' },
  indian:        { bg: 'linear-gradient(120deg,rgba(255,153,51,0.12),rgba(19,136,8,0.06))',    border: 'rgba(255,153,51,0.32)', label: '🇮🇳 Indian',       color: '#fdba74' },
  thai:          { bg: 'linear-gradient(120deg,rgba(220,38,38,0.10),rgba(30,64,175,0.06))',    border: 'rgba(220,38,38,0.22)',  label: '🇹🇭 Thai',         color: '#fca5a5' },
  christian:     { bg: 'linear-gradient(120deg,rgba(59,130,246,0.12),rgba(147,197,253,0.06))', border: 'rgba(59,130,246,0.30)', label: '✝️ Christian',     color: '#93c5fd' },
  jain:          { bg: 'linear-gradient(120deg,rgba(167,139,250,0.12),rgba(19,136,8,0.06))',   border: 'rgba(167,139,250,0.30)',label: '🔱 Jain',           color: '#c4b5fd' },
  hindu:         { bg: 'linear-gradient(120deg,rgba(245,158,11,0.12),rgba(212,175,55,0.06))',  border: 'rgba(245,158,11,0.28)', label: '🕉️ Hindu',          color: '#fcd34d' },
  islamic:       { bg: 'linear-gradient(120deg,rgba(52,211,153,0.12),rgba(16,185,129,0.06))',  border: 'rgba(52,211,153,0.30)', label: '☪️ Islamic',        color: '#a7f3d0' },
  'thai-buddhist':{ bg: 'linear-gradient(120deg,rgba(167,139,250,0.12),rgba(19,136,8,0.06))',   border: 'rgba(167,139,250,0.30)',label: '🙏 Buddhist',      color: '#c4b5fd' },
  custom:        { bg: 'linear-gradient(120deg,rgba(156,163,175,0.12),rgba(107,114,128,0.06))',border: 'rgba(156,163,175,0.30)',label: '⭐ Custom',         color: '#e5e7eb' },
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
  const cs   = CAT_STYLE[item.cat] || CAT_STYLE.custom;
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
  const { state } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [showPast, setShowPast] = useState(false);
  const [dbRows, setDbRows] = useState([]);

  const activeSubs = state.subscribedCalendars || [];

  // Load all festivals from the DB
  useEffect(() => {
    fetch('/api/festivals')
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
      .then(rows => setDbRows(Array.isArray(rows) ? rows : []));
  }, []);

  // DB rows → display items
  const allEvents = useMemo(() => {
    return dbRows.map(r => {
      const d = parseDate(r.event_date);
      const ds = r.event_date.slice(0, 10);
      return {
        id: r.id,
        name: r.name,
        date: d,
        dateStr: ds,
        cat: r.cat || r.calendar,
        emoji: r.emoji || '📅',
        action: r.action,
        reminder: r.reminder,
        desc: r.description,
        calendar: r.calendar,
        _days: daysFrom(d)
      };
    });
  }, [dbRows]);

  // Filter based on user's subscribed calendars in Settings
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      // Custom events are always shown
      if (e.calendar === 'custom' || !e.calendar) return true;
      // Map database calendar back to subscription ID (e.g. indian -> IN, thai -> TH)
      const packId = e.calendar === 'indian' ? 'IN' : (e.calendar === 'thai' ? 'TH' : e.calendar);
      return activeSubs.includes(packId);
    });
  }, [allEvents, activeSubs]);

  // Compute tabs dynamically from active subscriptions
  const availableTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: 'All upcoming', count: filteredEvents.filter(e => e._days >= 0).length }];

    if (activeSubs.includes('sikh')) {
      const count = filteredEvents.filter(e => e.calendar === 'sikh' && e._days >= 0).length;
      tabs.push({ id: 'sikh', label: `🪯 Sikh (${count})`, count });
    }
    if (activeSubs.includes('IN')) {
      const count = filteredEvents.filter(e => e.calendar === 'indian' && e._days >= 0).length;
      tabs.push({ id: 'indian', label: `🇮🇳 Indian (${count})`, count });
    }
    if (activeSubs.includes('TH')) {
      const count = filteredEvents.filter(e => e.calendar === 'thai' && e._days >= 0).length;
      tabs.push({ id: 'thai', label: `🇹🇭 Thai (${count})`, count });
    }
    if (activeSubs.includes('christian')) {
      const count = filteredEvents.filter(e => e.calendar === 'christian' && e._days >= 0).length;
      tabs.push({ id: 'christian', label: `✝️ Christian (${count})`, count });
    }
    if (activeSubs.includes('jain')) {
      const count = filteredEvents.filter(e => e.calendar === 'jain' && e._days >= 0).length;
      tabs.push({ id: 'jain', label: `🔱 Jain (${count})`, count });
    }
    if (activeSubs.includes('hindu')) {
      const count = filteredEvents.filter(e => e.calendar === 'hindu' && e._days >= 0).length;
      tabs.push({ id: 'hindu', label: `🕉️ Hindu (${count})`, count });
    }
    if (activeSubs.includes('islamic')) {
      const count = filteredEvents.filter(e => e.calendar === 'islamic' && e._days >= 0).length;
      tabs.push({ id: 'islamic', label: `☪️ Islamic (${count})`, count });
    }
    if (activeSubs.includes('thai-buddhist')) {
      const count = filteredEvents.filter(e => e.calendar === 'thai-buddhist' && e._days >= 0).length;
      tabs.push({ id: 'thai-buddhist', label: `🙏 Buddhist (${count})`, count });
    }

    return tabs;
  }, [filteredEvents, activeSubs]);

  // Reset tab filter if the selected calendar is unsubscribed
  useEffect(() => {
    if (!availableTabs.some(t => t.id === filter)) {
      setFilter('all');
    }
  }, [availableTabs, filter]);

  // Get displayed events for the active tab
  const displayedEvents = useMemo(() => {
    let items = filteredEvents;
    if (filter !== 'all') {
      items = items.filter(e => e.calendar === filter);
    }
    return items
      .filter(e => showPast || e._days >= 0)
      .sort((a, b) => a._days - b._days);
  }, [filteredEvents, filter, showPast]);

  return (
    <div>
      {/* Header Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableTabs.map(tab => (
            <Pill
              key={tab.id}
              label={tab.label}
              active={filter === tab.id}
              onClick={() => setFilter(tab.id)}
            />
          ))}
        </div>
        <button
          onClick={() => setShowPast(p => !p)}
          style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: showPast ? 'rgba(99,102,241,0.12)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: showPast ? 'var(--text)' : 'var(--text-3)' }}
        >
          {showPast ? '✓ Showing past' : 'Show past'}
        </button>
      </div>

      {displayedEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 14 }}>
          No events in this category.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 13 }}>
          {displayedEvents.map((item, i) => <FestivalCard key={item.id || i} item={item} />)}
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
