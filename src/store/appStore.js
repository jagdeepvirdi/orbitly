import { createContext, useContext, useReducer, useEffect, createElement } from 'react';
import { SEED_WORK_TASKS, SEED_PERSONAL_TASKS } from '../data/seedTasks';
import { SEED_CHORES } from '../data/seedChores';
import { CERT_COURSES } from '../data/certPlan';
import { addWorkdayToISO, fmtShortDate } from '../utils/dateUtils';
import { hexToRgba } from '../utils/colorUtils';
import { DEFAULT_TODAY_LAYOUT, normalizeTodayLayout } from '../data/todayLayout';



export const CAT = {
  work: '#64748b',
  learning: '#6366f1', // eslint-disable-line no-restricted-syntax -- fixed category color, not the brand accent
  family: '#f59e0b',
  health: '#10b981',
  sports: '#ef4444',
  festival: '#d4af37',
  recurring: '#a855f7', // eslint-disable-line no-restricted-syntax -- fixed category color, not the brand accent
  holiday: '#eab308',
  hobby: '#f97316',
  food: '#84cc16',
  // Calendar pack accent colors
  hindu:          '#f59e0b',
  sikh:           '#fb923c',
  islamic:        '#34d399',
  'thai-buddhist':'#a855f7', // eslint-disable-line no-restricted-syntax -- fixed calendar-pack color, not the brand accent
  christian:      '#3b82f6',
  jain:           '#a78bfa',
};

export const PRIORITY = {
  Urgent: { bg: 'rgba(239,68,68,0.16)', color: '#fca5a5' },
  High:   { bg: 'rgba(245,158,11,0.16)', color: '#fcd34d' },
  Normal: { bg: 'rgba(99,102,241,0.16)', color: '#a5b4fc' },
  Low:    { bg: 'rgba(148,163,184,0.16)', color: '#cbd5e1' },
};

export function createInitialState() {
  const now = new Date();
  return {
  theme: 'dark',
  userId: 'jagdeep',
  accent: '#1d98d9',
  todayLayout: DEFAULT_TODAY_LAYOUT,
  section: 'today',
  isMobile: false,
  timer: 3600,
  timerRunning: false,
  meds: [],
  workTasks: SEED_WORK_TASKS,
  personalTasks: SEED_PERSONAL_TASKS,
  calView: 'month',
  calMonth: now.getMonth(),
  calYear: now.getFullYear(),
  overlays: { festivals: true, sports: true, holidays: true },
  rescheduleDismissed: false,
  taskView: 'kanban',
  courses: CERT_COURSES,
  examDone: false,
  habits: [],
  appointments: [],
  cycleDay: 14,
  userGender: 'prefer-not-to-say',
  householdCycleShared: false,
  userCurrencies: ['INR', 'THB', 'USD'],
  prescriptions: [],
  testResults: [],
  sportSubscriptions: [
    { sport: 'f1', leagues: [] },
    { sport: 'cricket', leagues: ['ipl'] },
    { sport: 'football', leagues: ['PL', 'CL'] }
  ],
  lastResetDate: null,
  shopList: [],
  notifications: {
    meds: true, learning: true, festivals: true, f1race: true,
    birthday: true, evening_wrap: true, weekly_digest: true,
  },
  settingsTab: 'profiles',
  familyMembers: [],     // loaded from DB on mount
  familyGroups:  [],     // loaded from DB on mount
  familyEvents:  [],     // loaded from DB on mount
  familyContacts: {},   // kept for inline edits before DB save; authoritative source is family_contacts table
  familyTab: 'wall',    // 'wall' | 'directory'
  financePaid: [],      // [{ item_type, item_id, paid }] — loaded via BOOTSTRAP for current month
  importedCalEvents: [], // [{ id, title, date, time, endTime, category, importBatch, importedAt }]
  importHistory: [],     // [{ id, filename, category, count, importedAt }]
  recipes: [],           // [{ id, title, category, cuisine, servings, ingredients, steps, sourceType, importedAt }]
  mealPlan: {},          // { 'YYYY-MM-DD-breakfast': recipeId, ... }
  hobbyProjects: [],     // [{ id, name, color, desc, progress, createdAt }]
  hobbyLog: [],          // [{ id, hobby, date, duration, notes }]
  choreList: SEED_CHORES, // [{ id, name, emoji, category, frequencyDays, lastDone, notes }]
  subscribedCalendars: ['IN', 'TH', 'hindu', 'sikh'], // enabled calendar packs
  icsFeeds: [],
  householdId: null,     // loaded from DB on mount — not persisted locally
  pinnedFestivals: [],   // loaded from DB on mount — not persisted locally
  pinnedCourses: [],     // loaded from DB on mount — not persisted locally
  };
}

