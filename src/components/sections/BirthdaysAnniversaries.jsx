import { useState, useMemo } from 'react';
import { useAppStore } from '../../store/appStore';
import { APP_TODAY, fmtBday, nextBdayDays } from '../../utils/dateUtils';

function urgentColor(days) {
  return days === 0 ? '#34d399' : days <= 7 ? '#ef4444' : days <= 21 ? '#f59e0b' : '#6c6c80';
}

function nextEventDays(m, d) {
  const now = APP_TODAY;
  const y   = now.getFullYear();
  let next  = new Date(y, m - 1, d);
  const today = new Date(y, now.getMonth(), now.getDate());
  if (next < today) next = new Date(y + 1, m - 1, d);
  return Math.round((next - today) / 86400000);
}

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

function Section({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: accent, marginBottom: 12, paddingLeft: 2 }}>
        {label}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

function BirthdayCard({ person }) {
  const days   = nextBdayDays(person.bday);
  const isTod  = days === 0;
  const soon   = days <= 7;
  const accent = person.side === 'sahmbi' ? '#fb7185' : '#a5b4fc';

  return (
    <div style={{
      borderRadius: 18, padding: '16px 18px',
      border: `1px solid ${isTod ? 'rgba(16,185,129,0.4)' : soon ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      background: isTod ? 'rgba(16,185,129,0.08)' : 'var(--surface)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flex: '0 0 42px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, fontWeight: 800,
        background: person.side === 'sahmbi' ? 'rgba(244,63,94,0.15)' : 'rgba(99,102,241,0.15)',
        color: accent,
      }}>
        {person.petName.charAt(0).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {person.petName}
          {person.petName !== person.realName && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginLeft: 6 }}>{person.realName}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {person.relation && <span>{person.relation} · </span>}
          🎂 {fmtBday(person.bday)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: urgentColor(days), fontVariantNumeric: 'tabular-nums' }}>
          {isTod ? '🎉' : days}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{isTod ? 'Today!' : 'days'}</div>
      </div>
    </div>
  );
}

function AnniversaryCard({ ev }) {
  const days  = nextEventDays(ev.m, ev.d);
  const icon  = ev.type === 'engagement' ? '💍' : ev.type === 'court' ? '⚖️' : '💑';
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{
      borderRadius: 18, padding: '14px 18px',
      border: `1px solid ${days <= 7 ? 'rgba(168,85,247,0.35)' : 'var(--border)'}`,
      background: 'var(--surface)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flex: '0 0 42px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, background: 'rgba(168,85,247,0.14)',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{ev.label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {ev.type === 'court' ? 'Court Marriage' : ev.type === 'engagement' ? 'Engagement' : 'Anniversary'} · {months[ev.m]} {ev.d}
        </div>
      </div>
      <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: urgentColor(days), fontVariantNumeric: 'tabular-nums' }}>
          {days === 0 ? '🎉' : days}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{days === 0 ? 'Today!' : 'days'}</div>
      </div>
    </div>
  );
}

export default function BirthdaysAnniversaries() {
  const { state } = useAppStore();
  const { familyMembers, familyEvents } = state;
  const [side, setSide] = useState('all');

  const people = useMemo(() => {
    let list = familyMembers.filter(m => m.bday);
    if (side !== 'all') list = list.filter(m => m.side === side);
    return list.map(m => ({ ...m, _days: nextBdayDays(m.bday) })).sort((a, b) => a._days - b._days);
  }, [familyMembers, side]);

  const events = useMemo(() => {
    let list = familyEvents;
    if (side !== 'all') list = list.filter(e => e.side === side);
    return list.map(e => ({ ...e, _days: nextEventDays(e.m, e.d) })).sort((a, b) => a._days - b._days);
  }, [familyEvents, side]);

  const todayBdays = people.filter(p => p._days === 0);
  const soonBdays  = people.filter(p => p._days > 0 && p._days <= 30);
  const laterBdays = people.filter(p => p._days > 30);

  const todayEvents = events.filter(e => e._days === 0);
  const soonEvents  = events.filter(e => e._days > 0 && e._days <= 30);
  const laterEvents = events.filter(e => e._days > 30);

  const totalSahmbi = familyMembers.filter(m => m.side === 'sahmbi' && m.bday).length;
  const totalVirdi  = familyMembers.filter(m => m.side === 'virdi'  && m.bday).length;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '26px 34px 60px' }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 26, flexWrap: 'wrap' }}>
        <Pill label={`All (${totalSahmbi + totalVirdi})`} active={side === 'all'}    onClick={() => setSide('all')} />
        <Pill label={`🌸 Sahmbi (${totalSahmbi})`}        active={side === 'sahmbi'} onClick={() => setSide('sahmbi')} />
        <Pill label={`🏠 Virdi (${totalVirdi})`}          active={side === 'virdi'}  onClick={() => setSide('virdi')} />
      </div>

      {/* Today */}
      {(todayBdays.length > 0 || todayEvents.length > 0) && (
        <Section label="🎉 Today" accent="#34d399">
          {todayBdays.map(p => <BirthdayCard key={p.id} person={p} />)}
          {todayEvents.map(e => <AnniversaryCard key={e.id} ev={e} />)}
        </Section>
      )}

      {/* Next 30 days */}
      {(soonBdays.length > 0 || soonEvents.length > 0) && (
        <Section label="📅 Next 30 days" accent="#f59e0b">
          {[
            ...soonBdays.map(p => ({ _type: 'bday', _days: p._days, p })),
            ...soonEvents.map(e => ({ _type: 'ev',   _days: e._days, e })),
          ]
            .sort((a, b) => a._days - b._days)
            .map((item, i) =>
              item._type === 'bday'
                ? <BirthdayCard   key={i} person={item.p} />
                : <AnniversaryCard key={i} ev={item.e} />
            )}
        </Section>
      )}

      {/* Anniversaries (later) */}
      {laterEvents.length > 0 && (
        <Section label="💑 Anniversaries" accent="#a855f7">
          {laterEvents.map(e => <AnniversaryCard key={e.id} ev={e} />)}
        </Section>
      )}

      {/* All birthdays */}
      {laterBdays.length > 0 && (
        <Section label="🎂 All Birthdays" accent="#6366f1">
          {laterBdays.map(p => <BirthdayCard key={p.id} person={p} />)}
        </Section>
      )}
    </div>
  );
}
