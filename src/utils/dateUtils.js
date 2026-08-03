export const APP_TODAY = new Date();

const _BDY_MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtBday(bday) {
  if (!bday) return null;
  return `${bday[1]} ${_BDY_MONTHS[bday[0]]}`;
}

export function nextBdayDays(bday) {
  if (!bday) return Infinity;
  const y = APP_TODAY.getFullYear();
  const today = new Date(y, APP_TODAY.getMonth(), APP_TODAY.getDate());
  let next = new Date(y, bday[0] - 1, bday[1]);
  if (next < today) next = new Date(y + 1, bday[0] - 1, bday[1]);
  return Math.round((next - today) / 86400000);
}

// Days until the next occurrence of a family event (anniversary/engagement),
// given its month (1-indexed) and day. Shared by BirthdaysAnniversaries.jsx
// and TodayDashboard.jsx so the "days away" math lives in one place.
export function nextEventDays(m, d) {
  const now = APP_TODAY;
  const y = now.getFullYear();
  let next = new Date(y, m - 1, d);
  const today = new Date(y, now.getMonth(), now.getDate());
  if (next < today) next = new Date(y + 1, m - 1, d);
  return Math.round((next - today) / 86400000);
}

export function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function nextWorkday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  return d;
}

export function addWorkdays(date, n) {
  let d = new Date(date);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

export function daysAway(y, m, d) {
  const target = new Date(y, m, d);
  const a = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate());
  return Math.round((target - a) / 86400000);
}

export function formatDate(date, opts = {}) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  });
}

export function fmtTimer(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function fmtShortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${SHORT_MONTHS[m - 1]}`;
}

export function addWorkdayToISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const next = nextWorkday(new Date(y, m - 1, d));
  // Use local date parts to avoid UTC-vs-local offset issues (e.g. Bangkok UTC+7)
  const yy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtApptDate(iso) {
  if (!iso) return '';
  try {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
  } catch { return String(iso); }
}

export const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// A missing/empty/full daysOfWeek array means "every day"
export function isDueToday(daysOfWeek) {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || daysOfWeek.length >= 7) return true;
  return daysOfWeek.includes(new Date().getDay());
}

export function fmtDaysOfWeek(daysOfWeek) {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0 || daysOfWeek.length >= 7) return null;
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  if (sorted.length === 1) return `${DAY_LABELS[sorted[0]]} only`;
  return sorted.map(d => DAY_LABELS[d]).join(', ');
}

// active | upcoming | past, based on a med/appointment-like start/end date pair
export function getMedStatus(med) {
  const today = todayISO();
  if (med.startDate && med.startDate > today) return 'upcoming';
  if (med.endDate && med.endDate < today) return 'past';
  return 'active';
}
