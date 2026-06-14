import { useEffect, useRef } from 'react';
import { useAppStore, CAT, PRIORITY } from '../../store/appStore';
import { USERS } from '../../data/users';
import { APP_TODAY, daysAway, fmtTimer, formatDate } from '../../utils/dateUtils';
import { F1_CALENDAR, CRICKET_MATCHES, FOOTBALL_FIXTURES } from '../../data/sportsData';
import { CAL_EVENTS } from '../../data/calEvents';
import { fireConfetti } from '../../hooks/useConfetti';
import { useTimer } from '../../hooks/useTimer';
import CheckRow from '../ui/CheckRow';
import PriorityBadge from '../ui/PriorityBadge';

const RAKHI_DAYS = daysAway(2026, 7, 28);

const CAT_LABELS = {
  work: 'Work', learning: 'Learning', family: 'Family',
  health: 'Health', sports: 'Sports', festival: 'Festival', recurring: 'Recurring',
};

const FAMILY_FEED = [
  {
    name: 'Namtan', role: 'Partner', initials: 'NT', accent: USERS.wife.accent,
    items: [
      { label: 'Yoga class', time: '07:00', dot: '#f43f5e' },
      { label: 'Cycle day 14 · fertile window', time: 'All day', dot: '#fb7185' },
      { label: 'Grocery run', time: '17:00', dot: '#f59e0b' },
    ],
  },
  {
    name: 'Jasleen', role: 'Child', initials: 'JL', accent: USERS.daughter.accent,
    items: [
      { label: 'School · Maths test', time: '09:30', dot: '#f59e0b' },
      { label: 'Piano lesson', time: '16:00', dot: '#a855f7' },
    ],
  },
];

