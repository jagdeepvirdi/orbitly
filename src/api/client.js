const LS_PREFIX = 'orbitly-api-';

function lsGet(key) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(LS_PREFIX + key); return null; }
    return data;
  } catch { return null; }
}

function lsSet(key, data, ttlMs) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }));
  } catch {}
}

let _tokenGetter = null;

export function setTokenGetter(fn) {
  _tokenGetter = fn;
}

async function getAuthToken() {
  if (!_tokenGetter) return null;
  try { return await _tokenGetter(); } catch { return null; }
}

async function apiFetch(path, cacheKey, ttlMs) {
  const cached = lsGet(cacheKey);
  if (cached) return cached;
  const token = await getAuthToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  if (ttlMs) lsSet(cacheKey, data, ttlMs);
  return data;
}

const H = 3600_000;

async function req(method, path, body) {
  const token = await getAuthToken();
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opts);
  if (!res.ok) {
    let detail = '';
    try { detail = ': ' + ((await res.json()).error || ''); } catch {}
    throw new Error(`API ${res.status}${detail}`);
  }
  return res.json();
}

const get  = (path)        => req('GET',    path);
const post = (path, body)  => req('POST',   path, body);
const patch= (path, body)  => req('PATCH',  path, body);
const del  = (path)        => req('DELETE', path);

