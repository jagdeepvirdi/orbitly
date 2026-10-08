import { describe, it, expect } from 'vitest';
import { reducer, createInitialState } from './appStore';

function baseState(overrides = {}) {
  return { ...createInitialState(), ...overrides };
}

describe('createInitialState', () => {
  it('seeds sensible defaults', () => {
    const s = createInitialState();
    expect(s.theme).toBe('dark');
    expect(s.userId).toBe('jagdeep');
    expect(s.timer).toBe(3600);
    expect(s.timerRunning).toBe(false);
    expect(s.sportSubscriptions).toEqual([]);
  });
});

describe('reducer: unknown action', () => {
  it('returns state unchanged for an unrecognized type', () => {
    const s = baseState();
    expect(reducer(s, { type: 'NOT_A_REAL_ACTION' })).toBe(s);
  });
});

describe('reducer: user / UI prefs', () => {
  it('SET_USER updates userId', () => {
    const s = reducer(baseState(), { type: 'SET_USER', id: 'wife' });
    expect(s.userId).toBe('wife');
  });

  it('TOGGLE_THEME flips dark <-> light', () => {
    let s = reducer(baseState({ theme: 'dark' }), { type: 'TOGGLE_THEME' });
    expect(s.theme).toBe('light');
    s = reducer(s, { type: 'TOGGLE_THEME' });
    expect(s.theme).toBe('dark');
  });

  it('SET_ACCENT sets the accent color', () => {
    const s = reducer(baseState(), { type: 'SET_ACCENT', color: '#86ba46' });
    expect(s.accent).toBe('#86ba46');
  });

  it('SET_MOBILE toggles isMobile', () => {
    const s = reducer(baseState(), { type: 'SET_MOBILE', isMobile: true });
    expect(s.isMobile).toBe(true);
  });

  it('SET_SECTION sets the active section', () => {
    const s = reducer(baseState(), { type: 'SET_SECTION', section: 'calendar' });
    expect(s.section).toBe('calendar');
  });
});

describe('reducer: Today layout', () => {
  it('SET_TODAY_LAYOUT replaces the layout array', () => {
    const layout = [{ id: 'w1', span: 6 }];
    const s = reducer(baseState(), { type: 'SET_TODAY_LAYOUT', layout });
    expect(s.todayLayout).toBe(layout);
  });

  it('SET_WIDGET_SPAN updates only the matching widget', () => {
    const s0 = baseState({ todayLayout: [{ id: 'w1', span: 6 }, { id: 'w2', span: 5 }] });
    const s = reducer(s0, { type: 'SET_WIDGET_SPAN', id: 'w2', span: 12 });
    expect(s.todayLayout).toEqual([{ id: 'w1', span: 6 }, { id: 'w2', span: 12 }]);
  });

  it('RESET_TODAY_LAYOUT restores the default layout', () => {
    const s0 = baseState({ todayLayout: [{ id: 'custom', span: 1 }] });
    const s = reducer(s0, { type: 'RESET_TODAY_LAYOUT' });
    expect(s.todayLayout).not.toEqual([{ id: 'custom', span: 1 }]);
  });
});

describe('reducer: pinned festivals / courses', () => {
  it('PIN_FESTIVAL appends, UNPIN_FESTIVAL removes', () => {
    let s = reducer(baseState(), { type: 'PIN_FESTIVAL', id: 'f1' });
    expect(s.pinnedFestivals).toEqual(['f1']);
    s = reducer(s, { type: 'PIN_FESTIVAL', id: 'f2' });
    expect(s.pinnedFestivals).toEqual(['f1', 'f2']);
    s = reducer(s, { type: 'UNPIN_FESTIVAL', id: 'f1' });
    expect(s.pinnedFestivals).toEqual(['f2']);
  });

  it('SET_PINNED_FESTIVALS replaces the whole list', () => {
    const s = reducer(baseState({ pinnedFestivals: ['old'] }), { type: 'SET_PINNED_FESTIVALS', ids: ['a', 'b'] });
    expect(s.pinnedFestivals).toEqual(['a', 'b']);
  });

  it('PIN_COURSE appends, UNPIN_COURSE removes', () => {
    let s = reducer(baseState(), { type: 'PIN_COURSE', id: 'c1' });
    expect(s.pinnedCourses).toEqual(['c1']);
    s = reducer(s, { type: 'UNPIN_COURSE', id: 'c1' });
    expect(s.pinnedCourses).toEqual([]);
  });

  it('SET_PINNED_COURSES replaces the whole list', () => {
    const s = reducer(baseState(), { type: 'SET_PINNED_COURSES', ids: ['x'] });
    expect(s.pinnedCourses).toEqual(['x']);
  });
});

