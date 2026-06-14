import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { api } from './api/client';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import BottomTabBar from './components/layout/BottomTabBar';
import TodayDashboard from './components/sections/TodayDashboard';
import CalendarView from './components/sections/CalendarView';
import LearningPlanner from './components/sections/LearningPlanner';
import TasksBoard from './components/sections/TasksBoard';
import HealthWellness from './components/sections/HealthWellness';
import BirthdaysAnniversaries from './components/sections/BirthdaysAnniversaries';
import FinanceTracker from './components/sections/FinanceTracker';
import FestivalsRecurring from './components/sections/FestivalsRecurring';
import SportsTracker from './components/sections/SportsTracker';
import FamilySpace from './components/sections/FamilySpace';
import SettingsProfiles from './components/sections/SettingsProfiles';
import HobbyTracker from './components/sections/HobbyTracker';
import FoodPlanner from './components/sections/FoodPlanner';

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
  family: FamilySpace,
  settings: SettingsProfiles,
};

export default function App() {
  const { state, dispatch } = useAppStore();

  useEffect(() => {
    const handleResize = () => {
      dispatch({ type: 'SET_MOBILE', isMobile: window.innerWidth < 900 });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  // Bootstrap: load all domain data from DB on mount
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
    ]).then(([tasks, meds, habits, appts, shopping, courses, paid]) => {
      const data = {};
      if (tasks.status === 'fulfilled') {
        data.workTasks     = tasks.value.work     || [];
        data.personalTasks = tasks.value.personal || [];
      }
      if (meds.status    === 'fulfilled') data.meds         = meds.value;
      if (habits.status  === 'fulfilled') data.habits       = habits.value;
      if (appts.status   === 'fulfilled') data.appointments = appts.value;
      if (shopping.status=== 'fulfilled') data.shopList     = shopping.value;
      if (courses.status === 'fulfilled') data.courses      = courses.value;
      if (paid.status    === 'fulfilled') data.financePaid  = paid.value;
      if (Object.keys(data).length) dispatch({ type: 'BOOTSTRAP', data });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const SectionComponent = SECTIONS[state.section] || TodayDashboard;

  return (
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
        <SectionComponent />
      </main>

      {/* Bottom tab bar — mobile only */}
      {state.isMobile && <BottomTabBar />}
    </div>
  );
}
