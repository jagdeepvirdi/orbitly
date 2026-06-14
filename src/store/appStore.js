import { createContext, useContext, useReducer, useEffect, createElement } from 'react';
import { USERS, USER_ORDER } from '../data/users';
import { SEED_WORK_TASKS, SEED_PERSONAL_TASKS } from '../data/seedTasks';
import { CERT_COURSES } from '../data/certPlan';
import { addWorkdayToISO, fmtShortDate } from '../utils/dateUtils';

function fmtApptDate(iso) {
  if (!iso) return '';
  try {
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} ${y}`;
  } catch { return String(iso); }
}

export const CAT = {
  work: '#64748b',
  learning: '#6366f1',
  family: '#f59e0b',
  health: '#10b981',
  sports: '#ef4444',
  festival: '#d4af37',
  recurring: '#a855f7',
  holiday: '#eab308',
  hobby: '#f97316',
  food: '#84cc16',
};

export const PRIORITY = {
  Urgent: { bg: 'rgba(239,68,68,0.16)', color: '#fca5a5' },
  High:   { bg: 'rgba(245,158,11,0.16)', color: '#fcd34d' },
  Normal: { bg: 'rgba(99,102,241,0.16)', color: '#a5b4fc' },
  Low:    { bg: 'rgba(148,163,184,0.16)', color: '#cbd5e1' },
};

const _now = new Date();
const INITIAL_STATE = {
  theme: 'dark',
  userId: 'jagdeep',
  section: 'today',
  isMobile: false,
  timer: 3600,
  timerRunning: false,
  meds: [],
  workTasks: SEED_WORK_TASKS,
  personalTasks: SEED_PERSONAL_TASKS,
  calView: 'month',
  calMonth: _now.getMonth(),
  calYear: _now.getFullYear(),
  overlays: { festivals: true, sports: true, holidays: true },
  rescheduleDismissed: false,
  taskView: 'kanban',
  courses: CERT_COURSES,
  examDone: false,
  habits: [],
  appointments: [],
  cycleDay: 14,
  prescriptions: [],
  testResults: [],
  sportsToggles: { f1: true, cricket: true, football: true, badminton: false },
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
  directorySide: 'sahmbi', // 'sahmbi' | 'virdi'
  financePaid: [],      // [{ item_type, item_id, paid }] — loaded via BOOTSTRAP for current month
  importedCalEvents: [], // [{ id, title, date, time, endTime, category, importBatch, importedAt }]
  importHistory: [],     // [{ id, filename, category, count, importedAt }]
  recipes: [],           // [{ id, title, category, cuisine, servings, ingredients, steps, sourceType, importedAt }]
  mealPlan: {},          // { 'YYYY-MM-DD-breakfast': recipeId, ... }
  hobbyProjects: [],     // [{ id, name, color, desc, progress, createdAt }]
  hobbyLog: [],          // [{ id, hobby, date, duration, notes }]
};

// UI prefs + user-authored data (meds, prescriptions) are persisted locally in v1.
// Prescription file blobs live in a separate localStorage key ('orbitly-rx-files').
const PERSIST_KEYS = [
  'theme', 'userId', 'examDone', 'cycleDay',
  'sportsToggles', 'overlays', 'notifications',
  'taskView', 'calView', 'rescheduleDismissed',
  'timer', 'lastResetDate',
  'familyTab', 'directorySide',
  'prescriptions', 'testResults',
  'importedCalEvents', 'importHistory',
  'recipes', 'mealPlan',
  'hobbyProjects', 'hobbyLog',
];

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('orbitly-state');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
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

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, userId: action.id };
    case 'CYCLE_USER': {
      const i = USER_ORDER.indexOf(state.userId);
      return { ...state, userId: USER_ORDER[(i + 1) % 3] };
    }
    case 'SET_SECTION':
      return { ...state, section: action.section };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };
    case 'SET_MOBILE':
      return { ...state, isMobile: action.isMobile };
    case 'TOGGLE_MED':
      return { ...state, meds: state.meds.map(m => m.id === action.id ? { ...m, done: !m.done } : m) };
    case 'ADD_MED':
      return { ...state, meds: [...state.meds, action.med] };
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
        uploadedAt: new Date().toISOString(),
      };
      return { ...state, testResults: [...state.testResults, tr] };
    }
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
    case 'TOGGLE_APPT':
      return { ...state, appointments: state.appointments.map(a => a.id === action.id ? { ...a, done: !a.done } : a) };
    case 'TOGGLE_SHOP':
      return { ...state, shopList: state.shopList.map(i => i.id === action.id ? { ...i, done: !i.done } : i) };
    case 'ADD_SHOP':
      return { ...state, shopList: [...state.shopList, action.shopItem] };
    case 'ADD_TASK': {
      const task = { id: 't' + Date.now(), title: action.title, priority: action.priority || 'Normal', due: action.due || '', status: 'todo', overdue: false, recurring: false };
      return { ...state, [action.list]: [...state[action.list], task] };
    }
    case 'DELETE_TASK': {
      const list = action.list;
      return { ...state, [list]: state[list].filter(t => t.id !== action.id) };
    }
    case 'ADD_APPT':
      return { ...state, appointments: [...state.appointments, action.appt] };
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
    case 'TOGGLE_SPORT':
      return { ...state, sportsToggles: { ...state.sportsToggles, [action.sport]: !state.sportsToggles[action.sport] } };
    case 'SET_FAMILY_CONTACT': {
      const prev = state.familyContacts[action.id] || {};
      return { ...state, familyContacts: { ...state.familyContacts, [action.id]: { ...prev, ...action.fields } } };
    }
    case 'SET_FAMILY_TAB':
      return { ...state, familyTab: action.tab };
    case 'SET_DIRECTORY_SIDE':
      return { ...state, directorySide: action.side };
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
  const [state, dispatch] = useReducer(reducer, { ...INITIAL_STATE, ...saved });

  useEffect(() => {
    saveToStorage(state);
  }, PERSIST_KEYS.map(k => state[k]));

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastResetDate !== today) {
      dispatch({ type: 'DAILY_RESET' });
    }
    Promise.all([
      fetch('/api/meds?date='      + today).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/habits?date='    + today).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/appointments')           .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/shopping')               .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/family/members')         .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/family/groups')          .then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/family/events')          .then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([meds, habits, appts, shop, rawMembers, rawGroups, rawEvents]) => {
      dispatch({ type: 'BOOTSTRAP', data: {
        meds:         meds.map(m => ({ ...m, prescriptionId: m.prescription_id, startDate: m.start_date })),
        habits,
        appointments: appts.map(a => ({ ...a, date: fmtApptDate(a.appt_date) })),
        shopList:     shop,
        familyMembers: rawMembers.map(r => ({
          id: r.id, realName: r.real_name, petName: r.pet_name,
          side: r.side, group: r.group_id, relation: r.relation || '',
          bday: r.bday_month ? [r.bday_month, r.bday_day] : null,
        })),
        familyGroups: rawGroups,
        familyEvents: rawEvents.map(r => ({
          id: r.id, label: r.label, type: r.type, side: r.side,
          group: r.group_id, m: r.event_month, d: r.event_day,
        })),
      }});
    });
  }, []); // intentionally runs only on mount

  useEffect(() => {
    const root = document.documentElement;
    if (state.theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, [state.theme]);

  useEffect(() => {
    const user = USERS[state.userId];
    const root = document.documentElement;
    root.style.setProperty('--accent', user.accent);
    root.style.setProperty('--accent-soft', user.accentSoft);
    root.style.setProperty('--glow', user.glow);
  }, [state.userId]);

  return createElement(AppStoreContext.Provider, { value: { state, dispatch } }, children);
}

export function useAppStore() {
  return useContext(AppStoreContext);
}