describe('reducer: medications', () => {
  it('ADD_MED, TOGGLE_MED, UPDATE_MED, DELETE_MED', () => {
    let s = reducer(baseState(), { type: 'ADD_MED', med: { id: 'm1', name: 'Vitamin D', done: false } });
    expect(s.meds).toHaveLength(1);

    s = reducer(s, { type: 'TOGGLE_MED', id: 'm1' });
    expect(s.meds[0].done).toBe(true);
    s = reducer(s, { type: 'TOGGLE_MED', id: 'm1' });
    expect(s.meds[0].done).toBe(false);

    s = reducer(s, { type: 'UPDATE_MED', id: 'm1', med: { name: 'Vitamin D3' } });
    expect(s.meds[0].name).toBe('Vitamin D3');

    s = reducer(s, { type: 'DELETE_MED', id: 'm1' });
    expect(s.meds).toHaveLength(0);
  });
});

describe('reducer: prescriptions and test results', () => {
  it('ADD_PRESCRIPTION builds a record and DELETE_PRESCRIPTION unlinks meds', () => {
    let s = reducer(baseState({ meds: [{ id: 'm1', prescriptionId: 'rx1' }] }), {
      type: 'ADD_PRESCRIPTION',
      id: 'rx1', name: 'Amoxicillin', doctor: 'Dr. Rao', date: '2026-08-01', who: 'wife',
      fileName: 'rx.pdf', fileType: 'application/pdf',
    });
    expect(s.prescriptions).toHaveLength(1);
    expect(s.prescriptions[0].name).toBe('Amoxicillin');

    s = reducer(s, { type: 'DELETE_PRESCRIPTION', id: 'rx1' });
    expect(s.prescriptions).toHaveLength(0);
    expect(s.meds[0].prescriptionId).toBeNull();
  });

  it('ADD_TEST_RESULT, UPDATE_TEST_RESULT, DELETE_TEST_RESULT', () => {
    let s = reducer(baseState(), {
      type: 'ADD_TEST_RESULT', id: 't1', name: 'CBC', category: 'blood', lab: 'Bumrungrad',
      date: '2026-08-01', who: 'jagdeep', fileName: 'cbc.pdf', fileType: 'application/pdf',
    });
    expect(s.testResults).toHaveLength(1);

    s = reducer(s, { type: 'UPDATE_TEST_RESULT', id: 't1', updates: { notes: 'normal' } });
    expect(s.testResults[0].notes).toBe('normal');

    s = reducer(s, { type: 'DELETE_TEST_RESULT', id: 't1' });
    expect(s.testResults).toHaveLength(0);
  });
});

