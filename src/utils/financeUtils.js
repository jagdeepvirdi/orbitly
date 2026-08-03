import { APP_TODAY } from './dateUtils';
import { currencySymbol } from '../data/currencies';

// Shared by FinanceTracker.jsx and TodayDashboard.jsx so "days until due" /
// "next due date" math lives in exactly one place.

export function fmtAmount(amount, currency) {
  if (amount === null || amount === undefined) return 'Varies';
  return `${currencySymbol(currency)}${Number(amount).toLocaleString()}`;
}

export function fmtCycle(cycle) {
  return cycle === 'yearly' ? '/yr' : cycle === 'quarterly' ? '/qtr' : '/mo';
}

export function isThisMonth(date) {
  return !!date && date.getFullYear() === APP_TODAY.getFullYear() && date.getMonth() === APP_TODAY.getMonth();
}

// Cash-flow view, not an amortized average: a monthly item always counts in
// full (it's due every month); a quarterly/yearly item only counts in the one
// month it's actually due, and contributes 0 every other month.
export function thisMonthAmount(amount, cycle, nextDate) {
  if (amount === null || amount === undefined) return 0;
  if (!cycle || cycle === 'monthly') return Number(amount);
  return isThisMonth(nextDate) ? Number(amount) : 0;
}

export function daysUntilDay(targetDay) {
  const y = APP_TODAY.getFullYear(), m = APP_TODAY.getMonth(), d = APP_TODAY.getDate();
  const t = targetDay >= d ? new Date(y, m, targetDay) : new Date(y, m + 1, targetDay);
  return Math.round((t - new Date(y, m, d)) / 86400000);
}

export function nextDateForDay(targetDay) {
  const y = APP_TODAY.getFullYear(), m = APP_TODAY.getMonth(), d = APP_TODAY.getDate();
  return targetDay >= d ? new Date(y, m, targetDay) : new Date(y, m + 1, targetDay);
}

// Works for any recurring-payment item (subscription, bill, insurance policy).
// monthly cycles use a plain day-of-month; quarterly/yearly cycles anchor to
// `startDate`'s month+day and roll forward in 3/12-month steps — this is what
// lets a once-a-year item (e.g. a prepaid validity due 25 Feb next year) land
// on its real date instead of "some day this month".
export function nextBillingDate(item, dayField = 'billingDay') {
  if (item.cycle && item.cycle !== 'monthly' && item.startDate) {
    const start = new Date(item.startDate + 'T00:00:00');
    const today = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate());
    const stepMonths = item.cycle === 'yearly' ? 12 : item.cycle === 'quarterly' ? 3 : 1;
    let next = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (next < today) next.setMonth(next.getMonth() + stepMonths);
    return next;
  }
  return nextDateForDay(item[dayField]);
}

export function daysUntilBilling(item, dayField = 'billingDay') {
  const next = nextBillingDate(item, dayField);
  const today = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate());
  return Math.round((next - today) / 86400000);
}

export function fmtDate(dt) {
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function dueBadge(days) {
  if (days === 0) return { bg: 'rgba(16,185,129,0.15)',  color: '#34d399', label: 'Today' };
  if (days <= 3)  return { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5', label: `${days}d` };
  if (days <= 7)  return { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', label: `${days}d` };
  return           { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', label: `${days}d` };
}

// Snake_case DB rows → camelCase component shapes
export function normSub(r)  { return { ...r, billingDay: Number(r.billing_day), amount: Number(r.amount), startDate: r.start_date || '' }; }
export function normLoan(r)      { return { ...r, dueDay: Number(r.due_day), emi: Number(r.emi) }; }
export function normInsurance(r) { return { ...r, billingDay: r.billing_day != null ? Number(r.billing_day) : null, amount: r.amount ? Number(r.amount) : null, cycle: r.cycle || 'monthly', startDate: r.start_date || '' }; }
export function normCC(r)   { return { ...r, dueDay:       Number(r.due_day), statementDay: Number(r.statement_day) }; }
export function normBill(r) { return { ...r, dueDay: r.due_day != null ? Number(r.due_day) : null, generationDay: r.generation_day != null ? Number(r.generation_day) : null, amount: r.amount ? Number(r.amount) : null, cycle: r.cycle || 'monthly', startDate: r.start_date || '' }; }
