# Orbitly — CLAUDE.md

## Project Overview
Orbitly is a personal life operating system for Jagdeep Singh Virdi and family.
It is a multi-user, multi-section web app covering: Today dashboard, Calendar,
Learning Planner, Tasks, Health & Wellness, Festivals & Recurring events,
Sports Tracker, Family Space, and Settings.

The design source of truth is `Orbitly.dc.html` from the Claude Design handoff
(`Orbitly-handoff.zip`). Your job is to implement it **pixel-perfectly** in
React + Tailwind, matching all visual output from the prototype.

---

## Primary Users
| User     | Role     | Accent color | Initials |
|----------|----------|--------------|----------|
| Jagdeep  | Admin    | #6366f1      | JS       |
| Simran   | Partner  | #f43f5e      | SK       |
| Anaya    | Child    | #f59e0b      | AN       |

Timezone: **Asia/Bangkok (ICT, UTC+7)**
Current date in app: **Thursday, 11 June 2026**

---

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (utility classes only — no custom CSS unless required)
- **State**: React useState / useReducer (local state, no Redux needed for v1)
- **Routing**: React Router v6 (one route per section)
- **Fonts**: Newsreader (serif headings) + Hanken Grotesk (body) via Google Fonts
- **Icons**: Inline SVG only — no icon library (match the SVGs in the .dc.html exactly)
- **Animations**: Tailwind transitions + keyframes defined in tailwind.config.js
- **Data**: Local state seeded from constants files (no backend in v1)
- **Storage**: localStorage for user prefs (theme, active user, task/med state)

---

## Design Tokens (CSS variables from the prototype)

### Dark mode (default)
```
--bg: #0a0a0f
--sidebar: #0c0c12
--bar: rgba(10,10,15,0.72)
--surface: rgba(255,255,255,0.045)
--surface-2: rgba(255,255,255,0.075)
--surface-solid: #15151d
--border: rgba(255,255,255,0.09)
--border-strong: rgba(255,255,255,0.17)
--text: #f5f5f8
--text-2: #a6a6b8
--text-3: #6c6c80
```

### Light mode
```
--bg: #f4f4f2
--sidebar: #fbfbf9
--bar: rgba(248,248,246,0.8)
--surface: #ffffff
--surface-2: #f5f5f2
--surface-solid: #ffffff
--border: rgba(20,20,30,0.09)
--border-strong: rgba(20,20,30,0.16)
--text: #16161d
--text-2: #5c5c6b
--text-3: #9a9aa8
```

### Category colors
```
work:      #64748b
learning:  #6366f1
family:    #f59e0b
health:    #10b981
sports:    #ef4444
festival:  #d4af37
recurring: #a855f7
```

### Priority colors
```
Urgent: bg rgba(239,68,68,0.16)  color #fca5a5
High:   bg rgba(245,158,11,0.16) color #fcd34d
Normal: bg rgba(99,102,241,0.16) color #a5b4fc
Low:    bg rgba(148,163,184,0.16) color #cbd5e1
```

### Ambient glow (top-left, fixed, behind all content)
```
position: fixed; top: -180px; left: 120px;
width: 540px; height: 540px; border-radius: 50%;
background: radial-gradient(circle, rgba(99,102,241,0.18), transparent 70%);
filter: blur(20px); pointer-events: none; z-index: 0;
```

---

## Layout Structure

### Desktop (≥ 900px)
```
[Sidebar 248px fixed] | [Main scrollable flex-1]
```
Sidebar contains: logo, user switcher, nav items (9), theme toggle at bottom.

### Mobile (< 900px)
Sidebar hidden. Bottom tab bar shows 5 items: Today, Calendar, Tasks, Health, Family.
Main content full width with `padding-bottom: calc(72px + env(safe-area-inset-bottom))`.

### Top bar (sticky, blur backdrop)
```
padding: 18px 34px
backdrop-filter: blur(18px)
border-bottom: 1px solid var(--border)
Contents: section label (uppercase accent color) + date string | search bar | notification bell | user avatars
```

### Main content area
```
max-width: 1240px; margin: 0 auto; padding: 30px 34px 0
```

---

## Sections & Routes