function Card({ children, span, style = {} }) {
  return (
    <section style={{
      gridColumn: `span ${span}`,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 22,
      padding: 24,
      backdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </section>
  );
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

  const user = USERS[state.userId];
  const allTasks = state.workTasks.concat(state.personalTasks);
  const taskLeft = allTasks.filter(t => t.status !== 'done').length;
  const medsPending = state.meds.filter(m => !m.done).length;

  const timerPct = ((3600 - state.timer) / 3600) * 100;
  const timerDash = 351.8 * (1 - state.timer / 3600);
  const timerText = fmtTimer(state.timer);
  const timerState = state.timerRunning ? 'Focusing' : (state.timer === 0 ? 'Complete' : 'Paused');

  const incompleteMeds = state.meds.filter(m => !m.done).length;
  const totalMeds = state.meds.length;

  const hour = APP_TODAY.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night';
  const greetingIcon = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : hour < 21 ? '🌙' : '⭐';

  const activeCourse = state.courses.find(c => c.done < c.total);
  const heroSub = [
    taskLeft > 0 ? `${taskLeft} task${taskLeft === 1 ? '' : 's'} to tackle.` : 'All tasks cleared.',
    medsPending > 0 ? `${medsPending} med${medsPending === 1 ? '' : 's'} to take.` : 'Meds all taken.',
    activeCourse ? `Up next: ${activeCourse.name}.` : 'All courses complete!',
  ].join(' ');

  const nextRace = F1_CALENDAR.find(r => daysAway(r.year, r.month, r.day) >= 0) || F1_CALENDAR[F1_CALENDAR.length - 1];
  const f1Days = daysAway(nextRace.year, nextRace.month, nextRace.day);

  const activeCricket = CRICKET_MATCHES.find(m => m.status === 'live')
    || CRICKET_MATCHES.find(m => m.status === 'upcoming' && daysAway(m.year, m.month, m.day) >= 0);
  const cricketDays = activeCricket ? daysAway(activeCricket.year, activeCricket.month, activeCricket.day) : 0;

  const activeFootball = FOOTBALL_FIXTURES.find(m => m.status === 'live')
    || FOOTBALL_FIXTURES.find(m => m.status === 'upcoming' && daysAway(m.year, m.month, m.day) >= 0);
  const footballDays = activeFootball ? daysAway(activeFootball.year, activeFootball.month, activeFootball.day) : 0;

  const workTasks = state.workTasks.filter(t => t.status !== 'done').slice(0, 3);
  const personalTasks = state.personalTasks.filter(t => t.status !== 'done').slice(0, 3);

  function handleComplete() {
    dispatch({ type: 'COMPLETE_TIMER' });
    fireConfetti();
  }

  const glance = [
    {
      value: String(taskLeft), label: 'tasks left',
      bg: 'rgba(100,116,139,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    },
    {
      value: '1', label: 'learning session',
      bg: 'rgba(99,102,241,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" stroke-width="2"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
    },
    {
      value: String(medsPending), label: 'meds pending',
      bg: 'rgba(16,185,129,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7b7" stroke-width="2"><path d="M3 12h4l2 5 4-12 2 7h6"/></svg>',
    },
    {
      value: '2', label: 'events soon',
      bg: 'rgba(168,85,247,0.2)',
      icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" stroke-width="2"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9h18"/></svg>',
    },
  ];

  const sportsTicker = [
    {
      league: 'Formula 1',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" stroke-width="2"><path d="M4 5h16l-3 5H4zM4 5v14"/><circle cx="8" cy="19" r="1"/></svg>',
      accent: '#fca5a5',
      title: nextRace.gp,
      sub: nextRace.circuit,
      count: f1Days === 0 ? 'TODAY' : String(f1Days),
      countUnit: f1Days === 0 ? 'race day!' : f1Days === 1 ? 'day to race' : 'days to race',
      bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)',
    },
    {
      league: 'Cricket',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" stroke-width="2"><circle cx="7" cy="17" r="3"/><path d="M9 15L19 5M16 3l5 5"/></svg>',
      accent: '#7dd3fc',
      title: activeCricket ? activeCricket.match : 'No upcoming matches',
      sub: activeCricket ? activeCricket.venue : '',
      count: activeCricket?.status === 'live' ? 'LIVE' : String(cricketDays),
      countUnit: activeCricket?.status === 'live' ? 'right now' : cricketDays === 1 ? 'day to play' : 'days to play',
      bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.22)',
    },
    {
      league: 'Football',
      icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7l3 2.2-1.1 3.6h-3.8L9 9.2z"/></svg>',
      accent: '#86efac',
      title: activeFootball ? activeFootball.teams : 'No upcoming matches',
      sub: activeFootball ? activeFootball.stage : '',
      count: activeFootball?.status === 'live' ? 'LIVE' : String(footballDays),
      countUnit: activeFootball?.status === 'live' ? 'right now' : footballDays === 1 ? 'day to match' : 'days to match',
      bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.22)',
    },
  ];

  const todayDay = APP_TODAY.getDate();
  const tomorrowDay = todayDay + 1;
  const upcoming = [
    ...(CAL_EVENTS[todayDay] || []).map(e => ({
      title: e.t, cat: CAT_LABELS[e.c] || e.c, color: CAT[e.c] || '#6c6c80', when: 'Today',
    })),
    ...(CAL_EVENTS[tomorrowDay] || []).map(e => ({
      title: e.t, cat: CAT_LABELS[e.c] || e.c, color: CAT[e.c] || '#6c6c80', when: 'Tomorrow',
    })),
  ].slice(0, 6);

  const sessionNum = activeCourse ? activeCourse.done + 1 : null;
  const sessionTitle = activeCourse
    ? `${activeCourse.name} — Day ${sessionNum}`
    : 'All courses complete!';
  const sessionSub = activeCourse
    ? `Anthropic Academy · Phase ${activeCourse.phase + 1} · Session ${sessionNum} of ${activeCourse.total}`
    : 'You\'ve finished the full certification programme';

  const mob = state.isMobile;

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
            fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: mob ? 28 : 42,
            lineHeight: 1.08, letterSpacing: '-0.015em', margin: '8px 0 6px',
          }}>
            {greeting}, <em>{user.first}</em> {greetingIcon}
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

      {/* MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: mob ? '1fr' : 'repeat(12,1fr)', gap: mob ? 14 : 18, alignItems: 'start' }}>

        {/* LEARNING SESSION TIMER */}
        <Card span={7}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#6366f1,#a855f7)' }} />
          <SectionLabel dot="#6366f1" color="#a5b4fc" text="Today's Learning Session" />
          <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 25, margin: '6px 0 2px' }}>{sessionTitle}</h3>
          <div style={{ fontSize: 13.5, color: 'var(--text-3)', marginBottom: 18 }}>{sessionSub}</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Timer ring */}
            <div style={{ position: 'relative', width: 128, height: 128, flex: '0 0 128px' }}>
              <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="64" cy="64" r="56" fill="none" stroke="var(--border)" strokeWidth="9"/>
                <circle
                  cx="64" cy="64" r="56" fill="none" stroke="#6366f1"
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
                  background: state.timerRunning ? '#a855f7' : '#6366f1',
                  boxShadow: '0 8px 22px rgba(99,102,241,0.35)',
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
        </Card>

        {/* MEDICATION */}
        <Card span={5}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel dot="#10b981" color="#6ee7b7" text="Medication" />
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
              {state.meds.filter(m => m.done).length}/{state.meds.length}
            </span>
          </div>
          {state.meds.map(m => (
            <CheckRow
              key={m.id}
              done={m.done}
              onToggle={() => dispatch({ type: 'TOGGLE_MED', id: m.id })}
              label={m.name}
              sublabel={m.dose}
              tagLabel={m.time}
              tagBg={m.time === 'Morning' ? 'rgba(245,158,11,0.16)' : 'rgba(99,102,241,0.16)'}
              tagColor={m.time === 'Morning' ? '#fcd34d' : '#a5b4fc'}
              accent="#10b981"
            />
          ))}
          {state.meds.every(m => m.done) && (
            <div style={{ fontSize: 12.5, color: '#34d399', textAlign: 'center', padding: '10px 0 2px', fontWeight: 600 }}>
              ✓ All medications taken today
            </div>
          )}
        </Card>

        {/* WORK TASKS */}
        <Card span={6}>
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
        </Card>

        {/* PERSONAL TASKS */}
        <Card span={6}>
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
        </Card>

        {/* SPORTS TICKER */}
        <Card span={7}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel dot="#ef4444" color="#fca5a5" text="Sports Ticker" />
            <button
              onClick={() => dispatch({ type: 'SET_SECTION', section: 'sports' })}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >All sports →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {sportsTicker.map((s, i) => (
              <div key={i} style={{
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
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: s.accent }}>{s.count}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.countUnit}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* RAKHI COUNTDOWN */}
        <section style={{
          gridColumn: 'span 5', borderRadius: 22, padding: 24,
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(212,175,55,0.18), rgba(244,63,94,0.12))',
          border: '1px solid rgba(212,175,55,0.28)',
        }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.18 }}>
            <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1">
              <circle cx="12" cy="12" r="3.5"/>
              <path d="M12 8.5V3M12 15.5V21M8.5 12H3M15.5 12H21M9.5 9.5L6 6M14.5 9.5L18 6M9.5 14.5L6 18M14.5 14.5L18 18"/>
            </svg>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#e9c46a', marginBottom: 6 }}>
              Coming up · Festival
            </div>
            <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 27, margin: '2px 0' }}>Raksha Bandhan</h3>
            <div style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>Friday, 28 August 2026</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: '#f0c869' }}>{RAKHI_DAYS}</span>
              <span style={{ fontSize: 15, color: 'var(--text-2)' }}>days away</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px',
              background: 'rgba(244,63,94,0.14)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 12,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2">
                <path d="M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>
              </svg>
              <span style={{ fontSize: 12.5, color: '#fda4af', fontWeight: 500 }}>
                Rakhi mode: order rakhis in {RAKHI_DAYS - 21} days
              </span>
            </div>
          </div>
        </section>

        {/* UPCOMING 48H */}
        <Card span={7}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7' }} />
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
        </Card>

        {/* FAMILY FEED */}
        <Card span={5}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)' }}>Family Feed</span>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_SECTION', section: 'family' })}
              style={{ fontSize: 12, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >Open →</button>
          </div>
          {FAMILY_FEED.map((f, fi) => (
            <div key={fi} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, background: f.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: '#fff',
                }}>
                  {f.initials}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{f.role}</div>
              </div>
              {f.items.map((it, ii) => (
                <div key={ii} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '5px 0 5px 35px', fontSize: 13, color: 'var(--text-2)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: it.dot, flex: '0 0 6px' }} />
                  <span style={{ flex: 1 }}>{it.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{it.time}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>

      </div>
      <div style={{ height: 40 }} />
    </div>
  );
}
