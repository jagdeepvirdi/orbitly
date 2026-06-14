# Orbitly — TASKS.md
> Implementation task list. Work top-to-bottom. Check off as you go.
> Reference: `CLAUDE.md` for all design tokens, data, and structure.
> Design source: `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html`

---

## PHASE 0 — Project Scaffold
- [x] `npm create vite@latest orbitly -- --template react`
- [x] Install dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `react-router-dom`
- [x] `npx tailwindcss init -p`
- [x] Configure `tailwind.config.js`: content paths, custom keyframes (om-pop, om-fade-up, om-confetti, om-pulse, om-spin), custom animation utilities
- [x] Add Google Fonts to `index.html`: Newsreader + Hanken Grotesk
- [x] Set up `src/index.css`: inject CSS custom properties (all dark-mode vars on :root)
- [x] Create folder structure as defined in CLAUDE.md
- [x] Set up `App.jsx` with React Router — 9 routes mapped to section components (stub components for now)
- [x] Verify dev server runs on port 5177: `npm run dev`

---

## PHASE 1 — Design System & Layout Shell

### 1.1 Theme system
- [x] Create `src/hooks/useTheme.js` — toggles dark/light, injects CSS vars onto `document.documentElement`
- [x] Add light-mode CSS vars to `index.css` as `.light` class overrides
- [x] Verify theme toggle switches vars correctly

### 1.2 Data constants
- [x] `src/data/users.js` — USERS object (Jagdeep/Simran/Anaya with id, name, first, role, initials, accent, accentSoft, glow)
- [x] `src/data/seedTasks.js` — 6 work tasks + 5 personal tasks (match prototype state exactly)
- [x] `src/data/seedMeds.js` — 4 medications (Vitamin D3, Omega-3, Metformin, Magnesium)
- [x] `src/data/festivals.js` — all 20 festival/birthday dates (see CLAUDE.md festivals section)
- [x] `src/data/certPlan.js` — Anthropic Academy 13 courses + CCA-F exam with exact weekday dates from the cert plan
- [x] `src/data/sportsData.js` — F1 calendar (6 races), F1 driver standings (5 drivers), cricket matches (3), football fixtures (3)

### 1.3 Global store
- [x] `src/store/appStore.js` — useReducer with actions: SET_USER, SET_SECTION, TOGGLE_THEME, TOGGLE_MED, TOGGLE_TASK, ADVANCE_TASK, TOGGLE_HABIT, TOGGLE_SHOP, ADD_SHOP, SET_CAL_VIEW, SET_TASK_VIEW, ADD_SESSION, REMOVE_SESSION, PASS_EXAM, TOGGLE_NOTIF, SET_SETTINGS_TAB, TOGGLE_SPORT, DISMISS_RESCHEDULE
- [x] Persist to localStorage: theme, userId, meds state, tasks state
- [x] Export `useAppStore` hook and `AppStoreProvider`
- [x] Wrap App in `AppStoreProvider`

### 1.4 Utility functions
- [x] `src/utils/dateUtils.js`: `addWorkdays(date, n)`, `daysAway(y, m, d)`, `isWeekend(date)`, `nextWorkday(date)`, `formatDate(date, opts)`, `fmtTimer(seconds)`
- [x] `src/utils/calendarUtils.js`: `buildMonthGrid(year, month, events)`, `buildWeekCells(year, month, day, events)`, `buildDayAgenda(events)`

### 1.5 Layout shell
- [x] `src/components/layout/Sidebar.jsx`
  - Orbitly logo (indigo/purple gradient square + Newsreader wordmark)
  - User switcher pill (avatar initials, name, role, up/down chevron — cycles through 3 users)
  - Nav items (9): icon + label + optional badge pill, active = accent bg with glow shadow
  - Theme toggle button at bottom
  - Width: 248px, sticky, full-height, dark sidebar bg
- [x] `src/components/layout/TopBar.jsx`
  - Section label (uppercase, accent color) + date string ("Bangkok")
  - Search bar with ⌘K hint
  - Notification bell (red dot indicator)
  - User avatar stack (3 overlapping circles, active has accent ring)
  - Sticky, blur backdrop, border-bottom
- [x] `src/components/layout/BottomTabBar.jsx`
  - 5 tabs: Today / Calendar / Tasks / Health / Family
  - Fixed bottom, blur backdrop, safe-area padding
  - Active tab: accent color
- [x] `App.jsx`: responsive layout — Sidebar on desktop, BottomTabBar on mobile (<900px)
- [x] Verify full shell renders with all 9 stubs navigable

---