| Route         | Section      | Component            |
|---------------|--------------|----------------------|
| /             | Today        | TodayDashboard       |
| /calendar     | Calendar     | CalendarView         |
| /learning     | Learning     | LearningPlanner      |
| /tasks        | Tasks        | TasksBoard           |
| /health       | Health       | HealthWellness       |
| /festivals    | Festivals    | FestivalsRecurring   |
| /sports       | Sports       | SportsTracker        |
| /family       | Family       | FamilySpace          |
| /settings     | Settings     | SettingsProfiles     |

---

## Section-by-Section Implementation Notes

### TODAY DASHBOARD
Grid: `grid-template-columns: repeat(12, 1fr); gap: 18px`
- Hero banner: gradient bg, italic serif greeting, 4 glance stat pills
- Learning session card (span 7): circular SVG countdown timer, play/pause/reset/mark-done buttons
- Medication card (span 5): checkable rows, morning/evening tags
- Work Tasks (span 6): top 3 incomplete tasks, priority badges
- Personal Tasks (span 6): top 3 incomplete tasks
- Sports Ticker (span 7): 3 sport cards in a sub-grid
- Rakhi countdown (span 5): gradient gold/red card, days countdown, Rakhi Mode alert
- Upcoming 48h (span 7): colored left-border event list
- Family Feed (span 5): Simran + Anaya today items
- Pinned Alert (span 5): upcoming pinned festivals within 30 days — emoji, name, date, days away, action reminder; overflow list for additional pinned items; hidden when nothing is pinned within 30 days

Timer: counts down from 3600s. `setInterval` 1s. Shows MM:SS. SVG ring animates with `stroke-dashoffset`.
Confetti: 90 colored divs with `om-confetti` keyframe animation on session complete.

### CALENDAR
Views: Month | Week | Day (toggle pills)
- Month: 6-week grid, Mon–Sun, events as colored pills (max 3 + overflow count)
- Week: 7-column grid showing current week (8–14 Jun default)
- Day: time-slotted agenda list (08:00–20:00)
- Overlay chips: toggle Festivals / Sports / Holidays overlays
- Auto-reschedule banner: purple gradient, dismissible with ×
- Category legend strip at bottom

### LEARNING PLANNER
Hero: circular progress ring (purple, `stroke-dashoffset` animated), overall stats
Import bar: URL input + "Extract with AI" button + "Add manually" button
4 phases with course cards: progress bar, session counter, next session date, +/− session buttons
Exam milestone card: gold gradient, "Mark exam passed" → confetti

Pre-loaded courses (from prototype state):
- Phase 1: Intro to Claude, Claude 101, Prompt Engineering with Claude
- Phase 2: Claude & the API, Tool Use & Function Calling, MCP 101, Claude Code 101
- Phase 3: Building Agents, RAG, Claude for Data, Evals & Safety
- Phase 4: Claude in Production, Capstone Project

**IMPORTANT**: The actual Anthropic Academy plan (from earlier in this project) should
be loadable as a named plan. See `src/data/certPlan.js` for the exact dates.

### TASKS
Toggle: Kanban | Checklist
Kanban: 2 swim lanes (Work / Personal) × 3 columns (To Do / In Progress / Done)
  - Click card advances it to next column
  - Overdue tasks: red border on card
  - Recurring tasks: purple recycle icon
Checklist: 2 column grid, checkable rows with priority badges and due dates
Top bar shows: done count, overdue count (pulsing red dot)

### HEALTH & WELLNESS
- Medications (span 5): checkable list, morning/evening tags
- Daily Habits (span 7): 3 habits (water/exercise/sleep), full-row toggle buttons
- Cycle Tracker (span 7): 28-day grid, period/fertile/peak/today markers, private badge
- Appointments (span 5): checkable appointment list, add appointment button

