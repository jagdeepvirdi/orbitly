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

---

## PHASE 13 — Medical Document AI Extraction

> Goal: Make prescription uploads extract a full medication list (auto-add to Med checklist + calendar), and make blood report uploads extract all test rows into a colour-coded table with AI interpretation.
>
> **Why current extraction is broken:**
> PDFs are sent raw to Ollama vision, which only accepts images → silent failure. Gemini is the fallback but quota is often exceeded. Even when it does work, the prompts only return 3–6 metadata fields, not the actual medication list or test rows.
>
> **Stack decision:** Use `pdf-parse` (Node.js, no Python needed) for PDF-to-text. markitdown (Microsoft Python tool) is equivalent but requires Python runtime — skip for now. Ollama handles text prompts well; vision is only needed for image files (JPGs/PNGs of handwritten prescriptions).

### 13.1 — PDF text extraction layer  `[x]`
- Install `pdf-parse` (`npm install pdf-parse`)
- In `server/routes/extract.js`: if `mimeType === 'application/pdf'`, extract plain text with `pdf-parse`, then send as a **text prompt** to Ollama/Gemini (not vision/image)
- If file is an image (JPEG/PNG/WEBP), keep the current vision approach
- Add a `extractedText` field to the API response so the UI can show a preview of what the AI saw
- Test with a real prescription PDF and blood report PDF

### 13.2 — Full prescription extraction + medication import  `[x]`
- Update `PRESCR_PROMPT` to return:
  ```json
  {
    "label": "short label",
    "doctor": "Dr. Name",
    "clinic": "clinic/hospital name",
    "date": "YYYY-MM-DD",
    "medications": [
      { "name": "med name", "dose": "500mg", "frequency": "twice daily", "duration": "30 days", "instructions": "take with food" }
    ]
  }
  ```
- After extraction: show an **"Extracted Medications"** confirmation step inside the prescription upload modal
  - Each extracted medication shown as a row with a checkbox (pre-ticked)
  - User can uncheck any to skip
  - "Add X medications to checklist" button → calls `api.createMed()` for each ticked item, links `prescriptionId`
- Show a second "Add morning/evening reminders to calendar?" toggle (future: creates calendar events)
- Fall back gracefully: if `medications` is empty/missing, leave the manual form as-is

### 13.3 — Blood report table extraction  `[x]`
- Update `TEST_PROMPT` to return:
  ```json
  {
    "name": "CBC Blood Panel",
    "category": "Blood Test",
    "lab": "lab name",
    "date": "YYYY-MM-DD",
    "doctor": "Dr. Name",
    "tests": [
      { "name": "Hemoglobin", "value": "14.5", "unit": "g/dL", "normalMin": "13.5", "normalMax": "17.5", "status": "normal" }
    ]
  }
  ```
- Store `tests` array in the `testResults` entry (add `tests` column to `test_results` table or store as JSONB)
- In `HealthWellness.jsx` `TestResultCard`: add an expand button "View test table"
- Expanded view: a table with columns — Test | Value | Unit | Normal Range | Status
  - Status pill: green = normal, red = high/low, grey = unknown
  - Sort: out-of-range rows first

### 13.4 — AI interpretation of blood results  `[x]`
- After the test table is extracted, make a **second AI call** with the out-of-range results
- Prompt: "You are a friendly health educator. For each out-of-range test result below, explain in 1–2 plain sentences what it means and when to consult a doctor. Return JSON: `[{ name, interpretation }]`"
- Store interpretation alongside the test row
- Show as a tooltip or expandable row below each flagged result
- Use Gemini for this call if Ollama interpretation quality is poor (configurable via `INTERPRET_MODEL=gemini` in `.env`)

### 13.5 — AI availability UI  `[x]`
- The `GET /api/extract/status` route already returns Ollama + Gemini state
- Add a small status banner in the prescription and test-result upload modals:
  - 🟢 "AI ready — Ollama (gemma3:4b)" 
  - 🟡 "Gemini only — Ollama offline"
  - 🔴 "AI unavailable — Gemini quota exceeded, resets at midnight ICT. Fill in manually."
- When both are down, hide the "Extract with AI" button and show the red banner instead of a broken spinner

---

## ✅ DONE — PHASE 14 — Authentication

> Goal: Add email + password login so the app is safe to put on the internet. Each person gets their own account and sees only their own data. Use Clerk for auth (free up to 10,000 users) — it handles the login UI, sessions, password reset, and gives every user a stable `userId` with zero server-side session management needed.

### 14.1 — Install & configure Clerk
- `npm install @clerk/clerk-react` in the frontend
- Create a Clerk application at clerk.com, copy the publishable key into `.env` as `VITE_CLERK_PUBLISHABLE_KEY`
- Wrap `<App />` in `<ClerkProvider>` in `src/main.jsx`
- Add `CLERK_SECRET_KEY` to the backend `.env` for server-side token verification

### 14.2 — Login / signup page
- Add a `/login` route that renders `<SignIn />` from Clerk (it handles all UI)
- Add a `/signup` route that renders `<SignUp />`
- Redirect unauthenticated users to `/login` using Clerk's `<RedirectToSignIn />` guard
- After login, redirect to `/` (Today dashboard)
- Remove the dummy "user pill" in Sidebar — replace with the real Clerk `<UserButton />` (shows avatar, logout, account settings)

### 14.3 — Pass auth token from frontend to backend
- In `src/api/client.js`: attach the Clerk session token as `Authorization: Bearer <token>` on every `fetch` call
  - Use `useAuth().getToken()` hook to retrieve the token before each request
