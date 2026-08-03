import { useState } from 'react';
import { useAppStore, CAT } from '../../store/appStore';
import { buildMonthGrid, buildWeekCells, buildBirthdayEvents, mergeCalEvents, DAY_AGENDA, MONTHS, WD } from '../../utils/calendarUtils';
import { APP_TODAY } from '../../utils/dateUtils';
import { useLiveHolidays } from '../../hooks/useLiveHolidays';
import { useLiveCricket } from '../../hooks/useLiveCricket';
import IcsImportModal from '../ui/IcsImportModal';

const CAT_LEGEND = [
  { label: 'Work', color: CAT.work },
  { label: 'Learning', color: CAT.learning },
  { label: 'Family', color: CAT.family },
  { label: 'Health', color: CAT.health },
  { label: 'Sports', color: CAT.sports },
  { label: 'Festival', color: CAT.festival },
  { label: 'Recurring', color: CAT.recurring },
  { label: 'Holiday', color: CAT.holiday },
  { label: 'Hobby', color: CAT.hobby },
  { label: 'Food', color: CAT.food },
  { label: 'Hindu', color: CAT.hindu },
  { label: 'Sikh', color: CAT.sikh },
  { label: 'Islamic', color: CAT.islamic },
  { label: 'Buddhist', color: CAT['thai-buddhist'] },
  { label: 'Christian', color: CAT.christian },
  { label: 'Jain', color: CAT.jain },
];

function ViewToggleBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 15px', borderRadius: 9, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
        background: active ? 'var(--accent)' : 'transparent',
        color: active ? '#fff' : 'var(--text-2)',
      }}
    >
      {label}
    </button>
  );
}

function buildHolidayEvents(holidays, year, month) {
  const events = {};
  holidays
    .filter(h => h.year === year && h.month === month)
    .forEach(h => {
      const d = h.day;
      if (!events[d]) events[d] = [];
      // Use calendarId for named packs so they get their accent color
      const cat = h.calendarId && !['IN', 'TH'].includes(h.calendarId) ? h.calendarId : 'holiday';
      events[d].push({ t: h.nameEn || h.name, c: cat });
    });
  return events;
}

function buildCricketEvents(matches, year, month) {
  const events = {};
  (matches || []).forEach(m => {
    if (!m.date) return;
    try {
      const dt = new Date(m.date);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const d = dt.getDate();
        if (!events[d]) events[d] = [];
        events[d].push({ t: m.match || 'Cricket', c: 'sports' });
      }
    } catch {}
  });
  return events;
}

function buildImportedEvtMap(imported, year, month) {
  const map = {};
  (imported || []).forEach(e => {
    if (!e.date) return;
    const [y, m, d] = e.date.split('-').map(Number);
    if (y === year && m - 1 === month) {
      if (!map[d]) map[d] = [];
      map[d].push({ t: e.title, c: e.category || 'recurring' });
    }
  });
  return map;
}

