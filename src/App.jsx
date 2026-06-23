import { useEffect, useState, lazy, Suspense, useRef } from 'react';
import posthog from 'posthog-js';
import { useAppStore } from './store/appStore';
import { api } from './api/client';
import { fmtApptDate } from './utils/dateUtils';
import { parseICS } from './utils/icsParser';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import BottomTabBar from './components/layout/BottomTabBar';
import { ClerkBridge, ClerkAuthGuard } from './components/ClerkBridge';
import InviteAcceptModal from './components/InviteAcceptModal';
import ErrorBoundary from './components/ui/ErrorBoundary';

const TodayDashboard = lazy(() => import('./components/sections/TodayDashboard'));
const CalendarView = lazy(() => import('./components/sections/CalendarView'));
const LearningPlanner = lazy(() => import('./components/sections/LearningPlanner'));
const TasksBoard = lazy(() => import('./components/sections/TasksBoard'));
const HealthWellness = lazy(() => import('./components/sections/HealthWellness'));
const BirthdaysAnniversaries = lazy(() => import('./components/sections/BirthdaysAnniversaries'));
const FinanceTracker = lazy(() => import('./components/sections/FinanceTracker'));
const FestivalsRecurring = lazy(() => import('./components/sections/FestivalsRecurring'));
const SportsTracker = lazy(() => import('./components/sections/SportsTracker'));
const FamilySpace = lazy(() => import('./components/sections/FamilySpace'));
const SettingsProfiles = lazy(() => import('./components/sections/SettingsProfiles'));
const HobbyTracker = lazy(() => import('./components/sections/HobbyTracker'));
const FoodPlanner = lazy(() => import('./components/sections/FoodPlanner'));
const HomeManagement = lazy(() => import('./components/sections/HomeManagement'));

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const SECTIONS = {
  today: TodayDashboard,
  calendar: CalendarView,
  learning: LearningPlanner,
  tasks: TasksBoard,
  health: HealthWellness,
  birthdays: BirthdaysAnniversaries,
  finance: FinanceTracker,
  festivals: FestivalsRecurring,
  sports: SportsTracker,
  hobby: HobbyTracker,
  food: FoodPlanner,
  home: HomeManagement,
  family: FamilySpace,
  settings: SettingsProfiles,
};