describe('reducer: tasks', () => {
  it('ADD_TASK, TOGGLE_TASK, ADVANCE_TASK, DELETE_TASK operate on the given list', () => {
    let s = reducer(baseState({ workTasks: [] }), {
      type: 'ADD_TASK', list: 'workTasks', task: { id: 'w1', status: 'todo' },
    });
    expect(s.workTasks).toHaveLength(1);

    s = reducer(s, { type: 'ADVANCE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks[0].status).toBe('doing');
    s = reducer(s, { type: 'ADVANCE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks[0].status).toBe('done');
    s = reducer(s, { type: 'ADVANCE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks[0].status).toBe('todo'); // wraps around

    s = reducer(s, { type: 'TOGGLE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks[0].status).toBe('done');
    s = reducer(s, { type: 'TOGGLE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks[0].status).toBe('todo');

    s = reducer(s, { type: 'DELETE_TASK', list: 'workTasks', id: 'w1' });
    expect(s.workTasks).toHaveLength(0);
  });
});

describe('reducer: habits and appointments', () => {
  it('habit lifecycle', () => {
    let s = reducer(baseState(), { type: 'ADD_HABIT', habit: { id: 'h1', done: false } });
    s = reducer(s, { type: 'TOGGLE_HABIT', id: 'h1' });
    expect(s.habits[0].done).toBe(true);
    s = reducer(s, { type: 'UPDATE_HABIT', id: 'h1', fields: { streak: 3 } });
    expect(s.habits[0].streak).toBe(3);
    s = reducer(s, { type: 'DELETE_HABIT', id: 'h1' });
    expect(s.habits).toHaveLength(0);
  });

  it('appointment lifecycle', () => {
    let s = reducer(baseState(), { type: 'ADD_APPT', appt: { id: 'a1', done: false } });
    s = reducer(s, { type: 'TOGGLE_APPT', id: 'a1' });
    expect(s.appointments[0].done).toBe(true);
    s = reducer(s, { type: 'UPDATE_APPT', id: 'a1', appt: { where: 'Bumrungrad' } });
    expect(s.appointments[0].where).toBe('Bumrungrad');
    s = reducer(s, { type: 'DELETE_APPT', id: 'a1' });
    expect(s.appointments).toHaveLength(0);
  });
});

describe('reducer: health prefs', () => {
  it('SET_GENDER, SET_CYCLE_SHARED, SET_CURRENCIES', () => {
    let s = reducer(baseState(), { type: 'SET_GENDER', gender: 'female' });
    expect(s.userGender).toBe('female');
    s = reducer(s, { type: 'SET_CYCLE_SHARED', shared: true });
    expect(s.householdCycleShared).toBe(true);
    s = reducer(s, { type: 'SET_CURRENCIES', currencies: ['USD'] });
    expect(s.userCurrencies).toEqual(['USD']);
  });
});

describe('reducer: shopping list', () => {
  it('ADD_SHOP, TOGGLE_SHOP, DELETE_SHOP, CLEAR_DONE_SHOP', () => {
    let s = reducer(baseState(), { type: 'ADD_SHOP', shopItem: { id: 's1', done: false } });
    s = reducer(s, { type: 'ADD_SHOP', shopItem: { id: 's2', done: false } });
    s = reducer(s, { type: 'TOGGLE_SHOP', id: 's1' });
    expect(s.shopList.find(i => i.id === 's1').done).toBe(true);

    s = reducer(s, { type: 'CLEAR_DONE_SHOP' });
    expect(s.shopList).toEqual([{ id: 's2', done: false }]);

    s = reducer(s, { type: 'DELETE_SHOP', id: 's2' });
    expect(s.shopList).toHaveLength(0);
  });
});

describe('reducer: calendar', () => {
  it('SET_CAL_VIEW sets the view', () => {
    const s = reducer(baseState(), { type: 'SET_CAL_VIEW', view: 'week' });
    expect(s.calView).toBe('week');
  });

  it('CAL_NAV moves within a year without rollover', () => {
    const s = reducer(baseState({ calMonth: 5, calYear: 2026 }), { type: 'CAL_NAV', dir: 1 });
    expect(s).toMatchObject({ calMonth: 6, calYear: 2026 });
  });

  it('CAL_NAV rolls year forward past December', () => {
    const s = reducer(baseState({ calMonth: 11, calYear: 2026 }), { type: 'CAL_NAV', dir: 1 });
    expect(s).toMatchObject({ calMonth: 0, calYear: 2027 });
  });

  it('CAL_NAV rolls year backward past January', () => {
    const s = reducer(baseState({ calMonth: 0, calYear: 2026 }), { type: 'CAL_NAV', dir: -1 });
    expect(s).toMatchObject({ calMonth: 11, calYear: 2025 });
  });

  it('TOGGLE_OVERLAY flips a single overlay key', () => {
    const s = reducer(baseState(), { type: 'TOGGLE_OVERLAY', key: 'festivals' });
    expect(s.overlays.festivals).toBe(false);
    expect(s.overlays.sports).toBe(true); // untouched
  });

  it('DISMISS_RESCHEDULE sets the flag', () => {
    const s = reducer(baseState(), { type: 'DISMISS_RESCHEDULE' });
    expect(s.rescheduleDismissed).toBe(true);
  });
});

describe('reducer: tasks view / settings tab / family tab', () => {
  it('SET_TASK_VIEW, SET_SETTINGS_TAB, SET_FAMILY_TAB', () => {
    let s = reducer(baseState(), { type: 'SET_TASK_VIEW', view: 'checklist' });
    expect(s.taskView).toBe('checklist');
    s = reducer(s, { type: 'SET_SETTINGS_TAB', tab: 'notifications' });
    expect(s.settingsTab).toBe('notifications');
    s = reducer(s, { type: 'SET_FAMILY_TAB', tab: 'directory' });
    expect(s.familyTab).toBe('directory');
  });
});

describe('reducer: courses / learning plan', () => {
  it('SYNC_COURSES, ADD_COURSE, DELETE_COURSE', () => {
    let s = reducer(baseState(), { type: 'SYNC_COURSES', courses: [{ id: 'c1', done: 0, total: 5 }] });
    expect(s.courses).toHaveLength(1);
    s = reducer(s, { type: 'ADD_COURSE', course: { id: 'c2', done: 0, total: 3 } });
    expect(s.courses).toHaveLength(2);
    s = reducer(s, { type: 'DELETE_COURSE', id: 'c1' });
    expect(s.courses).toEqual([{ id: 'c2', done: 0, total: 3 }]);
  });

  it('ADD_SESSION increments done but clamps to total', () => {
    let s = baseState({ courses: [{ id: 'c1', done: 4, total: 5 }] });
    s = reducer(s, { type: 'ADD_SESSION', id: 'c1' });
    expect(s.courses[0].done).toBe(5);
    s = reducer(s, { type: 'ADD_SESSION', id: 'c1' }); // already at total
    expect(s.courses[0].done).toBe(5);
  });

  it('REMOVE_SESSION decrements done but clamps to 0', () => {
    let s = baseState({ courses: [{ id: 'c1', done: 0, total: 5 }] });
    s = reducer(s, { type: 'REMOVE_SESSION', id: 'c1' });
    expect(s.courses[0].done).toBe(0);
  });

  it('PUSH_SESSIONS advances nextISO for the course and everything after it', () => {
    const s0 = baseState({
      courses: [
        { id: 'c1', nextISO: '2026-08-24' }, // Monday
        { id: 'c2', nextISO: '2026-08-25' },
        { id: 'c3', nextISO: null },
      ],
    });
    const s = reducer(s0, { type: 'PUSH_SESSIONS', id: 'c1' });
    expect(s.courses[0].nextISO).not.toBe('2026-08-24');
    expect(s.courses[1].nextISO).not.toBe('2026-08-25');
    expect(s.courses[2].nextISO).toBeNull();
    expect(s.rescheduleDismissed).toBe(false);
  });

  it('PUSH_SESSIONS is a no-op when the course id is not found', () => {
    const s0 = baseState({ courses: [{ id: 'c1', nextISO: '2026-08-24' }] });
    const s = reducer(s0, { type: 'PUSH_SESSIONS', id: 'missing' });
    expect(s).toBe(s0);
  });

  it('PASS_EXAM sets examDone', () => {
    const s = reducer(baseState(), { type: 'PASS_EXAM' });
    expect(s.examDone).toBe(true);
  });
});

describe('reducer: notifications', () => {
  it('TOGGLE_NOTIF flips a single key without touching others', () => {
    const s = reducer(baseState(), { type: 'TOGGLE_NOTIF', key: 'meds' });
    expect(s.notifications.meds).toBe(false);
    expect(s.notifications.learning).toBe(true);
  });
});

describe('reducer: sport subscriptions', () => {
  it('ADD_SPORT_SUBSCRIPTION adds a new sport', () => {
    const s = reducer(baseState({ sportSubscriptions: [] }), {
      type: 'ADD_SPORT_SUBSCRIPTION', sport: 'tennis', leagues: ['wimbledon'],
    });
    expect(s.sportSubscriptions).toEqual([{ sport: 'tennis', leagues: ['wimbledon'] }]);
  });

  it('ADD_SPORT_SUBSCRIPTION is a no-op if already subscribed', () => {
    const s0 = baseState({ sportSubscriptions: [{ sport: 'f1', leagues: [] }] });
    const s = reducer(s0, { type: 'ADD_SPORT_SUBSCRIPTION', sport: 'f1', leagues: [] });
    expect(s).toBe(s0);
  });

  it('REMOVE_SPORT_SUBSCRIPTION removes by sport key', () => {
    const s0 = baseState({ sportSubscriptions: [{ sport: 'f1', leagues: [] }, { sport: 'cricket', leagues: [] }] });
    const s = reducer(s0, { type: 'REMOVE_SPORT_SUBSCRIPTION', sport: 'f1' });
    expect(s.sportSubscriptions).toEqual([{ sport: 'cricket', leagues: [] }]);
  });

  it('UPDATE_SPORT_LEAGUES updates leagues for the matching sport only', () => {
    const s0 = baseState({ sportSubscriptions: [{ sport: 'cricket', leagues: ['ipl'] }, { sport: 'f1', leagues: [] }] });
    const s = reducer(s0, { type: 'UPDATE_SPORT_LEAGUES', sport: 'cricket', leagues: ['ipl', 'bbl'] });
    expect(s.sportSubscriptions).toEqual([{ sport: 'cricket', leagues: ['ipl', 'bbl'] }, { sport: 'f1', leagues: [] }]);
  });

  it('UPDATE_SPORT_TEAMS sets followed teams for the matching sport only, keeping leagues', () => {
    const s0 = baseState({ sportSubscriptions: [{ sport: 'football', leagues: ['PL'] }, { sport: 'cricket', leagues: [] }] });
    const s = reducer(s0, { type: 'UPDATE_SPORT_TEAMS', sport: 'football', teams: ['Arsenal'] });
    expect(s.sportSubscriptions).toEqual([
      { sport: 'football', leagues: ['PL'], teams: ['Arsenal'] },
      { sport: 'cricket', leagues: [] },
    ]);
  });
});

describe('reducer: family contacts', () => {
  it('SET_FAMILY_CONTACT merges fields for a person, keyed by id', () => {
    let s = reducer(baseState(), { type: 'SET_FAMILY_CONTACT', id: 'p1', fields: { phone: '123' } });
    expect(s.familyContacts.p1).toEqual({ phone: '123' });
    s = reducer(s, { type: 'SET_FAMILY_CONTACT', id: 'p1', fields: { email: 'a@b.com' } });
    expect(s.familyContacts.p1).toEqual({ phone: '123', email: 'a@b.com' });
  });
});

describe('reducer: imported calendar events / ICS feeds', () => {
  it('ADD_CAL_EVENTS tags events with a batch and records import history', () => {
    const s = reducer(baseState(), {
      type: 'ADD_CAL_EVENTS', events: [{ id: 'e1' }, { id: 'e2' }], category: 'work', filename: 'events.ics',
    });
    expect(s.importedCalEvents).toHaveLength(2);
    expect(s.importedCalEvents[0].category).toBe('work');
    expect(s.importHistory).toHaveLength(1);
    expect(s.importHistory[0].count).toBe(2);
  });

  it('DELETE_CAL_BATCH removes events and history for that batch only', () => {
    const s0 = baseState({
      importedCalEvents: [{ id: 'e1', importBatch: 'b1' }, { id: 'e2', importBatch: 'b2' }],
      importHistory: [{ id: 'b1' }, { id: 'b2' }],
    });
    const s = reducer(s0, { type: 'DELETE_CAL_BATCH', batchId: 'b1' });
    expect(s.importedCalEvents).toEqual([{ id: 'e2', importBatch: 'b2' }]);
    expect(s.importHistory).toEqual([{ id: 'b2' }]);
  });

  it('ADD_ICS_FEED appends an enabled feed', () => {
    const s = reducer(baseState(), { type: 'ADD_ICS_FEED', id: 'feed1', name: 'Work', url: 'https://x' });
    expect(s.icsFeeds).toEqual([{ id: 'feed1', name: 'Work', url: 'https://x', lastSynced: null, enabled: true }]);
  });

  it('TOGGLE_ICS_FEED disabling a feed also purges its imported events', () => {
    const s0 = baseState({
      icsFeeds: [{ id: 'feed1', enabled: true }],
      importedCalEvents: [{ id: 'e1', importBatch: 'feed1' }],
    });
    const s = reducer(s0, { type: 'TOGGLE_ICS_FEED', id: 'feed1' });
    expect(s.icsFeeds[0].enabled).toBe(false);
    expect(s.importedCalEvents).toEqual([]);
  });

  it('DELETE_ICS_FEED removes the feed and its events', () => {
    const s0 = baseState({
      icsFeeds: [{ id: 'feed1' }],
      importedCalEvents: [{ id: 'e1', importBatch: 'feed1' }],
    });
    const s = reducer(s0, { type: 'DELETE_ICS_FEED', id: 'feed1' });
    expect(s.icsFeeds).toEqual([]);
    expect(s.importedCalEvents).toEqual([]);
  });

  it('SYNC_ICS_FEED replaces that feed\'s events and stamps lastSynced', () => {
    const s0 = baseState({
      icsFeeds: [{ id: 'feed1', lastSynced: null }],
      importedCalEvents: [{ id: 'old', importBatch: 'feed1' }],
    });
    const s = reducer(s0, {
      type: 'SYNC_ICS_FEED', id: 'feed1', lastSynced: '2026-08-21T00:00:00.000Z',
      events: [{ id: 'new1' }],
    });
    expect(s.icsFeeds[0].lastSynced).toBe('2026-08-21T00:00:00.000Z');
    expect(s.importedCalEvents).toHaveLength(1);
    expect(s.importedCalEvents[0].id).toBe('new1');
    expect(s.importedCalEvents[0].category).toBe('custom_ics');
  });
});

describe('reducer: recipes / meal plan', () => {
  it('ADD_RECIPE and DELETE_RECIPE', () => {
    let s = reducer(baseState(), { type: 'ADD_RECIPE', recipe: { title: 'Dal' } });
    expect(s.recipes).toHaveLength(1);
    const id = s.recipes[0].id;
    s = reducer(s, { type: 'DELETE_RECIPE', id });
    expect(s.recipes).toHaveLength(0);
  });

  it('SET_MEAL and CLEAR_MEAL', () => {
    let s = reducer(baseState(), { type: 'SET_MEAL', key: '2026-08-21-breakfast', recipeId: 'r1' });
    expect(s.mealPlan['2026-08-21-breakfast']).toBe('r1');
    s = reducer(s, { type: 'CLEAR_MEAL', key: '2026-08-21-breakfast' });
    expect(s.mealPlan['2026-08-21-breakfast']).toBeUndefined();
  });
});

describe('reducer: hobbies', () => {
  it('project lifecycle', () => {
    let s = reducer(baseState(), { type: 'ADD_HOBBY_PROJECT', project: { name: 'Guitar' } });
    expect(s.hobbyProjects).toHaveLength(1);
    const id = s.hobbyProjects[0].id;
    expect(s.hobbyProjects[0].progress).toBe(0);
    s = reducer(s, { type: 'UPDATE_HOBBY_PROJECT', id, fields: { progress: 50 } });
    expect(s.hobbyProjects[0].progress).toBe(50);
    s = reducer(s, { type: 'DELETE_HOBBY_PROJECT', id });
    expect(s.hobbyProjects).toHaveLength(0);
  });

  it('log entries are prepended and deletable', () => {
    // explicit ids: ADD_HOBBY_LOG's default id is Date.now()-based and two
    // adds in the same millisecond would otherwise collide
    let s = reducer(baseState(), { type: 'ADD_HOBBY_LOG', entry: { id: 'hl1', hobby: 'Guitar', duration: 30 } });
    s = reducer(s, { type: 'ADD_HOBBY_LOG', entry: { id: 'hl2', hobby: 'Guitar', duration: 20 } });
    expect(s.hobbyLog.map(e => e.id)).toEqual(['hl2', 'hl1']); // most recent first
    s = reducer(s, { type: 'DELETE_HOBBY_LOG', id: 'hl2' });
    expect(s.hobbyLog).toHaveLength(1);
  });
});

describe('reducer: household chores', () => {
  it('ADD_CHORE, COMPLETE_CHORE, EDIT_CHORE, DELETE_CHORE', () => {
    let s = reducer(baseState({ choreList: [] }), { type: 'ADD_CHORE', chore: { name: 'Dishes' } });
    expect(s.choreList).toHaveLength(1);
    const id = s.choreList[0].id;

    s = reducer(s, { type: 'COMPLETE_CHORE', id });
    expect(s.choreList[0].lastDone).toBe(new Date().toISOString().slice(0, 10));

    s = reducer(s, { type: 'EDIT_CHORE', id, fields: { name: 'Dishes & counters' } });
    expect(s.choreList[0].name).toBe('Dishes & counters');

    s = reducer(s, { type: 'DELETE_CHORE', id });
    expect(s.choreList).toHaveLength(0);
  });
});

describe('reducer: calendar packs', () => {
  it('TOGGLE_CALENDAR_PACK adds when absent, removes when present', () => {
    let s = reducer(baseState({ subscribedCalendars: ['IN'] }), { type: 'TOGGLE_CALENDAR_PACK', calendarId: 'TH' });
    expect(s.subscribedCalendars).toEqual(['IN', 'TH']);
    s = reducer(s, { type: 'TOGGLE_CALENDAR_PACK', calendarId: 'IN' });
    expect(s.subscribedCalendars).toEqual(['TH']);
  });
});

describe('reducer: bootstrap and daily reset', () => {
  it('BOOTSTRAP shallow-merges DB data into state', () => {
    const s = reducer(baseState(), { type: 'BOOTSTRAP', data: { workTasks: [{ id: 'w1' }], householdId: 'hh1' } });
    expect(s.workTasks).toEqual([{ id: 'w1' }]);
    expect(s.householdId).toBe('hh1');
  });

  it('DAILY_RESET clears done flags and resets the timer', () => {
    const s0 = baseState({
      timer: 100, timerRunning: true,
      meds: [{ id: 'm1', done: true }],
      habits: [{ id: 'h1', done: true }],
    });
    const s = reducer(s0, { type: 'DAILY_RESET' });
    expect(s.timer).toBe(3600);
    expect(s.timerRunning).toBe(false);
    expect(s.meds[0].done).toBe(false);
    expect(s.habits[0].done).toBe(false);
    expect(s.lastResetDate).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('reducer: timer', () => {
  it('TICK_TIMER counts down while running', () => {
    const s = reducer(baseState({ timer: 10, timerRunning: true }), { type: 'TICK_TIMER' });
    expect(s.timer).toBe(9);
    expect(s.timerRunning).toBe(true);
  });

  it('TICK_TIMER is a no-op when not running', () => {
    const s0 = baseState({ timer: 10, timerRunning: false });
    const s = reducer(s0, { type: 'TICK_TIMER' });
    expect(s).toBe(s0);
  });

  it('TICK_TIMER stops the timer once it reaches 0', () => {
    const s = reducer(baseState({ timer: 1, timerRunning: true }), { type: 'TICK_TIMER' });
    expect(s.timer).toBe(0);
    expect(s.timerRunning).toBe(false);
  });

  it('TICK_TIMER is a no-op once timer is already at 0', () => {
    const s0 = baseState({ timer: 0, timerRunning: true });
    const s = reducer(s0, { type: 'TICK_TIMER' });
    expect(s).toBe(s0);
  });

  it('TOGGLE_TIMER, RESET_TIMER, COMPLETE_TIMER', () => {
    let s = reducer(baseState({ timerRunning: false }), { type: 'TOGGLE_TIMER' });
    expect(s.timerRunning).toBe(true);

    s = reducer(baseState({ timer: 200, timerRunning: true }), { type: 'RESET_TIMER' });
    expect(s).toMatchObject({ timer: 3600, timerRunning: false });

    s = reducer(baseState({ timer: 200, timerRunning: true }), { type: 'COMPLETE_TIMER' });
    expect(s).toMatchObject({ timer: 0, timerRunning: false });
  });
});