### FESTIVALS & RECURRING
Grid: `repeat(auto-fill, minmax(300px, 1fr))`
**Data source:** PostgreSQL `festivals` table — seeded from `server/seeds/festivals.json` (3232 entries) at server startup. No static frontend data files — the deleted files (`festivals.js`, `christianHolidays.js`, `jainHolidays.js`, `holidayCalendar.js`, `sikhCalendar.js`) have been removed.
- `user_festivals` mapping table filters which festivals each user sees (auto-synced from `user_calendars` via `syncUserFestivals()` in `server/routes/festivalSync.js` on every GET)
- New users default to `['IN','TH','hindu','sikh']` subscriptions
- Filter tabs: All | ⭐ Pinned (if any) | Sikh | Indian | Thai | Christian | Jain | etc. (only tabs for subscribed calendars shown)
- Each card has a ⭐ pin button → writes to `user_pinned_festivals`; pinned festivals appear on Today Dashboard "Pinned Alert" card
Rakhi Mode: special red alert if days ≤ 21
Urgency color: red if ≤7 days, amber if ≤21 days, grey otherwise

### SPORTS TRACKER
Toggle pills: F1 / Cricket / Football / Badminton
F1: race calendar (next 6 races) + driver standings (top 5)
Cricket: upcoming/live/done match cards
Football: FIFA World Cup 2026 fixtures
Each sport panel has toggle on/off

Pre-loaded F1 calendar (2026 remaining races):
- R9: Canadian GP · 14 Jun 2026
- R10: Spanish GP · 28 Jun 2026
- R11: Austrian GP · 5 Jul 2026
- R12: British GP · 19 Jul 2026
- R13: Hungarian GP · 2 Aug 2026
- R14: Belgian GP · 30 Aug 2026

### FAMILY SPACE
- Anaya's school terms (span 7): 4 term milestones with colored bars
- Shopping list (span 5): checkable list + inline add input
- Family moments wall (span 12): photo grid with emoji placeholders + add button

### SETTINGS
Tabs: Profiles | Notifications | Connections | Export
- Profiles: 3 user cards (Jagdeep/Simran/Anaya), active highlighted with accent color
- Notifications: toggle list (7 notification types)
- Connections: connected users list + "Invite someone to your orbit" button
- Export: JSON export + ICS export buttons

---

## Key Animations (define in tailwind.config.js keyframes)

```js
keyframes: {
  'om-pop':      { '0%,100%': {transform:'scale(1)'}, '40%': {transform:'scale(1.35)'} },
  'om-fade-up':  { from: {opacity:'0', transform:'translateY(10px)'}, to: {opacity:'1', transform:'translateY(0)'} },
  'om-confetti': { '0%': {transform:'translateY(-10vh) rotate(0deg)', opacity:'1'}, '100%': {transform:'translateY(110vh) rotate(720deg)', opacity:'0.9'} },
  'om-pulse':    { '0%,100%': {opacity:'1'}, '50%': {opacity:'0.45'} },
  'om-spin':     { to: {transform:'rotate(360deg)'} },
}
```

---

## Smart Behaviors to Implement

1. **Auto date-push**: When a learning session is marked missed, show modal:
   "Push to next weekday?" → cascade all future sessions forward by 1 workday.
   Show rescheduled banner on calendar for 24h.

2. **Conflict detection**: If 3+ events land on same day, show warning chip on calendar cell.

3. **Rakhi Mode**: Auto-activates when Raksha Bandhan is ≤ 21 days away.
   Shows red alert card in Festivals section and on Today dashboard.

4. **Weekdays-only scheduler**: Learning sessions never land on Sat/Sun.
   Skip weekends when calculating next session date.

5. **Confetti**: Fire on — learning session complete, course complete, exam passed.

---