export const api = {
  // ── Live external APIs (cached in localStorage) ──────────────
  // Always fetch "current" season — Ergast returns the active/most-recent season automatically
  f1Schedule:        ()       => apiFetch('/f1/schedule',     'f1-schedule-current',     6 * H),
  f1Standings:       ()       => apiFetch('/f1/standings',    'f1-standings-current',   30 * 60_000),
  f1Constructors:    ()       => apiFetch('/f1/constructors', 'f1-constructors-current',30 * 60_000),
  f1RaceResults:     ()       => apiFetch('/f1/results',      'f1-results-current',     30 * 60_000),

  // Clears all F1 localStorage cache then asks the server to drop its in-memory cache
  f1Refresh: async () => {
    ['f1-schedule-current','f1-standings-current','f1-constructors-current','f1-results-current']
      .forEach(k => localStorage.removeItem(LS_PREFIX + k));
    await fetch('/api/f1/refresh', { method: 'POST' });
  },
  holidays:          (year, cc) => apiFetch(`/holidays/${year}/${cc}`, `holidays-${year}-${cc}`, 7 * 24 * H),
  cricketMatches:    () => apiFetch('/cricket/matches', 'cricket-matches', 15 * 60_000),
  footballMatches:   (comps) => apiFetch(`/football/matches?competitions=${comps}`, `football-${comps}`, H),
  footballStandings: (comp) => apiFetch(`/football/standings/${comp}`, `football-standings-${comp}`, 3 * H),
  nbaGames:          () => apiFetch('/nba/games?days=7', 'nba-games', H),
  getSportsCatalog:  () => get('/sports/catalog'),

  // ── Tasks ─────────────────────────────────────────────────────
  getTasks:      ()           => get('/tasks'),
  createTask:    (body)       => post('/tasks', body),
  updateTask:    (id, body)   => patch(`/tasks/${id}`, body),
  deleteTask:    (id)         => del(`/tasks/${id}`),

  // ── Medications ───────────────────────────────────────────────
  getMeds:       (date)       => get(`/meds?date=${date}`),
  toggleMed:     (id, date)   => post(`/meds/${id}/toggle?date=${date}`),
  createMed:     (body)       => post('/meds', body),
  updateMed:     (id, body)   => req('PUT', `/meds/${id}`, body),
  deleteMed:     (id)         => del(`/meds/${id}`),

  // ── Habits ────────────────────────────────────────────────────
  getHabits:     (date)       => get(`/habits?date=${date}`),
  toggleHabit:   (id, date)   => post(`/habits/${id}/toggle?date=${date}`),
  createHabit:   (body)       => post('/habits', body),
  updateHabit:   (id, body)   => req('PUT', `/habits/${id}`, body),
  deleteHabit:   (id)         => del(`/habits/${id}`),

  // ── Appointments ──────────────────────────────────────────────
  getAppts:      ()           => get('/appointments'),
  createAppt:    (body)       => post('/appointments', body),
  updateApptFull:(id, body)   => req('PUT', `/appointments/${id}`, body),
  updateAppt:    (id, body)   => patch(`/appointments/${id}`, body),
  deleteAppt:    (id)         => del(`/appointments/${id}`),

  // ── User profile ──────────────────────────────────────────────
  getProfile:    ()           => get('/profile'),
  updateProfile: (body)       => req('PUT', '/profile', body),

  // ── Shopping list ─────────────────────────────────────────────
  getShopping:   ()           => get('/shopping'),
  addShopItem:   (item)       => post('/shopping', { item }),
  toggleShopItem:(id, done)   => patch(`/shopping/${id}`, { done }),
  deleteShopItem:(id)         => del(`/shopping/${id}`),

  // ── Learning Plans ────────────────────────────────────────────
  getPlans:      ()           => get('/plans'),
  createPlan:    (body)       => post('/plans', body),
  updatePlan:    (id, body)   => req('PUT', `/plans/${id}`, body),
  deletePlan:    (id)         => del(`/plans/${id}`),
  importPlan:    (data)       => post('/plans/import', data),

  // ── Books ─────────────────────────────────────────────────────
  getBooks:      (planId)     => get(planId ? `/books?plan_id=${planId}` : '/books'),
  createBook:    (body)       => post('/books', body),
  updateBook:    (id, body)   => req('PUT', `/books/${id}`, body),
  deleteBook:    (id)         => del(`/books/${id}`),

  // ── Learning Events ───────────────────────────────────────────
  getLearningEvents:    ()          => get('/learning-events'),
  createLearningEvent:  (body)      => post('/learning-events', body),
  updateLearningEvent:  (id, body)  => req('PUT', `/learning-events/${id}`, body),
  deleteLearningEvent:  (id)        => del(`/learning-events/${id}`),

  // ── Courses ───────────────────────────────────────────────────
  getCourses:    (planId)     => get(planId ? `/courses?plan_id=${planId}` : '/courses'),
  updateCourse:  (id, body)   => patch(`/courses/${id}`, body),
  createCourse:  (body)       => post('/courses', body),
  deleteCourse:  (id)         => del(`/courses/${id}`),
  aiImportCourse:(body)       => post('/courses/ai-import', body),
  getPinnedCourses: ()        => get('/courses/pinned'),
  pinCourse:     (courseId)   => post('/courses/pinned', { courseId }),
  unpinCourse:   (courseId)   => del(`/courses/pinned/${courseId}`),
  getCourseTimeLogs: ()                => get('/course-time-logs'),
  logCourseTime:     (courseId, secs)  => post('/course-time-logs/increment', { course_id: courseId, seconds: secs }),

  // ── Sports refresh ────────────────────────────────────────────
  cricketRefresh: async () => {
    localStorage.removeItem(LS_PREFIX + 'cricket-matches');
    await fetch('/api/cricket/refresh', { method: 'POST' });
  },
  footballRefresh: async (comps) => {
    // Clear all football match cache keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX + 'football-')) localStorage.removeItem(k);
    }
    await fetch('/api/football/refresh', { method: 'POST' });
  },
  nbaRefresh: async () => {
    localStorage.removeItem(LS_PREFIX + 'nba-games');
    await fetch('/api/nba/refresh', { method: 'POST' });
  },

  // ── Family ───────────────────────────────────────────────────
  getFamilyGroups:  ()           => get('/family/groups'),
  importFamily:     (data)       => post('/family/import', data),
  getFamilyMembers: ()           => get('/family/members'),
  getFamilyEvents:  ()           => get('/family/events'),
  getContact:    (memberId)      => get(`/family/contacts/${memberId}`),
  saveContact:   (memberId, body)=> req('PUT', `/family/contacts/${memberId}`, body),
  createGroup:   (body)          => post('/family/groups', body),
  updateGroup:   (id, body)      => req('PUT', `/family/groups/${id}`, body),
  deleteGroup:   (id)            => del(`/family/groups/${id}`),
  createMember:  (body)          => post('/family/members', body),
  updateMember:  (id, body)      => req('PUT', `/family/members/${id}`, body),
  deleteMember:  (id)            => del(`/family/members/${id}`),
  createEvent:   (body)          => post('/family/events', body),
  updateEvent:   (id, body)      => req('PUT', `/family/events/${id}`, body),
  deleteEvent:   (id)            => del(`/family/events/${id}`),
  getSchoolTerms:    ()          => get('/family/school-terms'),
  createSchoolTerm:  (body)     => post('/family/school-terms', body),
  updateSchoolTerm:  (id, body) => req('PUT', `/family/school-terms/${id}`, body),
  deleteSchoolTerm:  (id)       => del(`/family/school-terms/${id}`),
  getMoments:    ()              => get('/family/moments'),
  createMoment:  (body)         => post('/family/moments', body),
  updateMoment:  (id, body)     => req('PUT', `/family/moments/${id}`, body),
  deleteMoment:  (id)           => del(`/family/moments/${id}`),

  // ── Finance ───────────────────────────────────────────────────
  getSubscriptions: ()        => get('/finance/subscriptions'),
  createSubscription:(body)   => post('/finance/subscriptions', body),
  updateSubscription:(id,body)=> req('PUT', `/finance/subscriptions/${id}`, body),
  deleteSubscription:(id)     => del(`/finance/subscriptions/${id}`),

  getLoans:      ()           => get('/finance/loans'),
  createLoan:    (body)       => post('/finance/loans', body),
  updateLoan:    (id,body)    => req('PUT', `/finance/loans/${id}`, body),
  deleteLoan:    (id)         => del(`/finance/loans/${id}`),

  getCreditCards:()           => get('/finance/credit-cards'),
  createCreditCard:(body)     => post('/finance/credit-cards', body),
  updateCreditCard:(id,body)  => req('PUT', `/finance/credit-cards/${id}`, body),
  deleteCreditCard:(id)       => del(`/finance/credit-cards/${id}`),

  getBills:      ()           => get('/finance/bills'),
  createBill:    (body)       => post('/finance/bills', body),
  updateBill:    (id,body)    => req('PUT', `/finance/bills/${id}`, body),
  deleteBill:    (id)         => del(`/finance/bills/${id}`),

  getInsurance:     ()        => get('/finance/insurance'),
  createInsurance:  (body)    => post('/finance/insurance', body),
  updateInsurance:  (id,body) => req('PUT', `/finance/insurance/${id}`, body),
  deleteInsurance:  (id)      => del(`/finance/insurance/${id}`),

  getPaid:       (month)      => get(`/finance/paid?month=${month}`),
  togglePaid:    (type, id, month) => post(`/finance/paid/${type}/${id}?month=${month}`),

  // ── Holidays (multi-calendar) ─────────────────────────────────
  getMultiHolidays: (year, calendars) => {
    const sorted = [...calendars].sort().join(',');
    return apiFetch(
      `/holidays/multi?year=${year}&calendars=${encodeURIComponent(sorted)}`,
      `holidays-multi-${year}-${sorted}`,
      24 * H
    );
  },

  // ── Calendar subscriptions ────────────────────────────────────
  getCalendarSubscriptions: () => get('/calendars/subscriptions'),
  setCalendarSubscription: (calendarId, enabled) => post('/calendars/subscriptions', { calendarId, enabled }),

  // ── Sports subscriptions ──────────────────────────────────────
  getSportSubscriptions: () => get('/sports/subscriptions'),
  setSportSubscription: (sport, leagues) => post('/sports/subscriptions', { sport, leagues }),
  deleteSportSubscription: (sport) => del(`/sports/subscriptions/${sport}`),


  // ── Household & Invites ───────────────────────────────────────────────
  getHousehold:      ()          => get('/household'),
  createInvite:      (body)      => post('/household/invite', body),
  getInviteInfo:     (token)     => get(`/household/invite/${token}`),
  acceptInvite:      (token)     => post(`/household/invite/${token}/accept`),
  getPendingInvites: ()          => get('/household/invites'),

  // ── Festivals ─────────────────────────────────────────────────
  getFestivals:  ()           => get('/festivals'),
  getPinnedFestivals: ()      => get('/festivals/pinned'),
  pinFestival:   (festivalId) => post('/festivals/pinned', { festivalId }),
  unpinFestival: (festivalId) => del(`/festivals/pinned/${festivalId}`),

  // ── Recipes ───────────────────────────────────────────────────
  getRecipeAreas:    ()           => get('/recipes/areas'),
  getRecipesByArea:  (area)       => get(`/recipes/by-area?area=${encodeURIComponent(area)}`),
  getRecipesByCategory: (cat)     => get(`/recipes/by-category?category=${encodeURIComponent(cat)}`),
  getRecipeCategories: ()          => get('/recipes/categories'),
  searchRecipes:     (q)          => get(`/recipes/search?q=${encodeURIComponent(q)}`),
  getRecipeDetail:   (id)         => get(`/recipes/detail?id=${encodeURIComponent(id)}`),
  fetchProxyIcs:     (url)        => get('/calendars/proxy-ics?url=' + encodeURIComponent(url)),
};