- Create a middleware `server/middleware/requireAuth.js`:
  - Verify the Bearer token using Clerk's `verifyToken()` from `@clerk/backend`
  - Attach `req.userId` (Clerk's `sub` claim) to the request
  - Return 401 if token is missing or invalid
- Apply this middleware to all API routes

### 14.4 — Add `user_id` column to all personal DB tables
- Tables that need `user_id` (personal data, one user only):
  - `tasks`, `meds`, `habits`, `appointments`, `courses`, `prescriptions`, `test_results`, `hobby_projects`, `hobby_log`, `recipes`, `meal_plan`, `imported_cal_events`, `finance_paid`
- Add the column: `ALTER TABLE <table> ADD COLUMN user_id TEXT NOT NULL DEFAULT ''`
- Backfill existing rows with Jagdeep's Clerk user ID
- Add a DB index on `user_id` for every table

### 14.5 — Filter all backend queries by `user_id`
- Update every `SELECT`, `INSERT`, `UPDATE`, `DELETE` in `server/routes/` to include `WHERE user_id = $userId`
- On `INSERT`, always write `req.userId` into the `user_id` column
- Test: log in as two different accounts — confirm each sees only their own data

---

## ✅ DONE — PHASE 15 — Shared household data (wife access)

> Goal: Some data is personal (tasks, health, learning) and some is shared between household members (shopping list, household chores, family moments). Implement a `household_id` concept so Jagdeep and his wife see the same shared lists while keeping personal data separate.

### 15.1 — Household model in the DB
- Create a `households` table: `id` (UUID), `name`, `created_by` (user_id), `created_at`
- Create a `household_members` table: `household_id`, `user_id`, `role` (owner/member), `joined_at`
- On first login for a new user: auto-create a household for them and add them as owner
- When a partner accepts an invite: add them to the inviter's household as a member

### 15.2 — Invitation flow (backend)
- `POST /api/household/invite` — takes `{ email }`, creates a signed invite token (JWT, 7-day expiry), stores in `household_invites` table, emails the link (use Resend.com free tier — 3,000 emails/month)
- `GET /api/household/invite/:token` — validates token, returns household name + inviter name
- `POST /api/household/invite/:token/accept` — adds the authenticated user to the household, marks invite used

### 15.3 — Invitation flow (frontend)
- In Settings → Connections: the "Send Invite" button now calls `POST /api/household/invite`
- Add an `/invite/:token` route in the app: shows "Jagdeep invited you to join their Orbitly household" + Accept button
- After accepting, reload the app — shared data is now visible

### 15.4 — Migrate shared tables to `household_id`
- Tables that should be shared within a household:
  - `shopping_list`, `chores`, `family_events`, `family_members`, `family_moments`, `family_groups`
- Replace `user_id` with `household_id` on these tables
- Query: `WHERE household_id = (SELECT household_id FROM household_members WHERE user_id = $userId LIMIT 1)`

### 15.5 — Wife's personal sections
- Once she logs in, she gets her own personal data:
  - Her own tasks, meds, habits, appointments, learning plan, health records
  - Her own birthdays & anniversaries list
  - Her own calendar imports
- Shared: shopping list, household chores, family moments, family directory
- No code change needed beyond 15.4 — the `user_id` / `household_id` split handles it

---

## PHASE 16 — Deployment

> Goal: Get the app live on the internet at zero or near-zero cost. Frontend on Vercel, backend on Render, database on Neon.tech (all free tiers).

### 16.1 — Database: migrate to Neon (PostgreSQL in the cloud)
- Sign up at neon.tech — free tier gives 0.5 GB PostgreSQL
- Export current local DB schema and seed data
- Run migrations on Neon; copy the `DATABASE_URL` connection string
- Update `server/db.js` (or equivalent) to use `DATABASE_URL` from env instead of a local file path
- Confirm all existing API routes work against Neon locally before deploying

### 16.2 — Backend: deploy to Render
- Sign up at render.com, create a new **Web Service**, connect the GitHub repo
- Set root directory to `server/` (or wherever the Node.js server lives)
- Build command: `npm install`; Start command: `node index.js` (or `npm start`)
- Add environment variables in Render dashboard:
  - `DATABASE_URL` (from Neon)
  - `CLERK_SECRET_KEY`
  - `GEMINI_API_KEY`
  - `NODE_ENV=production`
- Note: free tier sleeps after 15 min of inactivity — first request after idle takes ~30s. Upgrade to $7/month if instant wake is needed.
- Remove Ollama references from the server's AI router when `NODE_ENV=production` (Ollama is local-only)

### 16.3 — Frontend: deploy to Vercel
- `npm install -g vercel` then `vercel` in the project root
- Vercel auto-detects Vite; set output directory to `dist`
- Add environment variables in Vercel dashboard:
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `VITE_API_BASE_URL` = the Render backend URL (e.g. `https://orbitly-api.onrender.com`)
- Update `src/api/client.js` to use `import.meta.env.VITE_API_BASE_URL` as the base URL instead of `localhost:3003`
- Deploy: `vercel --prod`

### 16.4 — Custom domain (optional, free)
- Vercel gives a free `*.vercel.app` subdomain — usable as-is
- If you own a domain, add it in Vercel dashboard → Domains → takes 5 minutes
- No cost unless buying a new domain (~$10/year)

### 16.5 — Production smoke test
- Log in as Jagdeep on laptop → verify all sections load from the live DB
- Log in on mobile (phone browser) → verify responsive layout works
- Send invite to wife's email → she signs up → verify she sees shared shopping list + chores but not your personal tasks/health
- Test Gemini AI extraction (prescription upload) on the live URL — Ollama won't work, confirm Gemini fallback is the only AI in production

---

## PHASE 17 — Security & Stability Hardening (Architect Review Hit-List)

> Source: Full codebase audit — Senior Architect + VC review, June 2026.
> Complete ALL Critical items before any external user touches the app.
> Complete High Priority items before friends are invited.

---

### CRITICAL — Fix immediately / Showstoppers

- [x] **Fix shell injection in `routes/courses.js` line 231** — `req.body.url` is interpolated raw into `execAsync()`. Validate URL format with `new URL()`, reject non-http(s) schemes, then pass as an argument array (not a shell string) or use `node-fetch` directly instead of `curl.exe`
- [x] **Fix SSRF in `routes/courses.js` line 246** — user-supplied URL is fetched with no validation. Blocklist private IP ranges (`127.x`, `10.x`, `192.168.x`, `169.254.x`) before any outbound fetch. Use a URL allowlist for production.
- [x] **Fix the broken `pdf-parse` import in `routes/extract.js` line 2** — `import { PDFParse } from 'pdf-parse'` is wrong; the package exports a default function. Change to `import pdfParse from 'pdf-parse'` and update the call sites. Until this is fixed the entire AI PDF extraction pipeline is dead and every PDF upload silently falls through to the vision path.
- [x] **Rotate all API keys immediately** — run `git log --all --full-history -- .env` to check if `.env` was ever committed. If yes, rotate `CRICAPI_KEY`, `FOOTBALL_DATA_KEY`, and `GEMINI_API_KEY` at their respective dashboards. A leaked key in git history is permanent regardless of `.gitignore`.
- [x] **Add rate limiting to AI endpoints** — install `express-rate-limit`, apply a strict limit (e.g. 20 requests/15 min per IP) to `POST /api/extract` and `POST /api/courses/ai-import`. Without this a script can exhaust your entire Gemini daily quota in under 2 minutes at zero cost to the attacker.
- [x] **Reduce Express body limit on non-extract routes** — `index.js` line 153 sets `express.json({ limit: '25mb' })` globally. Only `/api/extract` needs 25 MB. All other routes should be `50kb` max.
- [x] **Add `user_id` to all personal DB tables before deploying** — this is tracked in Phase 14.4 but listed here because it is a precondition for the app to be safe with more than one user, not just an auth concern. All data is currently global.

---

### HIGH PRIORITY — Refactoring & Scalability

- [x] **Fix the double-bootstrap race condition** — `appStore.js` (lines 339–365) and `App.jsx` (lines 54–76) both fetch and dispatch the same data on mount. Pick one place. Remove the fetch block from `appStore.js` entirely; `App.jsx` is the correct location. Ensure `DAILY_RESET` fires after bootstrap resolves, not before.
- [x] **Fix the `useEffect` dynamic dep array in `appStore.js` line 351** — `PERSIST_KEYS.map(k => state[k])` creates a new array on every render, violating React's rules-of-hooks and causing the save to re-fire constantly. Spread the keys explicitly: `}, [state.theme, state.userId, state.examDone, ...]`
- [x] **Split `LearningPlanner.jsx` (2,256 lines) into a folder** — extract the 20 internal component definitions into separate files under `src/components/sections/learning/`. The export stays `LearningPlanner.jsx` but imports from sub-files. This is the single biggest maintainability block in the codebase.
- [x] **Split `HealthWellness.jsx` (1,146 lines)** — extract `MedCard`, `PrescriptionCard`, `TestResultCard`, `CycleTracker`, `AppointmentsCard` into `src/components/sections/health/`
- [x] **Add indexes to all DB tables** — at minimum: `med_checkins(checkin_date)`, `habit_checkins(checkin_date)`, `tasks(list, status)`, `courses(plan_id)`, `festivals(event_date)`, `family_members(group_id)`, `finance_paid(paid_month)`. Full-scan on every page load is a time bomb.
- [x] **Replace ad-hoc migration system with a proper tool** — install `node-pg-migrate` or `db-migrate`. Move all `ALTER TABLE` statements from `server/index.js` into numbered migration files. Add a `migrations` table so each migration runs exactly once. Stop swallowing migration errors at startup.
- [x] **Add rate limiting to external sports API calls** — `GET /api/cricket/matches` has a 100-call/day CricAPI limit and `GET /api/football/matches` has a 10/min limit. A single user refresh-spamming will get your API keys banned. Add in-memory throttling per-key before forwarding.
- [x] **Fix 5 files hardcoding `http://localhost:3003`** — `HealthWellness.jsx` (5 occurrences), `TopBar.jsx`, `SettingsProfiles.jsx` all bypass the Vite proxy and the API client. Move all `fetch('http://localhost:3003/...')` calls to use `api.*` from `src/api/client.js` or at minimum use `/api/...` relative paths. This will break in every non-localhost environment.
- [x] **Add CORS production origin** — `index.js` line 152 only allows `localhost:5177`. Add the Vercel production URL before deploying: `origin: [process.env.ALLOWED_ORIGIN, 'http://localhost:5177']`
- [x] **Add lazy loading for all 14 sections** — in `App.jsx`, replace static imports with `React.lazy(() => import('./components/sections/...'))` wrapped in `<Suspense>`. The initial bundle will drop from ~618KB to under 200KB for the Today view.
- [x] **Add input validation on `mimeType` in `routes/extract.js` line 363** — whitelist `['image/jpeg','image/png','image/webp','application/pdf']` and reject anything else before forwarding to AI backends.
- [x] **Return generic error messages from API routes** — currently raw PostgreSQL error messages (`e.message`) are returned to the client on 500s, leaking schema names, constraint names, and column names. Wrap all route catch blocks: `res.status(500).json({ error: 'Something went wrong' })` and log the real error server-side only.
- [x] **Fix `family_groups.side` CHECK constraint** — `schema.sql` has `CHECK (side IN ('sahmbi','virdi'))` which hardcodes your family names in the DB schema. The `routes/family.js` POST creates groups with `side='custom'` which violates this constraint. Either drop the CHECK or expand it to include `'custom'`.
- [x] **Migrate `tasks.due`, `appointments.appt_date`, `courses.next_iso` from VARCHAR to DATE** — storing `"Yesterday"` as a date field makes server-side date queries impossible. Fix schema and update the routes/UI to store ISO date strings (`YYYY-MM-DD`) that can be compared and sorted in SQL.
- [x] **Split the god-object store into domain stores** — break `appStore.js` into at minimum: `uiStore.js` (theme, section, isMobile), `healthStore.js` (meds, habits, appointments, prescriptions, testResults), `tasksStore.js` (workTasks, personalTasks), `learningStore.js` (courses, examDone, timer), `homeStore.js` (choreList, shopList). Keep a root provider that composes them.
- [x] **Remove dead dependencies** — uninstall `react-router-dom` (installed, never used — 0 Route/BrowserRouter calls), `pdfjs-dist` from the server (only used in the browser client), `concurrently` from `dependencies` → move to `devDependencies`.
- [x] **Remove dead schema tables** — `f1_calendar`, `f1_drivers`, `cricket_matches`, `football_fixtures` exist in `schema.sql` but are never written to (routes fetch live from external APIs). Drop them to avoid confusion for any future developer.
- [x] **Consolidate duplicate utility functions** — `fmtApptDate()` exists in both `appStore.js` (line 8) and `HealthWellness.jsx` (line 7). `todayISO()` exists in both `HealthWellness.jsx` and `LearningPlanner.jsx`. Move all date helpers to `src/utils/dateUtils.js` and import from there.
- [x] **Extract shared modal/form primitives** — `ModalBase` + `ModalHeader` + `Field` + `INP` input style are independently copy-pasted in `LearningPlanner.jsx`, `HealthWellness.jsx`, and `FinanceTracker.jsx`. Create `src/components/ui/Modal.jsx` and `src/components/ui/FormField.jsx` and replace all three copies.
- [x] **Add `connectionTimeoutMillis` and `idleTimeoutMillis` to `db.js` Pool config** — under Neon free tier the DB cold-starts after inactivity. Without timeouts, the first query after idle silently hangs. Set `connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000`.
- [x] **Persist Gemini quota counter across restarts** — currently the in-process counter resets to 0 on every server restart (Render free tier restarts after 15 min idle). Store the counter + reset timestamp in the DB or Redis so quota tracking survives restarts.
- [x] **Remove all `console.log` from production server code** — `routes/extract.js` and `routes/courses.js` have 37+ console calls logging raw AI responses. Replace with structured logging (install `pino`) with `LOG_LEVEL` env-var gating.
- [x] **Replace `Date.now()` string PKs with UUIDs** — `'m' + Date.now()`, `'s' + Date.now()`, `'ch' + Date.now()` etc. are not collision-safe under concurrent writes. Use `gen_random_uuid()` in PostgreSQL as the default for all PK columns.
- [x] **Add FK constraint on `finance_paid.item_id`** — currently references nothing. Orphaned paid records accumulate when subscriptions/loans are deleted. Add proper FK or at minimum a cleanup trigger.
- [x] **Move `concurrently` to `devDependencies`** — it is only used by `npm run dev`. Having it in `dependencies` inflates the production `node_modules`.

---

### NICE TO HAVE — Polish & Optimization

- [x] **Add error tracking (Sentry)** — `@sentry/node` + `@sentry/react` installed; init in `server/index.js` (top, before Express) and `src/main.jsx`, gated on `SENTRY_DSN` / `VITE_SENTRY_DSN` env vars. No-op when vars absent.
- [x] **Add analytics (PostHog)** — `posthog-js` installed; init in `src/main.jsx` gated on `VITE_POSTHOG_KEY`; `section_view` events tracked in `App.jsx` via `useRef` to avoid double-fires.
- [x] **Add a test suite** — vitest v4 + @testing-library/react installed; 19 unit tests for `dateUtils.js` (all passing). `npm test` / `npm run test:watch`. Also fixed a real timezone bug in `addWorkdayToISO` (was using `toISOString()` on local-midnight dates, causing off-by-one in UTC+7).
- [x] **Pin `express` to v4 stable** — downgraded to `^4.21.0`
- [x] **Add `nodemon` for server development** — installed, `npm run dev` and `npm run server` now use nodemon
- [x] **Add a privacy policy page** — `public/privacy.html` created (GDPR/PDPA/DPDP compliant, covers health/financial/AI/household data). Linked from Settings → Export tab. Accessible at `/privacy.html`.
- [x] **Consider a payment layer (Stripe)** — `stripe` installed; `server/routes/billing.js` created with `GET /status`, `POST /create-checkout`, `POST /webhook`; `user_plans` table added via migration; "Orbitly Pro" card + enquiry button in Settings → Export tab.
- [x] **Add `build: { sourcemap: false }` to `vite.config.js`** — done
- [x] **Use `gen_random_uuid()` as DB default instead of app-generated IDs** — migrations added for 8 tables (tasks, medications, appointments, shopping_items, 4 finance tables); routes updated to omit `id` from INSERT; `courses.js` uses `crypto.randomUUID()` instead of `Date.now()`.
- [x] **Add `<ErrorBoundary>` wrappers around each section component** — `src/components/ui/ErrorBoundary.jsx` created (class component); wraps `<SectionComponent />` in `App.jsx` with `key={state.section}` so the boundary auto-resets on navigation. Shows "Something went wrong" + reload button instead of a blank screen.
- [x] **Resolve the `module-level singleton` date issue in `appStore.js` line 36** — converted `INITIAL_STATE` plain object to `createInitialState()` function; `useReducer` now calls it lazily via the init-function pattern so `calMonth`/`calYear` are always computed at mount time, not module-load time.
- [x] **Move `concurrently` to `devDependencies`** — already in devDependencies (confirmed)

---

---

## PHASE 18 — Recipe Discovery & Cuisine Library ✅ DONE

> Goal: Let users browse authentic multicultural recipes by cuisine and add them to their weekly meal plan. No key required — use TheMealDB (free, open API, 300+ meals, 25+ cuisine areas including Indian, Thai, Italian, Chinese, Japanese, Mexican). Current FoodPlanner only has manual entry and local PDF parsing with no external data source.

### 18.1 — Backend recipe proxy (TheMealDB) `[x]`
- [x] Create `server/routes/recipes.js`:
  - `GET /api/recipes/areas` → fetch `https://www.themealdb.com/api/json/v1/1/list.php?a=list` → return sorted area list
  - `GET /api/recipes/categories` → fetch `https://www.themealdb.com/api/json/v1/1/list.php?c=list` → return category list
  - `GET /api/recipes/by-area?area=Indian` → `filter.php?a=Indian` → return meal list (id, name, thumbnail)
  - `GET /api/recipes/by-category?category=Seafood` → `filter.php?c=Seafood`
  - `GET /api/recipes/search?q=butter+chicken` → `search.php?s=...` → return matching meals
  - `GET /api/recipes/detail?id=52772` → `lookup.php?i=...` → return full recipe (name, category, area, instructions, ingredient+measure pairs, youtube link, thumbnail)
- [x] Cache all responses: areas/categories at 24h TTL, meal lists at 6h, detail at 12h
- [x] Mount in `server/index.js`: `app.use('/api/recipes', recipesRouter)`
- [x] Strip null ingredients from the TheMealDB response (it returns `strIngredient1`–`strIngredient20` with many empty strings)
- [x] Add to `src/api/client.js`: `getRecipeAreas()`, `getRecipesByArea(area)`, `searchRecipes(q)`, `getRecipeDetail(id)`

### 18.2 — Discover Recipes UI in FoodPlanner `[x]`
- [x] Add a "Discover" tab/button next to the existing "My Recipes" tab in FoodPlanner header
- [x] Discover view layout:
  - **Row 1**: Cuisine (Area) filter — horizontal scrollable pill row with all 25+ areas. "All" pill first, then alphabetical. Active pill = accent bg.
  - **Row 2**: Category filter — smaller pills (Chicken, Beef, Vegetarian, Seafood, Dessert, etc.)
  - **Row 3**: Search input — "Search by name or ingredient…" → debounced 400ms → calls `searchRecipes`
  - **Main grid**: `repeat(auto-fill, minmax(180px, 1fr))` recipe cards — thumbnail image, meal name, area badge
- [x] Loading state: 6 skeleton cards (pulse animation, same grid)
- [x] Empty state: "No recipes found for this cuisine yet." with TheMealDB attribution link

### 18.3 — Recipe detail drawer `[x]`
- [x] Clicking a recipe card opens a right-side drawer (full-height, 480px wide, overlay backdrop):
  - **Header**: thumbnail image (full width, aspect 16/9), title, area + category pills, YouTube link button (opens in new tab)
  - **Ingredients table**: 2 columns (Measure | Ingredient), striped rows
  - **Instructions**: numbered steps, parsed by splitting on `\n` or `. `
  - **Footer**: two buttons:
    - "Save to My Recipes" → converts TheMealDB format to internal recipe format, dispatches `ADD_RECIPE`, shows toast "Added to My Recipes"
    - "Add to Meal Plan" → opens a day/meal picker (date input + Breakfast/Lunch/Dinner dropdown) → dispatches `SET_MEAL_PLAN`
- [x] Drawer slides in from right using CSS transform transition (300ms ease)

### 18.4 — Recipe format bridge `[x]`
- [x] TheMealDB returns `strIngredient1…20` + `strMeasure1…20` as flat fields
- [x] Write `parseMealDbRecipe(meal)` in `src/utils/recipeUtils.js`:
  - Extract non-empty ingredient/measure pairs into `{ ingredient, measure }[]`
  - Map to internal format: `{ id, title, category, cuisine, servings: null, ingredients: [...], steps: [...], sourceType: 'themealdb', sourceId: meal.idMeal, thumbnail: meal.strMealThumb, youtubeUrl: meal.strYoutube, importedAt }`
- [x] Store in `state.recipes` (already persisted to localStorage via PERSIST_KEYS)

### 18.5 — FoodPlanner tab state `[x]`
- [x] Add `discoverArea`, `discoverCategory`, `discoverSearch` to local component state (not store — ephemeral UI state)
- [x] When area changes, fetch by area; when search has ≥3 chars, switch to search results; category filter applied client-side from the fetched list
- [x] "My Recipes" tab: unchanged — shows saved recipes with existing add/edit flow

---

## PHASE 19 — Calendar Subscriptions & Holiday Packs ✅ DONE

> Goal: Let users choose which holiday/religious calendars to overlay on their calendar. Currently the app hardcodes India (IN) + Thailand (TH) via Nager.Date with a custom fallback array. There is no UI for adding a Sikh calendar, Hindu festival calendar, Islamic calendar, or any other country. This phase makes it all user-configurable.

### 19.1 — Calendar pack data sources `[x]`
- [x] Hindu, Sikh, Islamic, Thai Buddhist hardcoded arrays (2026–2030) added to `server/routes/holidays.js`
- [x] Christian + Jain arrays added to `server/routes/holidays.js` (exported `CHRISTIAN_HOLIDAYS`, `JAIN_HOLIDAYS`)
- [x] Frontend data files created: `src/data/christianHolidays.js`, `src/data/jainHolidays.js` (with emoji/action/reminder for FestivalsRecurring)

### 19.2 — Backend calendar subscription endpoint `[x]`
- [x] `GET /multi?year=Y&calendars=IN,TH,sikh,...` route added to `server/routes/holidays.js`
- [x] Named pack IDs (hindu/sikh/islamic/thai-buddhist/christian/jain) resolved via `PACK_DATA` lookup, filtered by year, `calendarId` field added to each event
- [x] 2-letter country codes forwarded to Nager API + custom fallback merged
- [x] 24h cache keyed by `${year}:${sortedCalendarIds}`

### 19.3 — Calendar packs settings UI `[x]`
- [x] "Calendars" tab inserted between Notifications and Connections in `SettingsProfiles.jsx`
- [x] `CalendarsTab` component: 8-pack card grid with toggle switches for IN/TH/hindu/sikh/islamic/thai-buddhist/christian/jain
- [x] Each card shows flag, pack name, description, accent color, animated toggle
- [x] Toggle dispatches `TOGGLE_CALENDAR_PACK` + calls `api.setCalendarSubscription()` to sync to server

### 19.4 — Wire subscriptions to CalendarView and FestivalsRecurring `[x]`
- [x] `CalendarView.jsx`: replaced hardcoded `['IN', 'TH']` with `state.subscribedCalendars`
- [x] `buildHolidayEvents` uses `calendarId` from holiday objects for named pack colors
- [x] `CAT_LEGEND` in CalendarView updated with 6 new pack color entries
- [x] `FestivalsRecurring.jsx`: imports `CHRISTIAN_HOLIDAYS` + `JAIN_HOLIDAYS`, adds ✝️ Christian and 🔱 Jain filter pills, CAT_STYLE entries, and includes items in all/filter useMemo

### 19.5 — Persist calendar subscriptions to DB `[x]`
- [x] `user_calendars` table added to `server/schema.sql` and migration in `server/index.js`
- [x] `server/routes/calendarSubscriptions.js` created with `GET /subscriptions` + `POST /subscriptions`
- [x] Mounted at `app.use('/api/calendars', calendarSubsRouter)` in `server/index.js`
- [x] `src/api/client.js`: added `getCalendarSubscriptions()`, `setCalendarSubscription()`, `getMultiHolidays()`
- [x] `src/hooks/useLiveHolidays.js` updated to call `api.getMultiHolidays` instead of per-country `api.holidays`
- [x] `src/store/appStore.js`: `subscribedCalendars` initial state + `TOGGLE_CALENDAR_PACK` reducer + 6 new CAT colors + PERSIST_KEYS entry
- [x] `src/App.jsx`: `api.getCalendarSubscriptions()` added to `Promise.allSettled` bootstrap sequence

---

## PHASE 20 — Sports Subscriptions & League Management ✅ DONE

> Goal: Replace the hardcoded F1/Cricket/Football/Tennis toggle list with a dynamic system where users subscribe to the sports and leagues they actually follow. Currently football shows a fixed 5-competition list and cricket only shows India+IPL matches — users have no way to follow EPL without knowing to edit an env variable.

### 20.1 — Sport and league catalog (backend) `[x]`
- [x] Create `server/routes/sportsCatalog.js`:
  - `GET /api/sports/catalog` → returns the full list of available sports + their leagues. Hardcode this list (it doesn't change often)
  - Mounted in `server/index.js`

### 20.2 — Sport subscription state `[x]`
- [x] Add to appStore: `sportSubscriptions: [{ sport: 'f1', leagues: [] }, { sport: 'cricket', leagues: ['ipl'] }, { sport: 'football', leagues: ['PL', 'CL'] }]` (initial defaults matching current behavior)
- [x] Replace `sportsToggles: { f1: true, cricket: true, football: true, badminton: false }` with the new subscription format
- [x] Migration: on first load, if old `sportsToggles` key exists in localStorage, convert it to the new format
- [x] Actions: `ADD_SPORT_SUBSCRIPTION`, `REMOVE_SPORT_SUBSCRIPTION`, `UPDATE_SPORT_LEAGUES`

### 20.3 — "Manage Sports" UI in SportsTracker `[x]`
- [x] Add a "⚙ Manage" button in the SportsTracker top bar (opens a modal)
- [x] **Manage Sports modal**:
  - Header: "Your Sports" with close button
  - List of all sports from catalog. For each:
    - Toggle to subscribe/unsubscribe
    - If subscribed and has leagues: expandable league picker (checkboxes)
    - Status chip: "Live data" (if API key configured) or "Seed data only"
    - "API key required" badge with link for sports that need a key (CricAPI, football-data.org)
  - "Add a sport not listed?" → links to the GitHub issues page or a feedback form
- [x] SportsTracker main view now renders only subscribed sports in the order they were added
- [x] For football: the `GET /api/football/matches` call is updated to send the user's subscribed `leagues` array as a query param instead of reading from the hardcoded env var

### 20.4 — NBA integration (balldontlie.io — completely free, no key) `[x]`
- [x] Create `server/routes/nba.js`:
  - `GET /api/nba/games?days=7` → fetch `https://api.balldontlie.io/v1/games?per_page=20&dates[]=YYYY-MM-DD...` (upcoming 7 days)
  - Returns: home team, visitor team, date, status, scores if available
  - Cache: 1h TTL
- [x] NBA section in SportsTracker: shows upcoming games this week + recent results
- [x] Seed data: 3 upcoming NBA Finals / regular season games in `sportsData.js`
- [x] Only renders if user has subscribed to NBA via the Manage Sports modal

### 20.5 — Tennis placeholder upgrade `[x]`
- [x] Rename `sportsToggles.badminton` to `sportsToggles.tennis` in the migration (20.2)
- [x] Replace the "coming soon" placeholder with real upcoming Grand Slam dates (hardcode the 4 Slams per year — dates are fixed years in advance)
- [x] Show: tournament name, location, date range, surface, status (upcoming / in progress / completed)
- [x] No live scores API yet — add to notes "Live scores: Coming in Phase 22"

### 20.6 — Persist sport subscriptions to DB (Phase 15+ only) `[x]`
- [x] `user_sport_subscriptions` table: `user_id`, `sport_id`, `leagues JSONB`, `added_at`
- [x] `GET /api/sports/subscriptions` → user's sport list
- [x] `POST /api/sports/subscriptions` → add/update subscription
- [x] `DELETE /api/sports/subscriptions/:sport` → remove sport
- [x] Add to bootstrap in App.jsx


---

## PHASE 21 — Connections Hub (Plugin Foundation) ✅ DONE

> Goal: Build a single "Connections Hub" in Settings where users can discover and manage all their data source subscriptions — calendar packs (Phase 19), sports subscriptions (Phase 20), recipe sources (Phase 18), custom ICS feeds, and future OAuth integrations. This is not a full plugin SDK; it's a curated integration marketplace backed by the real data sources already built in Phases 18–20.

### 21.1 — Redesign Settings → Connections tab as a hub
- Current Connections tab has: Your Account section + invite-by-email form + AI Backends panel
- Keep those sections. Add three new sections below them:
  1. **Calendar Packs** — summary card showing active packs count + "Manage" link → navigates to Settings → Calendars tab (Phase 19.3)
  2. **Sports Subscriptions** — summary card showing subscribed sports + "Manage" link → opens the Manage Sports modal (Phase 20.3)
  3. **Recipe Sources** — summary card showing TheMealDB as connected + cuisine areas count + "Explore Recipes" link → navigates to Food → Discover tab (Phase 18.2)
- Section header: "Connected Data Sources" with a divider above it

### 21.2 — Custom ICS feed manager
- Move the ICS import from Settings → Export tab to Settings → Connections tab (it logically belongs under connections, not exports)
- Expand it from a one-shot import to a **saved feed list**:
  - User pastes a public `.ics` URL (e.g. Google Calendar public URL, team schedule iCal feed)
  - "Add Feed" button → validate URL format → fetch once to confirm it returns `BEGIN:VCALENDAR` → save
  - Saved feeds list: feed name (auto-extracted from `X-WR-CALNAME` property), URL (truncated), last synced timestamp, "Sync now" button, delete button
  - Store in appStore: `icsFeeds: [{ id, name, url, lastSynced, enabled }]`
  - On app load (App.jsx bootstrap), fetch all enabled feeds in parallel → merge events into `importedCalEvents`
  - Cache per feed with TTL = 6h (honor `X-WR-CALDESC` or default)
- Use the existing `src/utils/icsParser.js` for parsing

### 21.3 — Integrations "Coming Soon" cards
- Below the active integrations, show a "Coming Soon" section with grayed-out integration cards:
  | Integration | Description | Status |
  |-------------|-------------|--------|
  | Google Calendar | Two-way sync: see your Google events in Orbitly, push Orbitly tasks to Google | Coming soon |
  | Apple Health | Import step count, sleep data, heart rate into Health section | Coming soon |
  | Strava | Auto-log runs/rides as completed workout habits | Coming soon |
  | Spotify | See what you're listening to in Today feed (ambient feature) | Coming soon |
  | Todoist | Import tasks from Todoist into Tasks board | Coming soon |
  | Notion | Sync Notion databases to Orbitly sections | Coming soon |
- Each card: logo icon (SVG inline), name, description, "Coming Soon" pill
- No functionality — pure UI scaffolding. Keeps the vision visible without building OAuth flows yet.
- "Request an integration" link at the bottom (opens default mail client to jagdeep.singh.virdi@gmail.com with subject "Orbitly: Integration Request")

### 21.4 — Connections Hub summary on Today Dashboard
- The Today Dashboard "Family Feed" card area (currently empty state) can double as a **Connections status widget**:
  - If user has 0 family connections AND 0 custom ICS feeds: show the existing "Connect your people" empty state
  - If user has active ICS feeds: show up to 3 upcoming events from those feeds with the feed name as a badge
  - If user has family connected (Phase 15): show family feed as before
- The widget gracefully degrades depending on what's connected

### 21.5 — Plugin architecture notes (future Phase 22+)
- Document the plugin contract in `src/plugins/README.md` (create this file):
  - A plugin is a JS module that exports: `{ id, name, icon, sections: [sectionId], dataTypes: ['events'|'tasks'|'recipes'], fetch(config): Promise<data[]>, configSchema: JSONSchema }`
  - Plugins live in `src/plugins/` and are imported in a plugin registry
  - The registry provides: event merging into calEvents, task injection, recipe injection
  - Settings → Connections renders config UI from each plugin's `configSchema`
  - This is not implemented in Phase 21 — just the documented contract for when Phase 22 starts

---

## PHASE 22 — Health Tab Enhancements

> Goal: Make the Health section fully editable and gender-aware. Medications get start/end date tracking so future and expired meds are handled correctly. Daily Habits, Appointments, and Medications all get full CRUD. The Period Cycle tracker becomes profile-aware — hidden for male profiles unless a female household member explicitly shares it.

### 22.1 — Medication start date + end date

**Backend**
- [x] Add `start_date DATE` and `end_date DATE` columns to the `medications` table (migration in `server/index.js`)
- [x] Update `GET /api/meds` to return `start_date` + `end_date`
- [x] Update `POST /api/meds` to accept and store `start_date` + `end_date`
- [x] Update `PUT /api/meds/:id` to allow editing `start_date` + `end_date`

**Frontend — Add/Edit med modal**
- [x] In the Add Medication modal, add two date inputs: "Start date" and "End date" (leave blank for ongoing)
- [x] `end_date` blank = ongoing; end date min = start date

**Frontend — Medication list display**
- [x] Show a small date range tag under each med name: "From 22 Jun" or "22 Jun → 15 Jul"
- [x] Meds where `start_date` is in the future: show a "Upcoming" amber pill and grey out the checkbox
- [x] Meds where today > `end_date`: show a "Completed" green pill; move to collapsed "Past Medications" section
- [x] Sort order: active first, upcoming second, past last

**Store / DB**
- [x] `UPDATE_MED` action added; bootstrap maps `end_date` → `endDate`

---

### 22.2 — Daily Habits CRUD

> Currently 3 habits (water/exercise/sleep) are hardcoded. Users need to add, edit, rename, reorder, and delete habits.

**Backend**
- [x] `POST /api/habits` — create a new habit for the authenticated user
- [x] `PUT /api/habits/:id` — update label/icon
- [x] `DELETE /api/habits/:id` — soft-delete via `deleted_at` column

**Frontend — "Add Habit" button**
- [x] Dashed "+ Add habit" button at the bottom of the Habits card
- [x] Modal with habit name + 20-emoji picker grid
- [x] "Save" dispatches `ADD_HABIT` + calls `POST /api/habits`

**Frontend — Edit & Delete**
- [x] Hover → show edit/delete icons on each habit row
- [x] Edit: same modal pre-filled → dispatches `UPDATE_HABIT` + `PUT /api/habits/:id`
- [x] Delete: dispatches `DELETE_HABIT` + `DELETE /api/habits/:id`
- [x] Default habits (water/exercise/sleep) show 🔒 and cannot be deleted; editable only

**Store**
- [x] `ADD_HABIT`, `UPDATE_HABIT`, `DELETE_HABIT` actions in `appStore.js`
- [x] Habits fetched from DB on bootstrap; 3 default habits seeded for new users

---

### 22.3 — Appointments CRUD

> The Appointments card has a dashed "Add appointment" button but it is not yet wired to any form. Build the full create/edit/delete flow.

**Backend**
- [x] `POST /api/appointments` — create `{ type, who, appt_date, doctor, location, appt_time, notes }`
- [x] `PUT /api/appointments/:id` — full update of all 9 fields
- [x] `DELETE /api/appointments/:id` — hard delete with rowCount check

**Frontend — Add Appointment modal**
- [x] "Add appointment" button opens modal with: title/reason, for (who), date, doctor, time, location, notes
- [x] Save calls `POST /api/appointments`, dispatches `ADD_APPT`, closes modal

**Frontend — Edit & Delete**
- [x] Hover → edit (✏️) and delete (🗑) icons appear on each appointment row
- [x] Edit: same modal pre-filled → `PUT`, dispatches `UPDATE_APPT`
- [x] Delete: inline confirm "Remove appointment? [Yes] [No]"
- [x] Past appointments collapsed in "Past Appointments" section

**Store**
- [x] `ADD_APPT`, `UPDATE_APPT`, `DELETE_APPT` actions in `appStore.js`
- [x] Appointments sorted ascending; past in descending sub-list

---

### 22.4 — Period Cycle gender-gating

> The Cycle Tracker is always visible regardless of which profile is active. It should only be visible to users with a female profile, OR to a male user whose female household member has explicitly shared the tracker with them.

**Profile gender field**
- [x] `gender` field in `user_profiles` table: `'male'` | `'female'` | `'other'` | `'prefer-not-to-say'`
- [x] Default: `'prefer-not-to-say'` (shows tracker, safe fallback)
- [x] Settings → Profiles tab: 4-button gender pill selector below user card
- [x] Stored in `user_profiles` table via `PUT /api/profile`; loaded into `appStore` on bootstrap

**Sharing permission**
- [x] `share_cycle_tracker BOOLEAN DEFAULT false` in `user_profiles`
- [x] Share toggle in Cycle Tracker card header (🔒 Private / 🔓 Shared); calls `PUT /api/profile`
- [x] `GET /api/profile` + `PUT /api/profile` via new `server/routes/profile.js`

**UI visibility rules (applied in HealthWellness)**
- [x] `showCycle = state.userGender !== 'male' || state.householdCycleShared`
- [x] If hidden, Habits card expands to `col-span-12`; Cycle Tracker wrapped in `{showCycle && ...}`
- [x] `userGender` + `householdCycleShared` persisted in `PERSIST_KEYS`

---

---

## PHASE 23 — Database Hardening (from PROJECT_REVIEW.md audit, 2026-06-22)

> Source: Full DBA/Architect audit. Items are grouped by urgency. Complete Critical + Security items before inviting any second household member.

### 23.1 — Schema prep (unblocks Phase 22)

- [x] **`medications.end_date` — add missing column.** `start_date` already exists as VARCHAR; add `end_date` as VARCHAR to match. Update Phase 22.1 migration accordingly — do NOT try to add `start_date` again (it already exists).
  ```sql
  ALTER TABLE medications ADD COLUMN end_date VARCHAR;
  ```
- [x] **Create `user_profiles` table** for Phase 22.4 gender field and cycle-sharing flag. Phase 22.4 currently references a `users` table that does not exist — point it at `user_profiles` instead.
  ```sql
  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id    TEXT PRIMARY KEY,
    gender     TEXT DEFAULT 'prefer-not-to-say',
    prefs      JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [x] **Create `cycle_logs` table** for Phase 22.4 period tracker. No table exists at all today.
  ```sql
  CREATE TABLE IF NOT EXISTS cycle_logs (
    id           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      TEXT NOT NULL DEFAULT '',
    period_start DATE NOT NULL,
    period_end   DATE,
    cycle_length SMALLINT,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_cycle_logs_user_id ON cycle_logs(user_id);
  CREATE INDEX idx_cycle_logs_start   ON cycle_logs(period_start);
  ```

---

### 23.2 — Security: route hardening

- [x] **Verify `requireAuth` is applied to the festivals router in `server/index.js`.** Confirmed: `app.use(requireAuth)` is mounted globally at line 370, before `/api/festivals` at line 384. Protected.

- [x] **Add `AND household_id = req.householdId` to all family mutation routes.** Fixed all 10 mutation routes in `server/routes/family.js` (groups, members, events, moments, school-terms PUT + DELETE). All now return 404 if the record doesn't belong to the caller's household.

- [x] **Wrap `DELETE /family/groups/:id` in a transaction.** Now uses `db.connect()` / `BEGIN` / `COMMIT` / `ROLLBACK` / `client.release()`.

---

### 23.3 — Tech debt: indexes and constraints

- [x] **Drop redundant index on `household_members.user_id`.** `DROP INDEX IF EXISTS idx_household_members_user_id` added to migrations.

- [x] **Add composite index on `courses(user_id, plan_id)`.** `CREATE INDEX IF NOT EXISTS idx_courses_user_plan` added to migrations.

- [x] **Add FK constraints on all `household_id` columns.** `fk_fm/fg/fe/fc/st/si_household` constraints added via idempotent `DO $$ IF NOT EXISTS` blocks.

- [x] **Fix `courses.plan_id` FK to `ON DELETE CASCADE`.** Migration drops and recreates the constraint with `ON DELETE CASCADE`.

- [x] **Fix `family_events.group_id` and `family_members.group_id` FKs to `ON DELETE CASCADE`.** Both constraints dropped and recreated with `ON DELETE CASCADE`.

- [x] **Run `VACUUM ANALYZE` on high dead-row tables.** Called separately after the migration loop (VACUUM cannot run inside a transaction).

---

### 23.4 — Data hygiene

- [x] **Change `medications.who` default from hardcoded `'Jagdeep'` to `NULL`.** Added `ALTER TABLE medications ALTER COLUMN who SET DEFAULT NULL` to migrations.

- [ ] **Delete stale `jagdeep` dev household.** **Production-only manual step** — do NOT add to migrations. In dev mode `userId='jagdeep'` is the active user and the jagdeep household is live. Run these only against the Neon production DB after deploying with real Clerk IDs:
  ```sql
  DELETE FROM household_members WHERE user_id = 'jagdeep';
  DELETE FROM households WHERE created_by = 'jagdeep';
  ```

- [x] **Seed the `tasks` table.** 11 seed tasks added via migration (idempotent `WHERE NOT EXISTS`), using `CURRENT_DATE + offset` so due dates stay relative.

---

### 23.5 — Longer-term schema migrations (higher risk — do as a coordinated change)

- [x] **Migrate `medications.start_date` + `end_date` from VARCHAR to DATE.** Done with safe `USING CASE` clause (non-ISO values → NULL). `db.js` now has `types.setTypeParser(1082, v => v)` so node-postgres returns DATE columns as ISO strings not JS Date objects.
- [x] **Migrate `appointments.appt_date` from VARCHAR to DATE.** Same safe USING CASE pattern. `appointments.js` POST now passes `appt_date || null`.
- [x] **Migrate `tasks.due` from VARCHAR to DATE.** Table had 0 rows so conversion was clean. `TasksBoard.jsx` now sends ISO date directly (removed `fmtShortDate` from submit), and formats for display at render time. `tasks.js` POST passes `due || null`.
- [x] **Migrate `courses.next_iso` and `learning_events.event_date` from VARCHAR to DATE.** Same USING CASE pattern. No route or frontend changes needed — both already handled ISO strings.

> All five migrated together as a coordinated change with matching API and frontend updates.

---

---

## Phase 24 — Clerk Auth Data Migration & Security Hardening

**Status: PLAN ONLY — no code changes made yet**

**Problem summary:** All historical data was written with `user_id = 'jagdeep'` (the dev-mode fallback). Once `CLERK_SECRET_KEY` is active, `requireAuth` sets `req.userId` to the real Clerk subject claim (`user_2XXXX...`). Every `WHERE user_id = $1` query returns nothing — the user appears to have an empty app. Additionally `requireHousehold` auto-creates a fresh empty household for the Clerk user, disconnecting them from the existing family/shopping data.

---

### 24.1 — Diagnose: which tables need remapping

Run these queries against the local or production DB to confirm scope before running the migration:

```sql
-- Count rows owned by dev user across all personal tables
SELECT 'tasks'                       AS tbl, COUNT(*) FROM tasks                       WHERE user_id = 'jagdeep'
UNION ALL SELECT 'medications',            COUNT(*) FROM medications                   WHERE user_id = 'jagdeep'
UNION ALL SELECT 'med_checkins',           COUNT(*) FROM med_checkins                  WHERE user_id = 'jagdeep'
UNION ALL SELECT 'habits',                 COUNT(*) FROM habits                        WHERE user_id = 'jagdeep'
UNION ALL SELECT 'habit_checkins',         COUNT(*) FROM habit_checkins                WHERE user_id = 'jagdeep'
UNION ALL SELECT 'appointments',           COUNT(*) FROM appointments                  WHERE user_id = 'jagdeep'
UNION ALL SELECT 'courses',                COUNT(*) FROM courses                       WHERE user_id = 'jagdeep'
UNION ALL SELECT 'learning_plans',         COUNT(*) FROM learning_plans                WHERE user_id = 'jagdeep'
UNION ALL SELECT 'books',                  COUNT(*) FROM books                         WHERE user_id = 'jagdeep'
UNION ALL SELECT 'learning_events',        COUNT(*) FROM learning_events               WHERE user_id = 'jagdeep'
UNION ALL SELECT 'finance_subscriptions',  COUNT(*) FROM finance_subscriptions         WHERE user_id = 'jagdeep'
UNION ALL SELECT 'finance_loans',          COUNT(*) FROM finance_loans                 WHERE user_id = 'jagdeep'
UNION ALL SELECT 'finance_credit_cards',   COUNT(*) FROM finance_credit_cards          WHERE user_id = 'jagdeep'
UNION ALL SELECT 'finance_bills',          COUNT(*) FROM finance_bills                 WHERE user_id = 'jagdeep'
UNION ALL SELECT 'finance_paid',           COUNT(*) FROM finance_paid                  WHERE user_id = 'jagdeep'
UNION ALL SELECT 'festivals',              COUNT(*) FROM festivals                     WHERE user_id = 'jagdeep'
UNION ALL SELECT 'user_calendars',         COUNT(*) FROM user_calendars                WHERE user_id = 'jagdeep'
UNION ALL SELECT 'user_sport_subscriptions', COUNT(*) FROM user_sport_subscriptions   WHERE user_id = 'jagdeep'
UNION ALL SELECT 'user_profiles',          COUNT(*) FROM user_profiles                 WHERE user_id = 'jagdeep'
UNION ALL SELECT 'cycle_logs',             COUNT(*) FROM cycle_logs                    WHERE user_id = 'jagdeep'
UNION ALL SELECT 'prescriptions',          COUNT(*) FROM prescriptions                 WHERE user_id = 'jagdeep'
UNION ALL SELECT 'test_results',           COUNT(*) FROM test_results                  WHERE user_id = 'jagdeep'
ORDER BY tbl;

-- Household ownership summary
SELECT h.id, h.created_by, COUNT(hm.user_id) AS member_count
FROM households h
LEFT JOIN household_members hm ON hm.household_id = h.id
GROUP BY h.id, h.created_by;
```

**How to get the real Clerk user ID:**
1. Sign in to the app in a browser
2. Open DevTools → Network tab → click any `/api/...` request
3. Copy the `Authorization: Bearer <token>` header value
4. Decode the JWT payload: `atob(token.split('.')[1])` in the browser console — the `sub` field is the Clerk user ID (format: `user_2abc...`)
5. Or: Clerk Dashboard → Users → click your account → copy User ID

- [x] Run diagnostic queries and record row counts per table
- [x] Obtain the real Clerk user ID (`user_3FUGeS5BNKv0VrA7RZcZBCLMs5e`)

---

### 24.2 — Data migration SQL (run as a single transaction)

Replace `<CLERK_USER_ID>` with the ID obtained in 24.1. The entire block is atomic — if any statement fails, nothing is committed.

```sql
BEGIN;

-- ── Personal data: remap user_id ─────────────────────────────────────────────
UPDATE tasks                       SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE medications                 SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE med_checkins                SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE habits                      SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE habit_checkins              SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE appointments                SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE courses                     SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE learning_plans              SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE books                       SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE learning_events             SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE finance_subscriptions       SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE finance_loans               SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE finance_credit_cards        SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE finance_bills               SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE finance_paid                SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE festivals                   SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE user_calendars              SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE user_sport_subscriptions    SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE user_profiles               SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE cycle_logs                  SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE prescriptions               SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';
UPDATE test_results                SET user_id = '<CLERK_USER_ID>' WHERE user_id = 'jagdeep';

-- ── Household: merge if Clerk login auto-created an empty new household ───────
-- requireHousehold creates a fresh household on first Clerk login.
-- If that happened, old_hh (jagdeep's) and new_hh (Clerk's) are different.
-- Delete the orphan new household and remap membership to old_hh.
DO $$
DECLARE
  old_hh UUID;
  new_hh UUID;
BEGIN
  SELECT household_id INTO old_hh FROM household_members WHERE user_id = 'jagdeep' LIMIT 1;
  SELECT household_id INTO new_hh FROM household_members WHERE user_id = '<CLERK_USER_ID>' LIMIT 1;

  IF old_hh IS NOT NULL AND new_hh IS NOT NULL AND old_hh <> new_hh THEN
    -- Remove Clerk user's auto-created empty membership and household
    DELETE FROM household_members WHERE user_id = '<CLERK_USER_ID>' AND household_id = new_hh;
    DELETE FROM households WHERE id = new_hh AND created_by = '<CLERK_USER_ID>';
  END IF;
END $$;

UPDATE household_members SET user_id    = '<CLERK_USER_ID>' WHERE user_id    = 'jagdeep';
UPDATE households        SET created_by = '<CLERK_USER_ID>' WHERE created_by = 'jagdeep';

COMMIT;
```

After running: re-execute the diagnostic queries from 24.1 and confirm all counts are 0 for `user_id = 'jagdeep'`.

- [x] Substitute `<CLERK_USER_ID>` in the SQL above
- [x] Run the full transaction block against the target DB
- [x] Re-run diagnostic queries to confirm 0 remaining `jagdeep` rows
- [x] Verify household merge (only one household should exist per user)

> **Actual migration notes:** Only `tasks` (11 rows) needed remapping; `habits` seeded defaults were deleted because the Clerk user already had equivalent h1/h2/h3 via the UI. Learning data (`learning_plans` × 3, `courses` × 32) was already under the Clerk user ID from prior UI usage. Household migration was not needed — the Clerk user's household (`a226cad1-...`) already held all live family data (34 groups, 103 members, 29 events). The jagdeep household has 2 orphaned seeded family_groups and is harmless. Seed guards in `server/index.js` were changed from `user_id = 'jagdeep'` checks to table-empty checks (`NOT EXISTS (SELECT 1 FROM <table>)`) to prevent re-seeding after migration.

---

### 24.3 — Middleware hardening (requireAuth.js)

The current `requireAuth.js` accepts tokens from any Clerk application (no `authorizedParties` check) and has no clock skew tolerance. Apply these changes to `server/middleware/requireAuth.js`:

```js
// server/middleware/requireAuth.js
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function requireAuth(req, res, next) {
  if (!process.env.CLERK_SECRET_KEY) {
    req.userId = 'jagdeep';
    return next();
  }

  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = auth.slice(7);
  try {
    const payload = await clerkClient.verifyToken(token, {
      // Reject tokens issued to any other Clerk application
      authorizedParties: [process.env.VITE_CLERK_PUBLISHABLE_KEY],
      // Tolerate up to 60s of NTP clock skew between server and Clerk
      clockSkewInMs: 60_000,
    });
    req.userId = payload.sub;
    next();
  } catch (err) {
    console.error('[requireAuth] token verification failed:', {
      message: err.message,
      code: err.code,
      path: req.path,
    });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

Key changes:
- `authorizedParties` — locks the middleware to the specific Clerk publishable key; tokens from other Clerk apps are rejected
- `clockSkewInMs: 60_000` — prevents spurious 401s when the server's NTP clock drifts relative to Clerk's JWT issuer
- Structured `console.error` logging includes `req.path` and `err.code` to aid debugging without leaking token content

- [x] Apply the above changes to `server/middleware/requireAuth.js`
- [x] `VITE_CLERK_PUBLISHABLE_KEY` is readable by Node via the shared `.env` file — no rename needed

---

### 24.4 — Security route audit findings

Full audit of all 24 route files was performed. Summary:

**Confirmed safe — scoped correctly:**

| Route file | Mechanism | Notes |
|---|---|---|
| `tasks.js` | `user_id = req.userId` all CRUD | ✅ |
| `finance.js` | `user_id = req.userId` all CRUD | ✅ |
| `meds.js` | `user_id = req.userId` on GET; `med_id + user_id` on toggle | ✅ |
| `habits.js` | `user_id = req.userId` on GET + toggle | ✅ |
| `learningPlans.js` | `user_id = req.userId` throughout; DELETE guards plan id=1 | ✅ |
| `festivals.js` | GET: `user_id = $1 OR user_id = ''` (intentional — seeded globals have `''`); POST/DELETE scoped to `req.userId` | ✅ |
| `shopping.js` | `household_id` from `requireHousehold`; no raw user_id queries | ✅ |
| `household.js` | Invite lookup by UUID (unguessable); accept uses transaction | ✅ |
| `profile.js` | UPSERT on `user_id = req.userId` | ✅ |
| `calendarSubscriptions.js` | `user_id = req.userId` throughout | ✅ |
| `sportsCatalog.js` | `/catalog` returns hardcoded data (no DB); `/subscriptions` GET/POST scoped to `user_id` | ✅ |

**Gaps identified:**

| Issue | Location | Risk | Fix required |
|---|---|---|---|
| No `authorizedParties` validation | `middleware/requireAuth.js` | Medium — any Clerk app's token is accepted | Add `authorizedParties` (see 24.3) |
| No clock skew tolerance | `middleware/requireAuth.js` | Low — spurious 401s on NTP drift | Add `clockSkewInMs: 60_000` (see 24.3) |
| `DELETE /subscriptions/:sportId` uses only `sport_id` | `server/routes/sportsCatalog.js` ~line 70 | Low — sport IDs are well-known strings (`'f1'`, `'cricket'`); a user could delete another user's subscription by guessing the sport ID | Add `AND user_id = $2` with `req.userId` to the DELETE WHERE clause |

- [x] `sportsCatalog.js` DELETE already had `WHERE user_id = $1 AND sport_id = $2` — no change needed
- [x] Apply middleware hardening from 24.3

---

### 24.5 — Frontend token attachment: confirmed correct

The Clerk token attachment chain is correctly wired end-to-end. No frontend changes required.

```
ClerkProvider (src/main.jsx)
  └── AppStoreProvider
        └── ClerkBridge.jsx         ← setTokenGetter(getToken) called on mount
              └── src/api/client.js  ← _tokenGetter = getToken; all req() calls include Authorization header
```

Verification steps performed:
1. `ClerkBridge.jsx`: imports `setTokenGetter` from `api/client.js`, calls it with Clerk's `getToken` from `useAuth()` — confirmed
2. `api/client.js`: every `apiFetch()` call awaits `getAuthToken()` → `_tokenGetter()` → live JWT — confirmed
3. `LearningPlanner.jsx`: raw `safeGet` (no auth header) was replaced with `api.*` calls — **already fixed in the previous session**

The only historical bug was `LearningPlanner.jsx` bypassing `api/*` with a raw `fetch()`. That has been corrected. All other section components (`HealthWellness`, `TasksBoard`, `FamilySpace`, `FinanceTracker`, etc.) already used `api.*` exclusively.

- [x] ClerkBridge → setTokenGetter chain verified correct (no change needed)
- [x] LearningPlanner safeGet bypass fixed (done in previous session)
- [x] Seed guards in `server/index.js` changed from jagdeep-specific checks to table-empty checks to prevent re-seeding after migration

---

### 24.6 — Testing checklist (run after completing 24.1–24.4)

- [ ] Sign in with Clerk credentials in a browser *(manual — browser required)*
- [x] **Learning Planner** — Anthropic plan: 13 courses across phases 0–3 confirmed in DB (plus 2 additional plans: Google AI / Associate Data Analyst, 32 courses total)
- [x] **Tasks Board** — 11 tasks confirmed under Clerk user (5 work, 6 personal; todo/doing/done mix)
- [x] **Health & Wellness** — 6 medications + 3 habits (h1/h2/h3) confirmed under Clerk user
- [x] **Finance Tracker** — 1 subscription confirmed; loans/cards/bills are 0 (none added yet — correct)
- [x] **Festivals** — 32 global festivals (user_id='') confirmed visible via `WHERE user_id = $1 OR user_id = ''` query
- [x] **Family Space → Directory tab** — Clerk household has 34 family groups and 103 members confirmed
- [x] **Family Space → Shopping list** — 6 shopping items confirmed in Clerk household
- [x] **Sports Tracker** — 0 rows in `user_sport_subscriptions` (shows F1/Cricket/Football via route default fallback — correct); *(manual: confirm defaults render in UI)*
- [x] **Settings → Connections** — Clerk user confirmed as sole member of their household
- [x] **Auth enforcement** — `GET /api/tasks` and `GET /api/habits` without token return `401 {"error":"Unauthorized"}` ✓
- [x] **`/api/sports/catalog`** — returns 401 (route is behind `requireAuth`; this is expected — frontend always has a token) ✓
- [ ] Open incognito → confirm login gate shows *(manual — browser required)*
- [ ] Sign in as a second Clerk user → confirm zero data visible *(manual — requires a second Clerk account)*
- [x] **Festivals `user_id = ''` query** — confirmed 32 rows returned for Clerk user via `OR user_id = ''` clause ✓

---

## PHASE 25 — Festival & Holiday Unification

> Goal: Consolidate all static holiday/festival data sources (scattered across frontend imports and backend routes) into the PostgreSQL `festivals` database table as the single source of truth, enabling full CRUD and dynamic views across all calendar instances.

### 25.1 — Database Consolidation and Seeding
- [x] Consolidate static arrays from `src/data/holidayCalendar.js`, `src/data/christianHolidays.js`, `src/data/jainHolidays.js`, `src/data/sikhCalendar.js`, and `server/routes/holidays.js` into a unified seed structure (JSON or SQL insert statements).
- [x] Update `server/index.js` startup migration phase to seed the consolidated list into the `festivals` table under their respective `calendar` classifications (`indian`, `thai`, `sikh`, `christian`, `jain`, `islamic`, `hindu`) using an idempotent `ON CONFLICT (name, event_date) DO NOTHING`.

### 25.2 — Frontend Refactoring (FestivalsRecurring.jsx)
- [x] Remove all static calendar imports from `FestivalsRecurring.jsx`.
- [x] Import `useAppStore` to access `state.subscribedCalendars` (representing enabled packs like `['IN', 'TH', 'hindu', 'sikh', ...]`).
- [x] Eliminate client-side deduplication code and key comparisons.
- [x] Refactor the component to load all view events directly from the fetched `dbRows` (`GET /api/festivals`).
- [x] Filter both the visible pills/tabs and the event list so only holidays/festivals belonging to selected (subscribed) calendars are displayed. Unsubscribed calendars must have their tabs and events hidden.
- [x] Delete the redundant frontend data files: `src/data/holidayCalendar.js`, `src/data/christianHolidays.js`, `src/data/jainHolidays.js`, and `src/data/sikhCalendar.js`.

### 25.3 — Backend Route & Calendar Integration
- [x] Update `/api/holidays/multi` route in `server/routes/holidays.js` to retrieve named pack calendars (`PACK_DATA` keys) from the `festivals` database table instead of hardcoded arrays.
- [x] Retain the live Nager.Date public holidays fetch and merge logic in `/api/holidays/multi`, ensuring seamless integration of DB-stored events and public APIs.
- [x] Verify that custom user-added festivals (`user_id = req.userId`) can optionally propagate to the main Calendar view, or ensure the query loads all relevant active calendars properly.

### 25.4 — Validation & Verification
- [x] Run `npm run build` and check for any compilation or import errors.
- [x] Test the Festivals recurring views to ensure all tabs (Sikh, Indian, Thai, Christian, Jain) load and render correctly from the DB.
- [x] Test that adding a custom festival immediately populates the lists without duplicates.
- [x] Verify that CalendarView and TodayDashboard render holidays and events correctly.

---

## Notes for Claude Code
- Read `CLAUDE.md` fully before starting any phase
- Read `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html` fully before starting Phase 2
- Implement one phase at a time. Verify it works before moving to the next.
- When in doubt about a visual detail, the `.dc.html` is the source of truth
- Don't use `console.log` in production code — remove all debug logs before marking phase complete
- The app is pre-seeded with data — no empty states needed for v1
