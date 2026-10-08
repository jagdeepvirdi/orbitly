import { useState, useMemo, useEffect } from 'react';
import { useAppStore, CAT } from '../../store/appStore';
import { USERS } from '../../data/users';
import { APP_TODAY, daysAway, fmtTimer, formatDate, isDueToday, getMedStatus, isWeekend, nextBdayDays, nextEventDays } from '../../utils/dateUtils';
import { F1_CALENDAR, CRICKET_MATCHES, FOOTBALL_FIXTURES } from '../../data/sportsData';
import { useLiveF1 } from '../../hooks/useLiveF1';
import { useLiveCricket } from '../../hooks/useLiveCricket';
import { useLiveFootball } from '../../hooks/useLiveFootball';
import { filterByTeams, sortMatches } from '../../utils/sportsUtils';
import { fireConfetti } from '../../hooks/useConfetti';
import { useTimer } from '../../hooks/useTimer';
import { api } from '../../api/client';
import {
  daysUntilBilling, daysUntilDay, fmtAmount, dueBadge,
  normSub, normLoan, normInsurance, normCC, normBill,
} from '../../utils/financeUtils';
import CheckRow from '../ui/CheckRow';
import PriorityBadge from '../ui/PriorityBadge';
import SortableCard from '../ui/SortableCard';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Works for both live API matches (ISO date strings) and seed fixtures (year/month/day fields)
function daysAwayFromMatch(m) {
  if (!m) return null;
  if (typeof m.date === 'string' && m.date.length >= 10) {
    const d = new Date(m.date);
    if (!isNaN(d)) {
      return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate())) / 86400000);
    }
  }
  if (m.year != null) return daysAway(m.year, m.month, m.day);
  return null;
}


function SectionLabel({ dot, color, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot }} />
      <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color }} >{text}</span>
    </div>
  );
}