## PHASE 2 — Today Dashboard (priority section)

### 2.1 Reusable UI components
- [x] `src/components/ui/ProgressRing.jsx` — SVG circle ring, props: size, radius, strokeWidth, percent, color, children (center label)
- [x] `src/components/ui/CheckRow.jsx` — checkable row, props: done, onToggle, label, sublabel, tagLabel, tagBg, tagColor, accent
- [x] `src/components/ui/PriorityBadge.jsx` — priority label with bg/color from PRIORITY map
- [x] `src/components/ui/StatPill.jsx` — icon + value + label glance pill
- [x] `src/components/ui/ConfettiCannon.jsx` — fires 90 colored divs with om-confetti animation, auto-removes after 3.8s. Export `useConfetti()` hook.

### 2.2 Today Dashboard
- [x] Hero banner: gradient bg, ambient glow circle, serif greeting, heroSub text, 4 StatPills
- [x] Learning session card (col-span-7):
  - Top accent bar (indigo → purple gradient, 3px)
  - Course title + subtitle
  - ProgressRing timer (128px, counts down from 60:00)
  - Start / Pause / Reset / Mark done buttons
  - "Daily limit 1 hour · weekdays only" footnote
  - On complete: confetti, session logged to store
- [x] Medication card (col-span-5): CheckRow list, morning/evening tag badges, done count
- [x] Work Tasks card (col-span-6): top 3 incomplete, priority badges, "View all →" link
- [x] Personal Tasks card (col-span-6): top 3 incomplete, priority badges
- [x] Sports Ticker (col-span-7): 3 sport mini-cards (F1 / Cricket / Football) with countdown
- [x] Rakhi countdown card (col-span-5): gold/red gradient, days countdown, Rakhi Mode alert
- [x] Upcoming 48h (col-span-7): event list with colored left borders
- [x] Family Feed (col-span-5): Simran + Anaya today items with avatar headers
- [x] Mobile layout: single column, preserve card order
- [x] Verify timer runs, meds check off, tasks check off

---

## PHASE 3 — Calendar

- [x] Month view: 6-week grid (Mon–Sun), today highlighted with accent circle, events as color pills (max 3 + "+N more")
- [x] Week view: 7-column card grid, event pills with left accent border
- [x] Day view: time-slot list (08:00–20:00) with event cards
- [x] View toggle pills (Month / Week / Day)
- [x] Prev/Next month navigation
- [x] Overlay toggle chips: Festivals / Sports / Holidays (filter events by category)
- [x] Auto-reschedule banner (purple gradient, dismissible) — shows when a learning session was pushed
- [x] Category legend strip at bottom
- [x] Wire month grid to CAL_EVENTS data
- [x] Verify month navigation works, overlays toggle correctly

---

## PHASE 4 — Learning Planner

- [x] Hero section: large ProgressRing (120px, purple), overall stats (courses done, sessions done, est completion, exam date)
- [x] Smart scheduling note strip
- [x] Import bar: URL input + "Extract with AI" button + "Add manually" button (buttons non-functional in v1 — show toast "Coming soon")
- [x] Phase sections (4 phases) with course card grid
- [x] Course card: name, status pill, progress bar, session counter (N/total), next date, +/− session buttons
  - Done state: green "Completed" pill
  - In progress: indigo "In progress" pill
  - Upcoming: grey pill
  - +session: increments done count, updates progress bar, confetti when course completes
- [x] CCA-F exam milestone card (gold): "Mark exam passed" → confetti × 2, pill turns green
- [x] Load certPlan.js data as default learning plan
- [x] Verify session counters work, progress bars animate

---

## PHASE 5 — Tasks Board

- [x] Kanban view:
  - 2 swim lanes (Work / Personal) with dot color headers
  - 3 columns per lane (To Do / In Progress / Done)
  - Cards: title, priority badge, recurring icon, due date (overdue = red)
  - Click card → advances to next column (todo → doing → done)
  - Column count badges
- [x] Checklist view:
  - 2-column grid (Work / Personal)
  - CheckRow for each task with priority badge + due date
- [x] View toggle (Kanban / Checklist)
- [x] Header stats: "N of M done today" + overdue count (pulsing red dot)
- [x] Seed from `seedTasks.js`
- [x] Verify card advancement, check-off, overdue styling

---

## PHASE 6 — Health & Wellness

- [x] Medication card (col-span-5): CheckRow list with morning/evening tags, done count badge
- [x] Daily Habits card (col-span-7): 3 full-width toggle buttons (water/exercise/sleep), green accent when done
- [x] Cycle tracker card (col-span-7):
  - 28-day circle grid: period (days 1–5, indigo), fertile (days 12–16, soft red), peak (day 14, red), today ring
  - Day counter, next period countdown, fertile window label
  - Private badge (🔒)