// Loads all DB data after auth is confirmed.
// Rendered inside ClerkAuthGuard (Clerk mode) or directly (dev mode),
// so ClerkBridge always sets the token getter before this mounts.
function AppDataLoader({ dispatch, state }) {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);

    Promise.allSettled([
      api.getTasks(),
      api.getMeds(today),
      api.getHabits(today),
      api.getAppts(),
      api.getShopping(),
      api.getCourses(),
      api.getPaid(month),
      api.getFamilyMembers(),
      api.getFamilyGroups(),
      api.getFamilyEvents(),
      api.getCalendarSubscriptions(),
      api.getSportSubscriptions(),
      api.getHousehold(),
      api.getProfile(),
    ]).then(([tasks, meds, habits, appts, shopping, courses, paid, rawMembers, rawGroups, rawEvents, calSubs, sportSubs, household, profile]) => {
      const data = {};
      if (tasks.status === 'fulfilled') {
        data.workTasks     = tasks.value.work     || [];
        data.personalTasks = tasks.value.personal || [];
      }
      if (meds.status === 'fulfilled') {
        data.meds = meds.value.map(m => ({
          ...m,
          prescriptionId: m.prescription_id,
          startDate: m.start_date,
          endDate: m.end_date,
        }));
      }
      if (habits.status  === 'fulfilled') data.habits       = habits.value;
      if (appts.status   === 'fulfilled') {
        data.appointments = appts.value.map(a => ({
          ...a,
          date: fmtApptDate(a.appt_date)
        }));
      }
      if (profile.status === 'fulfilled') {
        data.userGender          = profile.value.gender ?? 'prefer-not-to-say';
        data.householdCycleShared = profile.value.share_cycle_tracker ?? false;
      }
      if (shopping.status === 'fulfilled') data.shopList    = shopping.value;
      if (courses.status === 'fulfilled' && courses.value.length) {
        data.courses = courses.value.map(row => ({
          id:      row.id,
          name:    row.name,
          phase:   row.phase,
          total:   row.total,
          done:    row.done,
          next:    row.next,
          nextISO: row.next_iso,
          url:     row.url || '',
          planId:  row.plan_id ?? 1,
        }));
      }
      if (paid.status    === 'fulfilled') data.financePaid  = paid.value;
      if (rawMembers.status === 'fulfilled') {
        data.familyMembers = rawMembers.value.map(r => ({
          id: r.id, realName: r.real_name, petName: r.pet_name,
          side: r.side, group: r.group_id, relation: r.relation || '',
          bday: r.bday_month ? [r.bday_month, r.bday_day] : null,
        }));
      }
      if (rawGroups.status === 'fulfilled') data.familyGroups = rawGroups.value;
      if (rawEvents.status === 'fulfilled') {
        data.familyEvents = rawEvents.value.map(r => ({
          id: r.id, label: r.label, type: r.type, side: r.side,
          group: r.group_id, m: r.event_month, d: r.event_day,
        }));
      }
      if (calSubs.status === 'fulfilled' && Array.isArray(calSubs.value.calendars)) {
        data.subscribedCalendars = calSubs.value.calendars;
      }
      if (sportSubs.status === 'fulfilled' && Array.isArray(sportSubs.value.subscriptions)) {
        data.sportSubscriptions = sportSubs.value.subscriptions;
      }
      if (household.status === 'fulfilled' && household.value.householdId) {
        data.householdId = household.value.householdId;
      }

      if (Object.keys(data).length) {
        dispatch({ type: 'BOOTSTRAP', data });
      }

      if (state.lastResetDate !== today) {
        dispatch({ type: 'DAILY_RESET' });
      }

      const enabledFeeds = state.icsFeeds || [];
      const now = Date.now();
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      enabledFeeds.forEach(feed => {
        if (feed.enabled && (!feed.lastSynced || (now - new Date(feed.lastSynced).getTime() > SIX_HOURS))) {
          api.fetchProxyIcs(feed.url)
            .then(res => {
              if (res && res.text) {
                const events = parseICS(res.text);
                dispatch({ type: 'SYNC_ICS_FEED', id: feed.id, events, lastSynced: new Date().toISOString() });
              }
            })
            .catch(() => {});
        }
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  const { state, dispatch } = useAppStore();

  const [inviteToken, setInviteToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite_token') || null;
  });

  useEffect(() => {
    const handleResize = () => {
      dispatch({ type: 'SET_MOBILE', isMobile: window.innerWidth < 900 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  const prevSection = useRef(null);
  useEffect(() => {
    if (state.section !== prevSection.current) {
      prevSection.current = state.section;
      if (import.meta.env.VITE_POSTHOG_KEY) {
        posthog.capture('section_view', { section: state.section });
      }
    }
  }, [state.section]);

  const SectionComponent = SECTIONS[state.section] || TodayDashboard;

  const appShell = (
    <div style={{
      display: 'flex', minHeight: '100vh', width: '100%',
      background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: -180, left: 120, width: 540, height: 540,
        borderRadius: '50%',
        background: 'radial-gradient(circle, var(--glow), transparent 70%)',
        filter: 'blur(20px)', pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Sidebar — desktop only */}
      {!state.isMobile && <Sidebar />}

      {/* Main */}
      <main style={{
        flex: 1, minWidth: 0, height: '100vh',
        overflowY: 'auto', position: 'relative', zIndex: 1,
        paddingBottom: state.isMobile ? 'calc(72px + env(safe-area-inset-bottom))' : 40,
      }}>
        <TopBar />
        <ErrorBoundary key={state.section}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)' }}>
              <div style={{
                width: 32, height: 32,
                border: '3px solid var(--accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'om-spin 1s linear infinite'
              }} />
            </div>
          }>
            <SectionComponent />
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Bottom tab bar — mobile only */}
      {state.isMobile && <BottomTabBar />}

      {/* Invite acceptance modal */}
      {inviteToken && (
        <InviteAcceptModal
          token={inviteToken}
          onClose={() => {
            window.history.replaceState({}, '', '/');
            setInviteToken(null);
          }}
        />
      )}
    </div>
  );

  if (CLERK_KEY) {
    // ClerkBridge mounts first (sets token getter), then AppDataLoader fires its
    // useEffect — guaranteed because siblings' effects run top-to-bottom in React.
    return (
      <ClerkAuthGuard>
        <ClerkBridge />
        <AppDataLoader dispatch={dispatch} state={state} />
        {appShell}
      </ClerkAuthGuard>
    );
  }

  // Dev mode: no Clerk, token getter stays null, backend falls back to 'jagdeep'.
  return (
    <>
      <AppDataLoader dispatch={dispatch} state={state} />
      {appShell}
    </>
  );
}
