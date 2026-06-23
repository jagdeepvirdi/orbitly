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