// UI prefs + user-authored data (meds, prescriptions) are persisted locally in v1.
// Prescription file blobs live in a separate localStorage key ('orbitly-rx-files').
const PERSIST_KEYS = [
  'theme', 'userId', 'accent', 'todayLayout', 'examDone', 'cycleDay',
  'userGender', 'householdCycleShared', 'userCurrencies',
  'sportSubscriptions', 'overlays', 'notifications',
  'taskView', 'calView', 'rescheduleDismissed',
  'timer', 'lastResetDate',
  'familyTab',
  'prescriptions', 'testResults',
  'importedCalEvents', 'importHistory',
  'recipes', 'mealPlan',
  'hobbyProjects', 'hobbyLog',
  'choreList',
  'subscribedCalendars',
  'icsFeeds',
];

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('orbitly-state');
    if (!saved) return {};
    const parsed = JSON.parse(saved);

    // Migration from sportsToggles to sportSubscriptions
    if (parsed.sportsToggles && !parsed.sportSubscriptions) {
      const subs = [];
      const toggles = parsed.sportsToggles;
      if (toggles.f1) subs.push({ sport: 'f1', leagues: [] });
      if (toggles.cricket) subs.push({ sport: 'cricket', leagues: ['ipl'] });
      if (toggles.football) subs.push({ sport: 'football', leagues: ['PL', 'CL'] });
      if (toggles.badminton || toggles.tennis) {
        subs.push({ sport: 'tennis', leagues: ['wimbledon', 'us-open', 'french-open', 'aus-open'] });
      }
      parsed.sportSubscriptions = subs;
    }

    // Reconcile against the current default widget set — merges in any
    // widget added since this layout was saved and drops any since removed.
    if (parsed.todayLayout !== undefined) {
      parsed.todayLayout = normalizeTodayLayout(parsed.todayLayout);
    }

    return Object.fromEntries(
      PERSIST_KEYS.filter(k => parsed[k] !== undefined).map(k => [k, parsed[k]])
    );
  } catch {
    return {};
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem('orbitly-state', JSON.stringify(
      Object.fromEntries(PERSIST_KEYS.map(k => [k, state[k]]))
    ));
  } catch {}
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, userId: action.id };
    case 'SET_PINNED_FESTIVALS':
      return { ...state, pinnedFestivals: action.ids };
    case 'PIN_FESTIVAL':
      return { ...state, pinnedFestivals: [...state.pinnedFestivals, action.id] };
    case 'UNPIN_FESTIVAL':
      return { ...state, pinnedFestivals: state.pinnedFestivals.filter(id => id !== action.id) };
    case 'SET_PINNED_COURSES':
      return { ...state, pinnedCourses: action.ids };
    case 'PIN_COURSE':
      return { ...state, pinnedCourses: [...state.pinnedCourses, action.id] };
    case 'UNPIN_COURSE':
      return { ...state, pinnedCourses: state.pinnedCourses.filter(id => id !== action.id) };
    case 'SET_SECTION':
      return { ...state, section: action.section };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    case 'SET_ACCENT':
      return { ...state, accent: action.color };
    case 'SET_TODAY_LAYOUT':
      return { ...state, todayLayout: action.layout };
    case 'SET_WIDGET_SPAN':
      return {
        ...state,
        todayLayout: state.todayLayout.map(w => w.id === action.id ? { ...w, span: action.span } : w),
      };
    case 'RESET_TODAY_LAYOUT':
      return { ...state, todayLayout: DEFAULT_TODAY_LAYOUT };
    case 'SET_MOBILE':
      return { ...state, isMobile: action.isMobile };
    case 'TOGGLE_MED':
      return { ...state, meds: state.meds.map(m => m.id === action.id ? { ...m, done: !m.done } : m) };
    case 'ADD_MED':
      return { ...state, meds: [...state.meds, action.med] };
    case 'UPDATE_MED':
      return { ...state, meds: state.meds.map(m => m.id === action.id ? { ...m, ...action.med } : m) };
    case 'DELETE_MED':
      return { ...state, meds: state.meds.filter(m => m.id !== action.id) };
    case 'ADD_PRESCRIPTION': {
      const rx = {
        id: action.id, name: action.name, doctor: action.doctor,
        date: action.date, who: action.who, fileName: action.fileName,
        fileType: action.fileType, uploadedAt: new Date().toISOString(),
      };
      return { ...state, prescriptions: [...state.prescriptions, rx] };
    }
    case 'DELETE_PRESCRIPTION':
      return {
        ...state,
        prescriptions: state.prescriptions.filter(r => r.id !== action.id),
        meds: state.meds.map(m => m.prescriptionId === action.id ? { ...m, prescriptionId: null } : m),
      };
    case 'ADD_TEST_RESULT': {
      const tr = {
        id: action.id, name: action.name, category: action.category,
        lab: action.lab, date: action.date, who: action.who,
        doctor: action.doctor || '', notes: action.notes || '',
        fileName: action.fileName, fileType: action.fileType,
        tests: Array.isArray(action.tests) ? action.tests : [],
        uploadedAt: new Date().toISOString(),
      };
      return { ...state, testResults: [...state.testResults, tr] };
    }
    case 'UPDATE_TEST_RESULT':
      return { ...state, testResults: state.testResults.map(r => r.id === action.id ? { ...r, ...action.updates } : r) };
    case 'DELETE_TEST_RESULT':
      return { ...state, testResults: state.testResults.filter(r => r.id !== action.id) };
    case 'TOGGLE_TASK': {
      const list = action.list;
      return { ...state, [list]: state[list].map(t => t.id === action.id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t) };
    }
    case 'ADVANCE_TASK': {
      const list = action.list;
      const order = ['todo', 'doing', 'done'];
      return { ...state, [list]: state[list].map(t => t.id === action.id ? { ...t, status: order[(order.indexOf(t.status) + 1) % 3] } : t) };
    }
    case 'TOGGLE_HABIT':
      return { ...state, habits: state.habits.map(h => h.id === action.id ? { ...h, done: !h.done } : h) };
    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.habit] };
    case 'UPDATE_HABIT':
      return { ...state, habits: state.habits.map(h => h.id === action.id ? { ...h, ...action.fields } : h) };
    case 'DELETE_HABIT':
      return { ...state, habits: state.habits.filter(h => h.id !== action.id) };
    case 'TOGGLE_APPT':
      return { ...state, appointments: state.appointments.map(a => a.id === action.id ? { ...a, done: !a.done } : a) };
    case 'ADD_APPT':
      return { ...state, appointments: [...state.appointments, action.appt] };
    case 'UPDATE_APPT':
      return { ...state, appointments: state.appointments.map(a => a.id === action.id ? { ...a, ...action.appt } : a) };
    case 'DELETE_APPT':
      return { ...state, appointments: state.appointments.filter(a => a.id !== action.id) };
    case 'SET_GENDER':
      return { ...state, userGender: action.gender };
    case 'SET_CYCLE_SHARED':
      return { ...state, householdCycleShared: action.shared };
    case 'SET_CURRENCIES':
      return { ...state, userCurrencies: action.currencies };
    case 'TOGGLE_SHOP':
      return { ...state, shopList: state.shopList.map(i => i.id === action.id ? { ...i, done: !i.done } : i) };
    case 'ADD_SHOP':
      return { ...state, shopList: [...state.shopList, action.shopItem] };
    case 'ADD_TASK':
      return { ...state, [action.list]: [...state[action.list], action.task] };
    case 'DELETE_TASK': {
      const list = action.list;
      return { ...state, [list]: state[list].filter(t => t.id !== action.id) };
    }
    case 'SET_CAL_VIEW':
      return { ...state, calView: action.view };
    case 'CAL_NAV': {
      let m = state.calMonth + action.dir, y = state.calYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { ...state, calMonth: m, calYear: y };
    }
    case 'TOGGLE_OVERLAY':
      return { ...state, overlays: { ...state.overlays, [action.key]: !state.overlays[action.key] } };
    case 'SET_TASK_VIEW':
      return { ...state, taskView: action.view };
    case 'SYNC_COURSES':
      return { ...state, courses: action.courses };
    case 'ADD_COURSE':
      return { ...state, courses: [...state.courses, action.course] };
    case 'DELETE_COURSE':
      return { ...state, courses: state.courses.filter(c => c.id !== action.id) };
    case 'ADD_SESSION':
      return {
        ...state,
        courses: state.courses.map(c => {
          if (c.id !== action.id) return c;
          return { ...c, done: Math.min(c.total, c.done + 1) };
        }),
      };
    case 'REMOVE_SESSION':
      return {
        ...state,
        courses: state.courses.map(c => c.id === action.id ? { ...c, done: Math.max(0, c.done - 1) } : c),
      };
    case 'PUSH_SESSIONS': {
      const fromIdx = state.courses.findIndex(c => c.id === action.id);
      if (fromIdx === -1) return state;
      const courses = state.courses.map((c, i) => {
        if (i < fromIdx || !c.nextISO) return c;
        const newISO = addWorkdayToISO(c.nextISO);
        return { ...c, nextISO: newISO, next: fmtShortDate(newISO) };
      });
      return { ...state, courses, rescheduleDismissed: false };
    }
    case 'PASS_EXAM':
      return { ...state, examDone: true };
    case 'TOGGLE_NOTIF':
      return { ...state, notifications: { ...state.notifications, [action.key]: !state.notifications[action.key] } };
    case 'SET_SETTINGS_TAB':
      return { ...state, settingsTab: action.tab };
    case 'ADD_SPORT_SUBSCRIPTION': {
      if (state.sportSubscriptions.some(s => s.sport === action.sport)) return state;
      return {
        ...state,
        sportSubscriptions: [...state.sportSubscriptions, { sport: action.sport, leagues: action.leagues || [] }]
      };
    }
    case 'REMOVE_SPORT_SUBSCRIPTION': {
      return {
        ...state,
        sportSubscriptions: state.sportSubscriptions.filter(s => s.sport !== action.sport)
      };
    }
    case 'UPDATE_SPORT_LEAGUES': {
      return {
        ...state,
        sportSubscriptions: state.sportSubscriptions.map(s => {
          if (s.sport === action.sport) {
            return { ...s, leagues: action.leagues };
          }
          return s;
        })
      };
    }
    case 'SET_FAMILY_CONTACT': {
      const prev = state.familyContacts[action.id] || {};
      return { ...state, familyContacts: { ...state.familyContacts, [action.id]: { ...prev, ...action.fields } } };
    }
    case 'SET_FAMILY_TAB':
      return { ...state, familyTab: action.tab };
    case 'DISMISS_RESCHEDULE':
      return { ...state, rescheduleDismissed: true };

    // ── Imported calendar events ──────────────────────────────────
    case 'ADD_CAL_EVENTS': {
      const batchId = 'b' + Date.now();
      const now = new Date().toISOString();
      const evs = action.events.map(e => ({ ...e, category: action.category, importBatch: batchId, importedAt: now }));
      const batch = { id: batchId, filename: action.filename, category: action.category, count: evs.length, importedAt: now };
      return { ...state, importedCalEvents: [...state.importedCalEvents, ...evs], importHistory: [batch, ...state.importHistory] };
    }
    case 'DELETE_CAL_BATCH':
      return {
        ...state,
        importedCalEvents: state.importedCalEvents.filter(e => e.importBatch !== action.batchId),
        importHistory: state.importHistory.filter(b => b.id !== action.batchId),
      };
    case 'ADD_ICS_FEED': {
      const feed = {
        id: action.id || ('feed_' + Date.now()),
        name: action.name,
        url: action.url,
        lastSynced: action.lastSynced || null,
        enabled: true,
      };
      return { ...state, icsFeeds: [...(state.icsFeeds || []), feed] };
    }
    case 'DELETE_ICS_FEED':
      return {
        ...state,
        icsFeeds: (state.icsFeeds || []).filter(f => f.id !== action.id),
        importedCalEvents: (state.importedCalEvents || []).filter(e => e.importBatch !== action.id)
      };
    case 'TOGGLE_ICS_FEED': {
      const nextFeeds = (state.icsFeeds || []).map(f =>
        f.id === action.id ? { ...f, enabled: !f.enabled } : f
      );
      const targetFeed = nextFeeds.find(f => f.id === action.id);
      let nextEvents = state.importedCalEvents || [];
      if (targetFeed && !targetFeed.enabled) {
        nextEvents = nextEvents.filter(e => e.importBatch !== action.id);
      }
      return {
        ...state,
        icsFeeds: nextFeeds,
        importedCalEvents: nextEvents
      };
    }
    case 'SYNC_ICS_FEED': {
      const updatedFeeds = (state.icsFeeds || []).map(f =>
        f.id === action.id ? { ...f, lastSynced: action.lastSynced || new Date().toISOString() } : f
      );
      const otherEvents = (state.importedCalEvents || []).filter(e => e.importBatch !== action.id);
      const newEvents = (action.events || []).map(e => ({
        ...e,
        category: 'custom_ics',
        importBatch: action.id,
        importedAt: action.lastSynced || new Date().toISOString()
      }));
      return {
        ...state,
        icsFeeds: updatedFeeds,
        importedCalEvents: [...otherEvents, ...newEvents]
      };
    }

    // ── Recipes ──────────────────────────────────────────────────
    case 'ADD_RECIPE': {
      const recipe = { id: 'r' + Date.now(), importedAt: new Date().toISOString(), ...action.recipe };
      return { ...state, recipes: [...state.recipes, recipe] };
    }
    case 'DELETE_RECIPE':
      return { ...state, recipes: state.recipes.filter(r => r.id !== action.id) };
    case 'SET_MEAL':
      return { ...state, mealPlan: { ...state.mealPlan, [action.key]: action.recipeId } };
    case 'CLEAR_MEAL': {
      const mp = { ...state.mealPlan };
      delete mp[action.key];
      return { ...state, mealPlan: mp };
    }

    // ── Hobby ────────────────────────────────────────────────────
    case 'ADD_HOBBY_PROJECT': {
      const project = { id: 'hp' + Date.now(), createdAt: new Date().toISOString(), progress: 0, ...action.project };
      return { ...state, hobbyProjects: [...state.hobbyProjects, project] };
    }
    case 'DELETE_HOBBY_PROJECT':
      return { ...state, hobbyProjects: state.hobbyProjects.filter(p => p.id !== action.id) };
    case 'UPDATE_HOBBY_PROJECT':
      return { ...state, hobbyProjects: state.hobbyProjects.map(p => p.id === action.id ? { ...p, ...action.fields } : p) };
    case 'ADD_HOBBY_LOG': {
      const entry = { id: 'hl' + Date.now(), ...action.entry };
      return { ...state, hobbyLog: [entry, ...state.hobbyLog] };
    }
    case 'DELETE_HOBBY_LOG':
      return { ...state, hobbyLog: state.hobbyLog.filter(e => e.id !== action.id) };

    // ── Household Chores ─────────────────────────────────────────────
    case 'ADD_CHORE': {
      const chore = { id: 'ch' + Date.now(), ...action.chore };
      return { ...state, choreList: [...state.choreList, chore] };
    }
    case 'COMPLETE_CHORE': {
      const today = new Date().toISOString().slice(0, 10);
      return { ...state, choreList: state.choreList.map(c => c.id === action.id ? { ...c, lastDone: today } : c) };
    }
    case 'EDIT_CHORE':
      return { ...state, choreList: state.choreList.map(c => c.id === action.id ? { ...c, ...action.fields } : c) };
    case 'DELETE_CHORE':
      return { ...state, choreList: state.choreList.filter(c => c.id !== action.id) };

    // ── Shopping ─────────────────────────────────────────────────────
    case 'DELETE_SHOP':
      return { ...state, shopList: state.shopList.filter(i => i.id !== action.id) };
    case 'CLEAR_DONE_SHOP':
      return { ...state, shopList: state.shopList.filter(i => !i.done) };

    case 'TOGGLE_CALENDAR_PACK': {
      const id = action.calendarId;
      const current = state.subscribedCalendars || [];
      const next = current.includes(id)
        ? current.filter(c => c !== id)
        : [...current, id];
      return { ...state, subscribedCalendars: next };
    }

    case 'BOOTSTRAP':
      // Merge DB data into state; fallback seeds remain until bootstrap resolves.
      return { ...state, ...action.data };
    case 'DAILY_RESET':
      return {
        ...state,
        timer: 3600, timerRunning: false,
        lastResetDate: new Date().toISOString().slice(0, 10),
        meds: state.meds.map(m => ({ ...m, done: false })),
        habits: state.habits.map(h => ({ ...h, done: false })),
      };
    case 'TICK_TIMER':
      if (!state.timerRunning || state.timer <= 0) return state;
      return { ...state, timer: state.timer - 1, ...(state.timer - 1 <= 0 ? { timerRunning: false } : {}) };
    case 'TOGGLE_TIMER':
      return { ...state, timerRunning: !state.timerRunning };
    case 'RESET_TIMER':
      return { ...state, timer: 3600, timerRunning: false };
    case 'COMPLETE_TIMER':
      return { ...state, timer: 0, timerRunning: false };
    default:
      return state;
  }
}

const AppStoreContext = createContext(null);

export function AppStoreProvider({ children }) {
  const saved = loadFromStorage();
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...createInitialState(), ...saved }));

  // Deps are derived from PERSIST_KEYS (fixed-length array, so the hook's
  // dependency count is still stable across renders) so there's a single
  // source of truth for "what gets persisted" — see PERSIST_KEYS above.
  useEffect(() => {
    saveToStorage(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, PERSIST_KEYS.map(k => state[k]));



  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [state.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', state.accent);
    root.style.setProperty('--accent-soft', hexToRgba(state.accent, 0.16));
    root.style.setProperty('--glow', hexToRgba(state.accent, 0.2));
    root.style.setProperty('--hero-a', hexToRgba(state.accent, 0.22));
    root.style.setProperty('--hero-b', hexToRgba(state.accent, 0.08));
  }, [state.accent]);

  return createElement(AppStoreContext.Provider, { value: { state, dispatch } }, children);
}

export function useAppStore() {
  return useContext(AppStoreContext);
}