- [x] Appointments card (col-span-5): CheckRow list + "Add appointment" dashed button
- [x] Verify meds/habits/appointments check off and persist via store

---

## PHASE 7 — Festivals & Recurring

- [x] Festival cards grid (`repeat(auto-fill, minmax(300px, 1fr))`)
- [x] Each card: category label, emoji + name (Newsreader serif), days-away counter (colored by urgency), date string, action reminder, reminder badge
- [x] Rakhi Mode: red "🎀 Rakhi Mode — order now!" bar inside card when ≤21 days away
- [x] Urgency colors: ≤7 days = red (#ef4444), ≤21 days = amber (#f59e0b), otherwise grey
- [x] Sort by days away (ascending)
- [x] Load from `festivals.js`
- [x] Verify days-away calculation is correct from APP_TODAY (11 Jun 2026)

---

## PHASE 8 — Sports Tracker

- [x] Sport toggle pills (F1 / Cricket / Football / Badminton)
- [x] F1 section (when toggled on):
  - Race calendar list (round, GP name, date, "NEXT" badge on nearest upcoming)
  - Driver standings table (pos, team color bar, name, team, points)
- [x] Cricket section: match cards (match name, series, venue, date, status badge, score if available)
- [x] Football section: fixture cards (match, stage, teams, date, status badge)
- [x] Each section toggleable independently
- [x] Load from `sportsData.js`
- [x] "Next race in N days" subtitle uses `daysAway` utility

---

## PHASE 9 — Family Space

- [x] Anaya's school terms (col-span-7): 4 milestones with colored vertical bars, days-away counter
- [x] Shopping list (col-span-5): CheckRow list, inline add input + button, done count
- [x] Family moments wall (col-span-12): emoji-placeholder grid, add photo button (dashed border)
- [x] Shopping list persists via store (toggle done, add item)
- [x] Hover scale effect on photo cards

---

## PHASE 10 — Settings & Profiles

- [x] Tab bar: Profiles | Notifications | Connections | Export
- [x] Profiles tab: 3 user cards (Jagdeep/Simran/Anaya), active card has accent border + bg, clicking switches active user
- [x] Timezone display: Bangkok (ICT, UTC+7)
- [x] Notifications tab: toggle list (7 rows) with animated toggle switches
- [x] Connections tab: connected users list + "Invite to orbit" dashed button
- [x] Export tab: Export JSON button + Export ICS button (non-functional in v1 — show toast "Coming soon")
- [x] Verify user switching from profiles tab updates active user + accent everywhere

---

## PHASE 11 — Smart Behaviors & Polish

- [x] **Auto date-push**: when learning session marked missed → show modal → cascade future dates
- [x] **Conflict detector**: 3+ events on same calendar day → warning chip on cell
- [x] **Rakhi Mode**: auto-activates on Today dashboard when ≤21 days away
- [x] **Weekday enforcer**: `addWorkdays` used everywhere sessions are scheduled
- [x] **Responsive audit**: test every section on 375px (iPhone), 768px (iPad), 1280px (desktop)
- [x] **Dark/light mode**: verify all sections look correct in both modes
- [x] **Scrollbar styling**: custom scrollbar thumb (match prototype's webkit scrollbar CSS)
- [x] **Missing state edge cases**: empty task list, all meds done, no upcoming festivals

---

## PHASE 12 — Final QA

- [x] All 9 sections render without errors
- [x] All interactive elements work: check-offs, toggles, timer, session counters, calendar nav
- [x] User switcher cycles Jagdeep → Simran → Anaya → Jagdeep, accent color updates everywhere
- [x] Theme toggle works in all sections
- [x] Mobile bottom tab bar navigates correctly
- [x] Confetti fires on: session complete, course complete, exam passed
- [x] Rakhi countdown shows correct days from today
- [x] F1 race countdown shows correct days from today
- [x] localStorage persists: theme, active user, med check-offs, task states
- [x] Run `npm run build` — zero errors, no warnings

---

## Notes for Claude Code
- Read `CLAUDE.md` fully before starting any phase
- Read `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html` fully before starting Phase 2
- Implement one phase at a time. Verify it works before moving to the next.
- When in doubt about a visual detail, the `.dc.html` is the source of truth
- Don't use `console.log` in production code — remove all debug logs before marking phase complete
- The app is pre-seeded with data — no empty states needed for v1