export default function CalendarView() {
  const { state, dispatch } = useAppStore();
  const mob = state.isMobile;
  const [showImport, setShowImport] = useState(false);

  const { holidays } = useLiveHolidays(state.subscribedCalendars || ['IN', 'TH'], state.calYear);
  const { matches: cricketMatches } = useLiveCricket();

  // Month view events — all DB/live-backed (birthdays, holidays, cricket, imported ICS); no static demo data
  const bdayEvents = buildBirthdayEvents(state.calYear, state.calMonth, state.familyMembers, state.familyEvents);
  const holidayEvents = buildHolidayEvents(holidays, state.calYear, state.calMonth);
  const cricketEvents = buildCricketEvents(cricketMatches, state.calYear, state.calMonth);
  const importedEvts  = buildImportedEvtMap(state.importedCalEvents, state.calYear, state.calMonth);
  const calEvents = mergeCalEvents(
    mergeCalEvents(mergeCalEvents(bdayEvents, holidayEvents), cricketEvents),
    importedEvts
  );

  // Week view always shows the real current week, so its birthday/holiday/cricket
  // lookups must use today's actual year/month — not a fixed month — to match.
  const weekYear = APP_TODAY.getFullYear();
  const weekMonth = APP_TODAY.getMonth();
  const weekBday = buildBirthdayEvents(weekYear, weekMonth, state.familyMembers, state.familyEvents);
  const weekHolidays = buildHolidayEvents(holidays, weekYear, weekMonth);
  const weekCricket = buildCricketEvents(cricketMatches, weekYear, weekMonth);
  const weekEvents = mergeCalEvents(
    mergeCalEvents(weekBday, weekHolidays),
    weekCricket
  );

  const calWeeks = buildMonthGrid(state.calYear, state.calMonth, calEvents, state.overlays);
  const weekCells = buildWeekCells(weekEvents, state.overlays);
  const dayAgenda = DAY_AGENDA.map(r => ({
    ...r,
    items: r.items.map(it => ({ ...it, bg: it.color + '1f' })),
  }));

  const overlayChips = [
    { key: 'festivals', label: 'Festivals', color: CAT.festival },
    { key: 'sports', label: 'Sports', color: CAT.sports },
    { key: 'holidays', label: 'Holidays', color: '#eab308' },
  ];

  return (
  <>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: mob ? '16px 12px 60px' : '26px 34px 60px' }}>

      {/* Reschedule banner */}
      {!state.rescheduleDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13, padding: '14px 18px', marginBottom: 20,
          borderRadius: 16,
          background: 'linear-gradient(100deg, rgba(168,85,247,0.16), rgba(99,102,241,0.1))',
          border: '1px solid rgba(168,85,247,0.3)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: 'rgba(168,85,247,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 34px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" strokeWidth="2">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Auto-rescheduled</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>
              "Claude 101 — Day 3" missed its Fri slot and moved to <strong>Mon 15 Jun</strong>. All later sessions shifted forward.
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'DISMISS_RESCHEDULE' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => dispatch({ type: 'CAL_NAV', dir: -1 })}
            style={{
              width: 34, height: 34, borderRadius: 10, background: 'var(--surface)',
              border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 27, margin: 0, minWidth: 185 }}>
            {MONTHS[state.calMonth]} {state.calYear}
          </h2>
          <button
            onClick={() => dispatch({ type: 'CAL_NAV', dir: 1 })}
            style={{
              width: 34, height: 34, borderRadius: 10, background: 'var(--surface)',
              border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex', gap: 3, padding: 4,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        }}>
          {['month', 'week', 'day'].map(v => (
            <ViewToggleBtn
              key={v}
              label={v.charAt(0).toUpperCase() + v.slice(1)}
              active={state.calView === v}
              onClick={() => dispatch({ type: 'SET_CAL_VIEW', view: v })}
            />
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Import ICS */}
        <button
          onClick={() => setShowImport(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 11,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Import .ics
        </button>

        {/* Overlay chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {overlayChips.map(c => {
            const on = state.overlays[c.key];
            return (
              <button
                key={c.key}
                onClick={() => dispatch({ type: 'TOGGLE_OVERLAY', key: c.key })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px',
                  borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${on ? c.color : 'var(--border)'}`,
                  background: on ? c.color + '22' : 'transparent',
                  color: on ? 'var(--text)' : 'var(--text-3)',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MONTH VIEW */}
      {state.calView === 'month' && (
        <div style={{ overflowX: mob ? 'auto' : 'visible' }}>
        <div style={{
          border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden',
          background: 'var(--surface)', minWidth: mob ? 560 : 'unset',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
            {WD.map(wd => (
              <div key={wd} style={{
                padding: 11, textAlign: 'center', fontSize: 11.5, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)',
              }}>{wd}</div>
            ))}
          </div>
          {calWeeks.map((week, wi) => (
            <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
              {week.map((cell, ci) => (
                <div
                  key={ci}
                  style={{
                    minHeight: 104, padding: 7,
                    borderRight: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    opacity: cell.inMonth ? 1 : 0.35,
                    background: cell.isToday ? 'var(--accent-soft)' : 'transparent',
                  }}
                >
                  <div style={{
                    fontSize: 13, fontWeight: cell.isToday ? 700 : 500, marginBottom: 5,
                    width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '50%',
                    background: cell.isToday ? 'var(--accent)' : 'transparent',
                    color: cell.isToday ? '#fff' : 'var(--text-2)',
                  }}>
                    {cell.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {cell.events.map((ev, ei) => (
                      <div key={ei} style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '2px 6px',
                        borderRadius: 6, background: ev.bg, fontSize: 10.5, fontWeight: 600,
                        color: ev.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: ev.color, flex: '0 0 5px' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.t}</span>
                      </div>
                    ))}
                    {cell.hasMore && (
                      <div style={{ fontSize: 10, color: 'var(--text-3)', paddingLeft: 6 }}>+{cell.more} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {state.calView === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          {weekCells.map((d, i) => (
            <div key={i} style={{
              border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
              minHeight: 240, background: 'var(--surface)',
            }}>
              <div style={{
                textAlign: 'center', padding: '10px 0',
                borderRadius: '12px 12px 0 0',
                background: d.isToday ? 'var(--accent)' : 'transparent',
                color: d.isToday ? '#fff' : 'var(--text-2)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', opacity: 0.8 }}>{d.dow}</div>
                <div style={{ fontSize: 19, fontWeight: 700 }}>{d.dayNum}</div>
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {d.events.map((ev, ei) => (
                  <div key={ei} style={{
                    padding: '7px 9px', borderRadius: 9, background: ev.bg,
                    borderLeft: `3px solid ${ev.color}`,
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: ev.color }}>{ev.t}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DAY VIEW */}
      {state.calView === 'day' && (
        <div style={{
          border: '1px solid var(--border)', borderRadius: 20, padding: '8px 20px',
          background: 'var(--surface)', maxWidth: 740,
        }}>
          {dayAgenda.map((row, ri) => (
            <div key={ri} style={{
              display: 'flex', gap: 18, padding: '14px 0',
              borderBottom: ri < dayAgenda.length - 1 ? '1px solid var(--border)' : 'none',
              minHeight: 54,
            }}>
              <div style={{
                width: 52, flex: '0 0 52px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums', paddingTop: 2,
              }}>
                {row.time}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {row.items.map((it, ii) => (
                  <div key={ii} style={{
                    padding: '11px 14px', borderRadius: 12,
                    background: it.bg, borderLeft: `3px solid ${it.color}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{it.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{it.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 18, paddingTop: 4 }}>
        {CAT_LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--text-3)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Imported batch chip — shown when there are imported events this month */}
      {(state.importedCalEvents || []).some(e => {
        if (!e.date) return false;
        const [y, m] = e.date.split('-').map(Number);
        return y === state.calYear && m - 1 === state.calMonth;
      }) && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Imported:</span>
          {[...new Set((state.importedCalEvents || [])
            .filter(e => { if (!e.date) return false; const [y, m] = e.date.split('-').map(Number); return y === state.calYear && m - 1 === state.calMonth; })
            .map(e => e.importBatch)
          )].map(bid => {
            const batch = (state.importHistory || []).find(b => b.id === bid);
            if (!batch) return null;
            return (
              <span key={bid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 99, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: (CAT[batch.category] || '#6c6c80') }} />
                {batch.filename} ({batch.count})
                <button onClick={() => dispatch({ type: 'DELETE_CAL_BATCH', batchId: bid })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '0 0 0 4px', lineHeight: 1 }}>×</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
    {showImport && (
      <IcsImportModal
        onClose={() => setShowImport(false)}
        onImport={(events, category, filename) => {
          dispatch({ type: 'ADD_CAL_EVENTS', events, category, filename });
          setShowImport(false);
        }}
      />
    )}
  </>
  );
}
