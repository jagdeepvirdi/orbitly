import { CAT } from '../store/appStore';
import { APP_TODAY } from './dateUtils';
import { FAMILY_MEMBERS, FAMILY_EVENTS } from '../data/familyDirectory';

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function buildMonthGrid(year, month, calEvents, overlays) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const prevDim = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const dayNum = i - startOffset + 1;
    const inMonth = dayNum >= 1 && dayNum <= dim;
    let label = dayNum;
    if (dayNum < 1) label = prevDim + dayNum;
    else if (dayNum > dim) label = dayNum - dim;

    const isToday = inMonth && dayNum === APP_TODAY.getDate() && month === APP_TODAY.getMonth() && year === APP_TODAY.getFullYear();
    let evs = inMonth ? (calEvents[dayNum] || []) : [];
    evs = evs.filter(e =>
      (e.c !== 'festival' || overlays.festivals) &&
      (e.c !== 'sports' || overlays.sports) &&
      (e.c !== 'holiday' || overlays.holidays)
    );
    const more = Math.max(0, evs.length - 3);
    const hasConflict = inMonth && evs.length >= 3;

    cells.push({
      label,
      inMonth,
      isToday,
      hasConflict,
      events: evs.slice(0, 3).map(e => ({
        t: e.t,
        color: CAT[e.c] || '#6c6c80',
        bg: (CAT[e.c] || '#6c6c80') + '22',
        resch: !!e.resch,
      })),
      more,
      hasMore: more > 0,
    });
  }

  const weeks = [];
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));
  return weeks;
}

export function buildWeekCells(calEvents, overlays) {
  const dow = APP_TODAY.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(APP_TODAY);
  mon.setDate(APP_TODAY.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const dayNum = d.getDate();
    const isToday = d.toDateString() === APP_TODAY.toDateString();
    return {
      dow: WD[i],
      dayNum,
      isToday,
      events: (calEvents[dayNum] || [])
        .filter(e =>
          (e.c !== 'festival' || overlays.festivals) &&
          (e.c !== 'sports' || overlays.sports)
        )
        .map(e => ({ t: e.t, color: CAT[e.c] || '#6c6c80', bg: (CAT[e.c] || '#6c6c80') + '1f' })),
    };
  });
}

// Builds a day-keyed event map for birthdays and anniversaries in a given month.
// month is 0-indexed (JS convention). Events use 'family' category so they're
// always visible regardless of overlay toggles.
export function buildBirthdayEvents(year, month) {
  const jsMonth = month + 1; // convert to 1-indexed to match bday/m fields
  const events = {};
  const add = (day, evt) => { events[day] = [...(events[day] || []), evt]; };

  FAMILY_MEMBERS.forEach(m => {
    if (m.bday && m.bday[0] === jsMonth) {
      add(m.bday[1], { t: `🎂 ${m.petName}`, c: 'family' });
    }
  });

  FAMILY_EVENTS.forEach(e => {
    if (e.m === jsMonth) {
      // Shorten label for pill display
      const short = e.label
        .replace(' Wedding Anniversary', ' Anniv')
        .replace(' Anniversary', ' Anniv')
        .replace(' Thai Engagement', ' Eng')
        .replace(' Court Anniv', ' (Court)');
      add(e.d, { t: `💍 ${short}`, c: 'festival' });
    }
  });

  return events;
}

// Merges two day-keyed event maps (base events + birthday/overlay events).
export function mergeCalEvents(base, extra) {
  const merged = { ...base };
  Object.entries(extra).forEach(([day, evs]) => {
    merged[+day] = [...(merged[+day] || []), ...evs];
  });
  return merged;
}

export const DAY_AGENDA = [
  { time: '08:00', items: [] },
  { time: '09:00', items: [{ t: 'Claude 101 — Day 1', sub: 'Learning · 1 hour', color: '#6366f1' }] },
  { time: '10:00', items: [{ t: 'Team standup', sub: 'Work · 30 min', color: '#64748b' }] },
  { time: '12:00', items: [{ t: 'Lunch', sub: 'Break', color: '#94a3b8' }] },
  { time: '15:00', items: [] },
  { time: '18:00', items: [{ t: 'Family dinner', sub: 'Family', color: '#f59e0b' }] },
  { time: '20:00', items: [{ t: 'Evening medication', sub: 'Health · Metformin, Magnesium', color: '#10b981' }] },
];