export default function TodayDashboard() {
  const { state, dispatch } = useAppStore();
  useTimer();

  const [editing, setEditing] = useState(false);
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [dbFestivals, setDbFestivals] = useState([]);

  useEffect(() => {
    // Must go through the api client (not a raw fetch) so the Clerk auth
    // token is attached — otherwise this 401s in any Clerk-enabled deployment
    // and the festival cards below silently show nothing.
    api.getFestivals()
      .then(rows => setDbFestivals(Array.isArray(rows) ? rows : []))
      .catch(() => setDbFestivals([]));
  }, []);

  // Finance: same unified "next due" view as the Finance tab's Summary tab,
  // just fetched locally here so Today doesn't depend on that section mounting.
  const [financeLoaded, setFinanceLoaded] = useState(false);
  const [upcomingFinance, setUpcomingFinance] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getSubscriptions().catch(() => []),
      api.getBills().catch(() => []),
      api.getLoans().catch(() => []),
      api.getCreditCards().catch(() => []),
      api.getInsurance().catch(() => []),
    ]).then(([subsRaw, billsRaw, loansRaw, cardsRaw, insRaw]) => {
      const subs = subsRaw.map(normSub);
      const bills = billsRaw.map(normBill);
      const loans = loansRaw.map(normLoan);
      const cards = cardsRaw.map(normCC);
      const insurance = insRaw.map(normInsurance);
      const items = [
        ...subs.map(s => ({ id: `subscription:${s.id}`, name: s.name, emoji: s.emoji || '📦', amount: s.amount, currency: s.currency, days: daysUntilBilling(s), categoryLabel: 'Subscription' })),
        ...bills.map(b => ({ id: `bill:${b.id}`, name: b.name, emoji: b.emoji || '📋', amount: b.amount, currency: b.currency, days: daysUntilBilling(b, 'dueDay'), categoryLabel: 'Bill' })),
        ...loans.map(l => ({ id: `loan:${l.id}`, name: l.name, emoji: l.emoji || '🏦', amount: l.emi, currency: l.currency, days: daysUntilDay(l.dueDay), categoryLabel: 'Loan EMI' })),
        ...cards.map(c => ({ id: `credit_card:${c.id}`, name: c.bank || c.name, emoji: c.emoji || '💳', amount: null, currency: c.currency, days: daysUntilDay(c.dueDay), categoryLabel: 'Card payment' })),
        ...insurance.map(i => ({ id: `insurance:${i.id}`, name: i.name, emoji: i.emoji || '🛡️', amount: i.amount, currency: i.currency, days: daysUntilBilling(i), categoryLabel: 'Insurance' })),
      ].sort((a, b) => a.days - b.days);
      setUpcomingFinance(items);
      setFinanceLoaded(true);
    });
  }, []);

  const pinnedUpcoming = useMemo(() => {
    const activeSubs = state.subscribedCalendars || [];
    const pinnedIds = state.pinnedFestivals || [];

    const withinWindow = dbFestivals
      .filter(f => {
        const packId = f.calendar === 'indian' ? 'IN' : (f.calendar === 'thai' ? 'TH' : f.calendar);
        if (f.calendar !== 'custom' && f.calendar && !activeSubs.includes(packId)) return false;

        const [y, m, d] = f.event_date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const days = Math.round((date - new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate())) / 86400000);
        return days >= 0 && days <= 30;
      })
      .map(f => {
        const [y, m, d] = f.event_date.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const days = Math.round((date - new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate())) / 86400000);
        return { ...f, dateObj: date, days };
      })
      .sort((a, b) => a.days - b.days);

    const pinned = withinWindow.filter(f => pinnedIds.includes(f.id));
    // Nothing pinned yet? Show the nearest subscribed festivals instead of an
    // empty card — pinning stays a way to prioritize, not a gate on visibility.
    return pinned.length > 0 ? pinned : withinWindow.slice(0, 3);
  }, [dbFestivals, state.pinnedFestivals, state.subscribedCalendars]);

  const festivalsArePinned = pinnedUpcoming.length > 0 && (state.pinnedFestivals || []).includes(pinnedUpcoming[0].id);

  const user = USERS[state.userId];
  const allTasks = state.workTasks.concat(state.personalTasks);
  const taskLeft = allTasks.filter(t => t.status !== 'done').length;
  const medsPending = state.meds.filter(m => !m.done).length;

  const timerDash = 351.8 * (1 - state.timer / 3600);
  const timerText = fmtTimer(state.timer);
  const timerState = state.timerRunning ? 'Focusing' : (state.timer === 0 ? 'Complete' : 'Paused');

  const hour = APP_TODAY.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const greetingIcon = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : hour < 21 ? '🌙' : '⭐';

  // Learning: only courses the user has explicitly pinned (Learning Planner ⭐),
  // same model as pinned festivals — never auto-guessed. Soonest nextISO first.
  const pinnedIncompleteCourses = useMemo(() => {
    const pinnedCourseIds = state.pinnedCourses || [];
    return state.courses
      .filter(c => pinnedCourseIds.includes(c.id) && c.done < c.total)
      .sort((a, b) => {
        if (a.nextISO && b.nextISO) return a.nextISO.localeCompare(b.nextISO);
        if (a.nextISO) return -1;
        if (b.nextISO) return 1;
        return 0;
      });
  }, [state.courses, state.pinnedCourses]);
  const activeCourse = pinnedIncompleteCourses[0] || null;
  const otherPinnedCourses = pinnedIncompleteCourses.slice(1);

  const heroSub = [
    taskLeft > 0 ? `${taskLeft} task${taskLeft === 1 ? '' : 's'} to tackle.` : 'All tasks cleared.',
    medsPending > 0 ? `${medsPending} med${medsPending === 1 ? '' : 's'} to take.` : 'Meds all taken.',
    activeCourse ? `Up next: ${activeCourse.name}.` : 'All courses complete!',
  ].join(' ');

  const sportSubscriptions = state.sportSubscriptions || [];
  const isSubbed = sport => sportSubscriptions.some(s => s.sport === sport);
  const footballSub = sportSubscriptions.find(s => s.sport === 'football');
  const footballCompetitions = (footballSub?.leagues && footballSub.leagues.length > 0 ? footballSub.leagues : ['WC', 'PL', 'PD', 'CL', 'EC']).join(',');

  const { schedule: liveF1Schedule } = useLiveF1();
  const cricketSub = sportSubscriptions.find(s => s.sport === 'cricket');
  const { matches: liveCricketMatches, placeholder: cricketPlaceholder } = useLiveCricket(isSubbed('cricket'));
  const { matches: liveFootballMatches, placeholder: footballPlaceholder } = useLiveFootball(footballCompetitions, isSubbed('football'));

  const rawF1Calendar = liveF1Schedule || F1_CALENDAR;
  const f1IsLive = !!liveF1Schedule;
  const nextRace = rawF1Calendar
    .map(r => ({ ...r, days: daysAwayFromMatch(r) }))
    .filter(r => r.days != null && r.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  const f1Days = nextRace?.days ?? null;

  const rawCricketMatches = liveCricketMatches ? sortMatches(filterByTeams(liveCricketMatches, cricketSub?.teams)) : CRICKET_MATCHES;
  const cricketIsLive = !!liveCricketMatches && !cricketPlaceholder;
  const activeCricket = rawCricketMatches.find(m => m.status === 'live')
    || rawCricketMatches.find(m => m.status === 'upcoming');
  const cricketDays = daysAwayFromMatch(activeCricket);

  const rawFootballMatches = liveFootballMatches ? sortMatches(filterByTeams(liveFootballMatches, footballSub?.teams)) : FOOTBALL_FIXTURES;
  const footballIsLive = !!liveFootballMatches && !footballPlaceholder;
  const activeFootball = rawFootballMatches.find(m => m.status === 'live')
    || rawFootballMatches.find(m => m.status === 'upcoming');
  const footballDays = daysAwayFromMatch(activeFootball);

  const workTasks = state.workTasks.filter(t => t.status !== 'done').slice(0, 3);
  const personalTasks = state.personalTasks.filter(t => t.status !== 'done').slice(0, 3);

  const todayStr = new Date().toISOString().slice(0, 10);
  const enabledFeedIds = (state.icsFeeds || [])
    .filter(f => f.enabled)
    .map(f => f.id);
  const customEvents = (state.importedCalEvents || [])
    .filter(e => enabledFeedIds.includes(e.importBatch));
  const upcomingIcsEvents = customEvents
    .filter(e => e.date && e.date >= todayStr)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    })
    .slice(0, 3);

  // Real "next 48 hours" agenda — built from live/DB-backed sources only
  // (festivals DB, ICS feeds, tasks with real due dates), never a static demo dataset.
  const todayISOStr = toISODate(APP_TODAY);
  const tomorrowISOStr = toISODate(new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate() + 1));

  const festivalsNext48h = useMemo(() => {
    const activeSubs = state.subscribedCalendars || [];
    return dbFestivals
      .filter(f => {
        const packId = f.calendar === 'indian' ? 'IN' : (f.calendar === 'thai' ? 'TH' : f.calendar);
        if (f.calendar !== 'custom' && f.calendar && !activeSubs.includes(packId)) return false;
        return f.event_date === todayISOStr || f.event_date === tomorrowISOStr;
      })
      .map(f => ({
        title: f.name, cat: 'Festival', color: CAT.festival,
        when: f.event_date === todayISOStr ? 'Today' : 'Tomorrow',
      }));
  }, [dbFestivals, state.subscribedCalendars, todayISOStr, tomorrowISOStr]);

  const icsNext48h = customEvents
    .filter(e => e.date === todayISOStr || e.date === tomorrowISOStr)
    .map(e => ({
      title: e.title, cat: 'Recurring', color: CAT.recurring,
      when: e.date === todayISOStr ? 'Today' : 'Tomorrow',
    }));

  const tasksNext48h = [];
  state.workTasks.forEach(t => {
    if (t.status !== 'done' && ISO_DATE_RE.test(t.due) && (t.due === todayISOStr || t.due === tomorrowISOStr)) {
      tasksNext48h.push({ title: t.title, cat: 'Work', color: CAT.work, when: t.due === todayISOStr ? 'Today' : 'Tomorrow' });
    }
  });
  state.personalTasks.forEach(t => {
    if (t.status !== 'done' && ISO_DATE_RE.test(t.due) && (t.due === todayISOStr || t.due === tomorrowISOStr)) {
      tasksNext48h.push({ title: t.title, cat: 'Personal', color: CAT.family, when: t.due === todayISOStr ? 'Today' : 'Tomorrow' });
    }
  });

  // Birthdays & Anniversaries: same data + day-math as BirthdaysAnniversaries.jsx,
  // just filtered to the next 30 days for the Today glance.
  const upcomingBirthdays = useMemo(() => {
    const bdays = (state.familyMembers || [])
      .filter(m => m.bday)
      .map(m => ({ type: 'bday', id: m.id, label: m.petName, sub: m.relation || '', days: nextBdayDays(m.bday), icon: '🎂' }));
    const events = (state.familyEvents || [])
      .map(e => ({
        type: 'event', id: e.id, label: e.label,
        sub: e.type === 'engagement' ? 'Engagement' : e.type === 'court' ? 'Court Marriage' : 'Anniversary',
        days: nextEventDays(e.m, e.d),
        icon: e.type === 'engagement' ? '💍' : e.type === 'court' ? '⚖️' : '💑',
      }));
    return [...bdays, ...events]
      .filter(x => x.days <= 30)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [state.familyMembers, state.familyEvents]);

  // Food: today's planned meals, straight from the same mealPlan/recipes state
  // the Food Planner's weekly grid reads (key: 'YYYY-MM-DD-slot' → recipe id).
  const todaysMeals = ['Breakfast', 'Lunch', 'Dinner'].map(slot => {
    const recipeId = state.mealPlan?.[`${todayISOStr}-${slot.toLowerCase()}`];
    const recipe = recipeId ? (state.recipes || []).find(r => r.id === recipeId) : null;
    return { slot, recipe };
  });

  const getFeedName = (feedId) => {
    const feed = (state.icsFeeds || []).find(f => f.id === feedId);
    return feed ? feed.name : 'Calendar Feed';
  };

  function formatEventDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const date = new Date(y, m - 1, d);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'TODAY ';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'TOMORROW ';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TIMER' });
    fireConfetti();
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = state.todayLayout.map(w => w.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    dispatch({ type: 'SET_TODAY_LAYOUT', layout: arrayMove(state.todayLayout, oldIndex, newIndex) });
  }

  // Real "next 48 hours" agenda, sorted Today-first then Tomorrow, from live sources only
  const upcoming = [...festivalsNext48h, ...icsNext48h, ...tasksNext48h]
    .sort((a, b) => (a.when === b.when ? 0 : a.when === 'Today' ? -1 : 1))
    .slice(0, 6);

  const hasLearningSessionToday = pinnedIncompleteCourses.length > 0 && !isWeekend(APP_TODAY);

  const glance = [
    {
      value: String(taskLeft), label: 'tasks left',
      bg: 'rgba(100,116,139,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    },
    {
      value: String(hasLearningSessionToday ? pinnedIncompleteCourses.length : 0), label: pinnedIncompleteCourses.length === 1 ? 'learning session' : 'learning sessions',
      bg: 'rgba(99,102,241,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
    },
    {
      value: String(medsPending), label: 'meds pending',
      bg: 'rgba(16,185,129,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
    },
    {
      value: String(upcoming.length), label: 'events soon',
      bg: 'rgba(168,85,247,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" stroke-width="2"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18"/></svg>',
    },
  ];

  const sportsTicker = [];
  if (isSubbed('f1')) {
    sportsTicker.push({
      key: 'f1', league: 'Formula 1',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M4 5h16l-3 5H4zM4 5v14"/><circle cx="8" cy="19" r="1"/></svg>',
      accent: '#fca5a5',
      title: nextRace ? nextRace.gp : 'Season complete',
      sub: nextRace ? (nextRace.circuit || nextRace.locality || '') : '',
      count: !nextRace ? '—' : f1Days === 0 ? 'TODAY' : String(f1Days),
      countUnit: !nextRace ? 'season complete' : f1Days === 0 ? 'race day!' : f1Days === 1 ? 'day to race' : 'days to race',
      isLive: f1IsLive,
      bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)',
    });
  }
  if (isSubbed('cricket')) {
    sportsTicker.push({
      key: 'cricket', league: 'Cricket',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2"><circle cx="7" cy="17" r="3"/><path d="M9 15L19 5M16 3l5 5"/></svg>',
      accent: '#7dd3fc',
      title: activeCricket ? activeCricket.match : 'No upcoming matches',
      sub: activeCricket ? activeCricket.venue : '',
      count: activeCricket?.status === 'live' ? 'LIVE' : (cricketDays != null ? String(cricketDays) : '—'),
      countUnit: activeCricket?.status === 'live' ? 'right now' : cricketDays === 1 ? 'day to play' : 'days to play',
      isLive: cricketIsLive,
      bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.22)',
    });
  }
  if (isSubbed('football')) {
    sportsTicker.push({
      key: 'football', league: 'Football',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7l3 2.2-1.1 3.6h-3.8L9 9.2z"/></svg>',
      accent: '#86efac',
      title: activeFootball ? (activeFootball.teams || `${activeFootball.homeTeam} vs ${activeFootball.awayTeam}`) : 'No upcoming matches',
      sub: activeFootball ? (activeFootball.stage || activeFootball.competition || '') : '',
      count: activeFootball?.status === 'live' ? 'LIVE' : (footballDays != null ? String(footballDays) : '—'),
      countUnit: activeFootball?.status === 'live' ? 'right now' : footballDays === 1 ? 'day to match' : 'days to match',
      isLive: footballIsLive,
      bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.22)',
    });
  }

  const sessionNum = activeCourse ? activeCourse.done + 1 : null;
  const sessionTitle = activeCourse
    ? `${activeCourse.name} — Day ${sessionNum}`
    : 'No course pinned';
  const sessionSub = activeCourse
    ? `Phase ${activeCourse.phase + 1} · Session ${sessionNum} of ${activeCourse.total}`
    : 'Pin a course in Learning Planner to see it here';

  const mob = state.isMobile;
  const todaysMeds = state.meds.filter(m => getMedStatus(m) === 'active' && isDueToday(m.daysOfWeek));

  const cardContent = {
    learning: (
      <>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--accent)' }} />
        <SectionLabel dot="var(--accent)" color="var(--accent)" text="Today's Learning Session" />
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 25, margin: '6px 0 2px' }}>{sessionTitle}</h3>
        {activeCourse ? (
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 18 }}>{sessionSub}</div>
        ) : (
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'learning' })}
            style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 13.5, color: 'var(--accent)', fontWeight: 600, marginBottom: 18 }}
          >{sessionSub} →</button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          {/* Timer ring */}
          <div style={{ position: 'relative', width: 128, height: 128, flex: '0 0 128px' }}>
            <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="64" cy="64" r="56" fill="none" stroke="var(--border)" strokeWidth="9"/>
              <circle
                cx="64" cy="64" r="56" fill="none" stroke="var(--accent)"
                strokeWidth="9" strokeLinecap="round"
                strokeDasharray="351.8"
                strokeDashoffset={timerDash}
                style={{ transition: 'stroke-dashoffset .9s linear' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 27, fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{timerText}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{timerState}</div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                width: '100%', padding: 13, borderRadius: 13, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
                background: 'var(--accent)',
                boxShadow: '0 8px 22px var(--glow)',
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: state.timerRunning
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>'
              }} />
              <span>{state.timerRunning ? 'Pause session' : (state.timer === 0 ? 'Session done' : 'Start session')}</span>
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => dispatch({ type: 'RESET_TIMER' })}
                style={{
                  flex: 1, padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 12, color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >Reset</button>
              <button
                onClick={handleComplete}
                style={{
                  flex: 1, padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 12, color: '#34d399', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >Mark done</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              Daily limit 1 hour · weekdays only
            </div>
          </div>
        </div>

        {otherPinnedCourses.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Also pinned:</div>
            {otherPinnedCourses.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, gap: 10 }}>
                <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontWeight: 600, color: '#a5b4fc', flexShrink: 0 }}>{c.done}/{c.total} · Next {c.next}</span>
              </div>
            ))}
          </div>
        )}
      </>
    ),

    medication: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel dot="#10b981" color="#6ee7b7" text="Medication" />
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            {todaysMeds.filter(m => m.done).length}/{todaysMeds.length}
          </span>
        </div>
        {todaysMeds.map(m => (
          <CheckRow
            key={m.id}
            done={m.done}
            onToggle={() => dispatch({ type: 'TOGGLE_MED', id: m.id })}
            label={m.name}
            sublabel={m.dose}
            tagLabel={m.time}
            tagBg={/morning/i.test(m.time || '') ? 'rgba(245,158,11,0.16)' : 'rgba(99,102,241,0.16)'}
            tagColor={/morning/i.test(m.time || '') ? '#fcd34d' : '#a5b4fc'}
            accent="#10b981"
          />
        ))}
        {todaysMeds.length > 0 && todaysMeds.every(m => m.done) && (
          <div style={{ fontSize: 12.5, color: '#34d399', textAlign: 'center', padding: '10px 0 2px', fontWeight: 600 }}>
            ✓ All medications taken today
          </div>
        )}
        {todaysMeds.length === 0 && (
          <div style={{ fontSize: 12.5, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0 2px' }}>
            No medications scheduled today
          </div>
        )}
      </>
    ),

    workTasks: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel dot="#64748b" color="var(--text-2)" text="Work Tasks" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'tasks' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >View all →</button>
        </div>
        {workTasks.length === 0
          ? <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '14px 0', textAlign: 'center' }}>🎉 All work tasks done!</div>
          : workTasks.map(t => (
            <button
              key={t.id}
              onClick={() => dispatch({ type: 'TOGGLE_TASK', list: 'workTasks', id: t.id })}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 10px', margin: '0 -10px', borderRadius: 12,
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                flex: '0 0 22px', width: 22, height: 22, borderRadius: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${t.status === 'done' ? '#64748b' : 'var(--border-strong)'}`,
                background: t.status === 'done' ? '#64748b' : 'transparent',
              }}>
                {t.status === 'done' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </span>
              <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500 }}>{t.title}</span>
              <PriorityBadge priority={t.priority} />
            </button>
          ))
        }
      </>
    ),

    personalTasks: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionLabel dot="#f59e0b" color="#fcd34d" text="Personal Tasks" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'tasks' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >View all →</button>
        </div>
        {personalTasks.map(t => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'TOGGLE_TASK', list: 'personalTasks', id: t.id })}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '10px 10px', margin: '0 -10px', borderRadius: 12,
              border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              flex: '0 0 22px', width: 22, height: 22, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${t.status === 'done' ? '#f59e0b' : 'var(--border-strong)'}`,
              background: t.status === 'done' ? '#f59e0b' : 'transparent',
            }}>
              {t.status === 'done' && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              )}
            </span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: 500 }}>{t.title}</span>
            <PriorityBadge priority={t.priority} />
          </button>
        ))}
        {personalTasks.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '14px 0', textAlign: 'center' }}>🎉 All personal tasks done!</div>
        )}
      </>
    ),

    sports: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel dot="#ef4444" color="#fca5a5" text="Sports Ticker" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'sports' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >All sports →</button>
        </div>
        {sportsTicker.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '18px 0', textAlign: 'center' }}>
            No sports subscribed —{' '}
            <button
              onClick={() => dispatch({ type: 'SET_SECTION', section: 'sports' })}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, padding: 0 }}
            >manage sports →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sportsTicker.length},1fr)`, gap: 12 }}>
            {sportsTicker.map(s => (
              <div key={s.key} style={{
                padding: 15, borderRadius: 16,
                background: s.bg, border: `1px solid ${s.border}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <span dangerouslySetInnerHTML={{ __html: s.icon }} style={{ display: 'flex' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: s.accent }}>{s.league}</span>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 11 }}>{s.sub}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: s.isLive ? 0 : 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: s.accent }}>{s.count}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.countUnit}</span>
                </div>
                {!s.isLive && (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: 'rgba(100,116,139,0.14)', color: '#94a3b8', fontWeight: 600,
                  }}>◌ Seed data</span>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    ),

    pinnedFestival: pinnedUpcoming.length > 0 ? (
      <>
        <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.15 }}>
          <svg width="130" height="130" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#c084fc', marginBottom: 6 }}>
            {festivalsArePinned ? 'Pinned Alert' : 'Upcoming Festival'}
          </div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 24, margin: '2px 0' }}>
            {pinnedUpcoming[0].emoji} {pinnedUpcoming[0].name}
          </h3>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
            {pinnedUpcoming[0].dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 38, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#c084fc' }}>
              {pinnedUpcoming[0].days === 0 ? 'Today!' : pinnedUpcoming[0].days}
            </span>
            {pinnedUpcoming[0].days > 0 && <span style={{ fontSize: 14, color: 'var(--text-2)' }}>days away</span>}
          </div>

          {pinnedUpcoming[0].action && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px',
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 12,
              fontSize: 12.5, color: '#c3dafe', fontWeight: 500, marginBottom: pinnedUpcoming.length > 1 ? 14 : 0
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2z"/></svg>
              {pinnedUpcoming[0].action}
            </div>
          )}

          {pinnedUpcoming.length > 1 && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)' }}>Also upcoming:</div>
              {pinnedUpcoming.slice(1, 3).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 160 }}>
                    {f.emoji} {f.name}
                  </span>
                  <span style={{ fontWeight: 600, color: '#c084fc', flexShrink: 0 }}>
                    {f.days === 0 ? 'Today' : `${f.days}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    ) : null,

    upcoming48h: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} /> {/* eslint-disable-line no-restricted-syntax -- CAT.recurring, not the brand accent */}
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d8b4fe' }}>
            Upcoming · Next 48 hours
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '18px 0', textAlign: 'center' }}>
            Nothing scheduled in the next 48 hours
          </div>
        ) : upcoming.map((e, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '11px 0',
            borderBottom: i < upcoming.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ width: 3, height: 38, borderRadius: 99, background: e.color, flex: '0 0 3px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{e.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{e.cat}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: e.when === 'Today' ? 'rgba(99,102,241,0.16)' : 'rgba(148,163,184,0.16)',
                color: e.when === 'Today' ? '#a5b4fc' : '#cbd5e1',
              }}>{e.when}</div>
            </div>
          </div>
        ))}
      </>
    ),

    familyFeed: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 0 0 7.75"/>
            </svg>
            <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)' }}>
              {upcomingIcsEvents.length > 0 ? 'Feed Events' : 'Family Feed'}
            </span>
          </div>
          <button
            onClick={() => {
              if (upcomingIcsEvents.length > 0) {
                dispatch({ type: 'SET_SECTION', section: 'settings' });
                dispatch({ type: 'SET_SETTINGS_TAB', tab: 'connections' });
              } else {
                dispatch({ type: 'SET_SECTION', section: 'family' });
              }
            }}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {upcomingIcsEvents.length > 0 ? 'Manage →' : 'Open →'}
          </button>
        </div>

        {upcomingIcsEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingIcsEvents.map(event => {
              const dateParts = formatEventDate(event.date).split(' ');
              return (
                <div key={event.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.18)', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>
                      {dateParts[0]}
                    </span>
                    {dateParts[1] && (
                      <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)', marginTop: 1 }}>
                        {dateParts[1]}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={event.title}>
                      {event.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface-3)', color: 'var(--text-2)', borderRadius: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em' }}>
                        {getFeedName(event.importBatch)}
                      </span>
                      {event.time && (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                          ⏰ {event.time}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (state.familyMembers && state.familyMembers.length > 0) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.7">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 0 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Family connected</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Wife / family space is active. View shared chores and shopping lists.
              </div>
            </div>
            <button
              onClick={() => { dispatch({ type: 'SET_SECTION', section: 'family' }); }}
              style={{
                marginTop: 4, padding: '9px 18px', borderRadius: 11, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none',
              }}
            >
              Go to Family Space &rarr;
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 16px', gap: 12, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.7">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 1 0 0 7.75"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Your family orbit is empty</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
                Connect your partner or family members to see their shared activity here.
              </div>
            </div>
            <button
              onClick={() => { dispatch({ type: 'SET_SECTION', section: 'settings' }); dispatch({ type: 'SET_SETTINGS_TAB', tab: 'connections' }); }}
              style={{
                marginTop: 4, padding: '9px 18px', borderRadius: 11, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none',
              }}
            >Connect family &rarr;</button>
          </div>
        )}
      </>
    ),

    finance: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel dot="#10b981" color="#6ee7b7" text="Finance" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'finance' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >View all →</button>
        </div>
        {!financeLoaded ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '18px 0', textAlign: 'center' }}>Loading…</div>
        ) : upcomingFinance.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '18px 0', textAlign: 'center' }}>
            No bills or subscriptions added yet
          </div>
        ) : upcomingFinance.slice(0, 4).map((item, i) => {
          const badge = dueBadge(item.days);
          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < Math.min(upcomingFinance.length, 4) - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{ fontSize: 18, flex: '0 0 auto' }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.categoryLabel} · {fmtAmount(item.amount, item.currency)}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                background: badge.bg, color: badge.color,
              }}>{badge.label}</span>
            </div>
          );
        })}
      </>
    ),

    food: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel dot="#84cc16" color="#bef264" text="Today's Meals" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'food' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >Plan meals →</button>
        </div>
        {todaysMeals.map(({ slot, recipe }, i) => (
          <div key={slot} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i < todaysMeals.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--text-3)', width: 70, flexShrink: 0 }}>{slot}</div>
            {recipe ? (
              <div style={{ fontSize: 14, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</div>
            ) : (
              <button
                onClick={() => dispatch({ type: 'SET_SECTION', section: 'food' })}
                style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', flex: 1, textAlign: 'left', padding: 0 }}
              >Not planned — add one →</button>
            )}
          </div>
        ))}
      </>
    ),

    birthdays: (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel dot="#f43f5e" color="#fda4af" text="Birthdays & Anniversaries" />
          <button
            onClick={() => dispatch({ type: 'SET_SECTION', section: 'birthdays' })}
            style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >View all →</button>
        </div>
        {upcomingBirthdays.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '18px 0', textAlign: 'center' }}>
            No birthdays or anniversaries in the next 30 days
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(upcomingBirthdays.length, 5)},1fr)`, gap: 12 }}>
            {upcomingBirthdays.map(item => (
              <div key={`${item.type}-${item.id}`} style={{
                padding: 15, borderRadius: 16,
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
              }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sub}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#fda4af' }}>{item.days === 0 ? '🎉' : item.days}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.days === 0 ? 'today!' : 'days away'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    ),
  };

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: mob ? '16px 16px 0' : '30px 34px 0' }}>
      {/* HERO */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 26,
        padding: mob ? '22px 20px' : '34px 36px', marginBottom: 26,
        background: 'linear-gradient(120deg, var(--hero-a), var(--hero-b) 60%, transparent)',
        border: '1px solid var(--border)',
      }}>
        <div style={{
          position: 'absolute', right: -40, top: -40, width: 280, height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--glow), transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.02em' }}>
            {formatDate(APP_TODAY)}
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: mob ? 28 : 42,
            lineHeight: 1.08, letterSpacing: '-0.025em', margin: '8px 0 6px',
          }}>
            {greeting}, {user.first} {greetingIcon}
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', margin: '0 0 22px', maxWidth: 560 }}>
            {heroSub}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {glance.map((g, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 14px 9px 11px',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 13, backdropFilter: 'blur(10px)',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: g.bg,
                }} dangerouslySetInnerHTML={{ __html: g.icon }} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{g.value}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{g.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layout toolbar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 14 }}>
        {editing && (
          <button
            onClick={() => dispatch({ type: 'RESET_TODAY_LAYOUT' })}
            style={{
              padding: '8px 14px', borderRadius: 11, cursor: 'pointer',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
            }}
          >Reset to default</button>
        )}
        <button
          onClick={() => setEditing(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 11, cursor: 'pointer',
            background: editing ? 'var(--accent)' : 'var(--surface)',
            border: `1px solid ${editing ? 'var(--accent)' : 'var(--border)'}`,
            color: editing ? '#fff' : 'var(--text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21v-7M4 10V3M12 21v-11M12 6V3M20 21v-5M20 12V3M1 14h6M9 6h6M17 16h6"/></svg>
          {editing ? 'Done customizing' : 'Customize layout'}
        </button>
      </div>

      {/* MAIN GRID */}
      <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={state.todayLayout.map(w => w.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(12,1fr)', gap: mob ? 14 : 18, alignItems: 'start' }}>
            {state.todayLayout.map(w => {
              if (w.id === 'pinnedFestival' && pinnedUpcoming.length === 0) return null;
              const cardStyle = w.id === 'pinnedFestival'
                ? { background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(168,85,247,0.08))', border: '1px solid rgba(139,92,246,0.25)' }
                : undefined;
              return (
                <SortableCard
                  key={w.id}
                  id={w.id}
                  span={mob ? 12 : w.span}
                  editing={editing}
                  onSpanChange={span => dispatch({ type: 'SET_WIDGET_SPAN', id: w.id, span })}
                  style={cardStyle}
                >
                  {cardContent[w.id]}
                </SortableCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      <div style={{ height: 40 }} />
    </div>
  );
}