## File Structure (target)
```
orbitly/
├── public/
│   └── seeds/                # Static JSON seed files served at /seeds/*.json
│       ├── family-virdi.json
│       ├── family-sahmbi.json
│       ├── family-custom.json
│       ├── plan-anthropic-certification-plan.json
│       ├── plan-google-ai-professional-certificate.json
│       └── plan-associate-data-analyst-in-sql.json
├── server/
│   ├── middleware/
│   │   ├── requireAuth.js    # Clerk JWT verification (standalone verifyToken from @clerk/backend v3)
│   │   └── requireHousehold.js
│   ├── routes/               # Express route handlers
│   │   ├── festivals.js      # includes GET/POST/DELETE /pinned endpoints
│   │   ├── festivalSync.js   # syncUserFestivals(userId) — syncs user_calendars → user_festivals
│   │   └── ... (all other route files)
│   ├── seeds/
│   │   └── festivals.json    # 3232 festival/holiday entries — source of truth for festivals table
│   ├── db.js
│   ├── index.js              # Express server, migrations, festival seeding on startup
│   └── schema.sql
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── TopBar.jsx
│   │   │   └── BottomTabBar.jsx
│   │   ├── sections/
│   │   │   ├── TodayDashboard.jsx
│   │   │   ├── CalendarView.jsx
│   │   │   ├── LearningPlanner.jsx
│   │   │   ├── TasksBoard.jsx
│   │   │   ├── HealthWellness.jsx
│   │   │   ├── FestivalsRecurring.jsx
│   │   │   ├── SportsTracker.jsx
│   │   │   ├── FamilySpace.jsx
│   │   │   └── SettingsProfiles.jsx
│   │   └── ui/
│   │       ├── CheckRow.jsx
│   │       ├── ProgressRing.jsx
│   │       ├── ConfettiCannon.jsx
│   │       ├── PriorityBadge.jsx
│   │       ├── StatPill.jsx
│   │       └── MedCard.jsx
│   ├── data/
│   │   ├── users.js          # USERS constant
│   │   ├── seedTasks.js      # initial work + personal tasks
│   │   ├── seedMeds.js       # medication list
│   │   ├── certPlan.js       # Anthropic Academy plan with exact dates
│   │   └── sportsData.js     # F1 calendar, cricket, football fixtures
│   │   # NOTE: festivals.js, christianHolidays.js, jainHolidays.js,
│   │   # holidayCalendar.js, sikhCalendar.js — DELETED (Phase 25).
│   │   # All festival data now lives in server/seeds/festivals.json → DB.
│   ├── api/
│   │   └── client.js         # All API calls + auth token attachment via setTokenGetter
│   ├── hooks/
│   │   ├── useTimer.js       # countdown timer hook
│   │   ├── useTheme.js       # dark/light toggle + CSS var injection
│   │   └── useConfetti.js    # confetti cannon
│   ├── store/
│   │   └── appStore.js       # useReducer store with localStorage persistence
│   ├── utils/
│   │   ├── dateUtils.js      # addWorkdays, daysAway, isWeekend helpers
│   │   └── calendarUtils.js  # buildMonthGrid, buildWeekCells
│   ├── App.jsx               # Routes + AppDataLoader (bootstrap all API data on mount)
│   ├── ClerkBridge.jsx       # Synchronously registers Clerk token getter (must NOT be in useEffect)
│   ├── main.jsx
│   └── index.css             # @import fonts + CSS custom properties
├── CLAUDE.md                 ← this file
├── TASKS.md
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## Development Commands
```bash
npm install
npm run dev        # Vite dev server → http://localhost:5177 + Express API on :3003
npm run build      # Production build
npm run preview    # Preview production build
```

---

## Backend Architecture Notes
The app has a full Node.js/Express backend (added in Phase 14+). Key points:
- **Auth:** `server/middleware/requireAuth.js` uses standalone `verifyToken` from `@clerk/backend` v3 (NOT `clerkClient.verifyToken()` — that method does not exist in v3)
- **ClerkBridge:** `src/ClerkBridge.jsx` MUST call `setTokenGetter(getToken)` synchronously in the component body, NOT inside `useEffect`. Moving it to useEffect causes a race condition where AppDataLoader's bootstrap fetches fire before the token getter is registered, resulting in 401s and empty state.
- **Festival data:** All holiday/festival data lives in `server/seeds/festivals.json` → seeded into the `festivals` DB table on startup. Frontend no longer imports static calendar data files.
- **`user_festivals`:** Auto-synced junction table mapping users to their subscribed festivals. `syncUserFestivals(userId)` runs on every `GET /api/festivals` call.

---

## Do Not
- Do not use an icon library (lucide, heroicons, etc.) — inline SVG only
- Do not use CSS modules or styled-components — Tailwind only
- Do not modify the design tokens — match the prototype exactly
- Do not add features not in the prototype without asking first
- Do not import static festival/holiday data files in frontend components — use `GET /api/festivals` instead
- Do not call `clerkClient.verifyToken()` — it does not exist in `@clerk/backend` v3; use the standalone `verifyToken` export
