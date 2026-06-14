export const APP_TODAY = new Date();

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
  const date = new Date(y, m - 1, d);
  return nextWorkday(date).toISOString().slice(0, 10);
}
