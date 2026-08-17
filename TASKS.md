# Orbitly — TASKS.md
> Implementation task list. Work top-to-bottom. Check off as you go.
> Reference: `CLAUDE.md` for all design tokens, data, and structure.
> Design source: `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html`

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

## PHASE 23 — Database Hardening (from PROJECT_REVIEW.md audit, 2026-06-22)

> Source: Full DBA/Architect audit. Items are grouped by urgency. Complete Critical + Security items before inviting any second household member.

### 23.4 — Data hygiene

- [x] **Change `medications.who` default from hardcoded `'Jagdeep'` to `NULL`.** Added `ALTER TABLE medications ALTER COLUMN who SET DEFAULT NULL` to migrations.

- [ ] **Delete stale `jagdeep` dev household.** **Production-only manual step** — do NOT add to migrations. In dev mode `userId='jagdeep'` is the active user and the jagdeep household is live. Run these only against the Neon production DB after deploying with real Clerk IDs:
  ```sql
  DELETE FROM household_members WHERE user_id = 'jagdeep';
  DELETE FROM households WHERE created_by = 'jagdeep';
  ```

- [x] **Seed the `tasks` table.** 11 seed tasks added via migration (idempotent `WHERE NOT EXISTS`), using `CURRENT_DATE + offset` so due dates stay relative.

---

## Phase 24 — Clerk Auth Data Migration & Security Hardening

**Status: PLAN ONLY — no code changes made yet**

**Problem summary:** All historical data was written with `user_id = 'jagdeep'` (the dev-mode fallback). Once `CLERK_SECRET_KEY` is active, `requireAuth` sets `req.userId` to the real Clerk subject claim (`user_2XXXX...`). Every `WHERE user_id = $1` query returns nothing — the user appears to have an empty app. Additionally `requireHousehold` auto-creates a fresh empty household for the Clerk user, disconnecting them from the existing family/shopping data.

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

## PHASE 27 — Today Dashboard: Remove Hardcoded / Stale Data

> Goal: The Today dashboard (`src/components/sections/TodayDashboard.jsx`) was flagged as "looks hardcoded." Investigation confirmed four real, stale/static pieces that don't reflect live state — none of these are just a visual impression. Fix each so the dashboard reflects actual subscribed/live data, matching what the rest of the app (Phase 20 sports subscriptions, Phase 25/26 festivals DB) already does correctly.

### 27.1 — Sports Ticker: wire to live/subscribed sports data
- [x] `TodayDashboard.jsx` no longer imports `F1_CALENDAR`, `CRICKET_MATCHES`, `FOOTBALL_FIXTURES` as the primary data source — now uses `useLiveF1`/`useLiveCricket`/`useLiveFootball` (same hooks as `SportsTracker.jsx`), falling back to seed arrays only when live data is unavailable
- [x] Ticker only renders cards for sports in `state.sportSubscriptions` (matches `SportsTracker.jsx`'s subscription-driven rendering); shows an empty state with a link to Sports Tracker when nothing is subscribed
- [x] Replaced the Sports Ticker's data source with the same subscribed/live data `SportsTracker.jsx` fetches
- [x] Added a "◌ Seed data" badge on any ticker card not backed by live data, matching `SportsTracker.jsx`'s `DataSourceBadge` — no more silently frozen fake scores (e.g. the hardcoded cricket "LIVE" status)

### 27.2 — "Upcoming 48h" card runs on fake recurring data
- [x] `TodayDashboard.jsx` no longer imports `CAL_EVENTS` — dropped in favor of only DB-backed events, per the option outlined below
- [x] `upcoming` is now built from three live sources within the real next 48 hours: festivals (`GET /api/festivals`, respecting subscribed calendars), enabled ICS feed events, and work/personal tasks with a real ISO due date
- [x] Decision: dropped `CAL_EVENTS` entirely for the Today dashboard rather than converting it to dated entries or scoping it as an expiring demo — it was pre-Phase-20/25 leftover once real DB-backed sources existed
- [x] `CalendarView.jsx` no longer imports the static file (was aliased `JUNE_EVENTS`) — month view now merges only birthdays/anniversaries, live holidays, live cricket, and imported ICS events; week view's birthday/holiday/cricket lookups now use the real current year/month (derived from `APP_TODAY`) instead of a hardcoded June 2026, matching `buildWeekCells`'s already-dynamic "current week" logic. `src/data/calEvents.js` had no remaining consumers and was deleted.

### 27.3 — Glance stat pills are literal hardcoded strings
- [x] "learning session" pill now computed from `activeCourse` + weekday check (`hasLearningSessionToday`), not a fixed `'1'`
- [x] "events soon" pill now uses `upcoming.length` (from the fixed 27.2 data), not a fixed `'2'`

### 27.4 — Rakhi countdown card: remove hardcoded duplicate
- [x] Removed the unconditional hardcoded Rakhi card (fixed "Raksha Bandhan" / "Friday, 28 August 2026") and the now-unused `RAKHI_DAYS` constant
- [x] Dashboard now relies solely on the dynamic "Pinned Festival Alerts" card, which already reads the real festival date from the DB + `state.pinnedFestivals`

---

## PHASE 37 — Codebase Review Findings (2026-08-17)

> Source: three-pronged review (security, code quality/architecture, deployment readiness) of the full app. Items grouped by category, ordered by priority within each.

### 37.1 — Bugs (fix these)
- [x] **Auth fails open when `CLERK_SECRET_KEY` is unset.** `server/middleware/requireAuth.js` silently granted every request admin access as `userId='jagdeep'` instead of failing closed. Now throws at startup if `NODE_ENV=production` and the key is missing.
- [x] **Silent billing errors.** `server/routes/billing.js` — all three Stripe handlers (`/status`, `/create-checkout`, `/webhook`) discarded caught errors entirely; Sentry was installed but `Sentry.captureException` was never called anywhere in the codebase. Now logs + reports to Sentry. Also wrapped the webhook's `checkout.session.completed` DB write in try/catch — it previously had none, and with no global Express error handler in `server/index.js`, a DB failure there would have crashed the whole process, not just the request.
- [x] **Silent `catch(e)` blocks across `server/routes/*.js`.** Turned out to be 117 sites across 22 files (not ~11 as first estimated) — every catch that responded to the client with a 500 and logged nothing now does `console.error` + `Sentry.captureException`. Fallback-chain catches that already logged (Ollama→Gemini→curl retries in `courses.js`/`extract.js`) were left untouched on purpose.
- [x] **`/api/health` always returns 200.** Now runs `SELECT 1` against Postgres and returns `503 {ok:false, db:'down'}` if it fails, instead of an unconditional 200.
- [x] **`.env.example` was stale/incomplete.** Rewritten to include every var actually read via `process.env`/`import.meta.env`: `CLERK_SECRET_KEY`/`VITE_CLERK_PUBLISHABLE_KEY`, `NODE_ENV`, `APP_URL`, `ALLOWED_ORIGIN`, `SENTRY_DSN`/`VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`/`VITE_POSTHOG_HOST`, `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `BALLDONTLIE_API_KEY`.
- [x] **Dead `child_process` import.** `server/routes/courses.js` — removed unused `exec`/`execAsync` (`execFile`/`execFileAsync`, which the curl fallback actually uses, kept).

### 37.2 — Structural (worth doing before this grows further)
- [ ] **Migration strategy is a footgun.** `server/index.js` `runMigrations()` runs ~184 raw SQL statements (already at "Phase 36") on every server boot, each wrapped in its own `try/catch` that swallows and just logs a truncated warning — no migration-history table, no ordering guarantees, no rollback. A bad `ALTER` can silently no-op forever until something downstream breaks in a confusing way. Replace with a real migration tool (e.g. `node-pg-migrate`) with a tracked history table before this is a multi-environment deployment.
- [ ] **`server/schema.sql` appears stale/unused.** It's not applied anywhere in the actual startup path (`runMigrations()` is the real source of truth) — either wire it in or delete it so it stops misleading as documentation.

### 37.3 — Code quality / maintainability
- [ ] **`appStore.js` `PERSIST_KEYS` duplication.** The list of ~28 persisted state keys is hand-duplicated between `PERSIST_KEYS` (localStorage read/write) and the `useEffect` dependency array (triggers the save) — miss updating one when adding a field and it silently doesn't persist. (Already bit the Phase-37-adjacent dashboard-layout work — see commit `b88c5fa`.) Derive one from the other.
- [ ] **CLAUDE.md's "Tailwind CSS utility classes only — no custom CSS" rule doesn't match reality.** The entire app uses inline `style={{}}` (149–349+ occurrences per section file), and there's no `tailwind.config.js` at all. Either update CLAUDE.md to reflect the actual convention, or treat this as a real (large) refactor backlog item.
- [ ] **Largest monolith components** — break up if/when touched next: `LearningPlanner.jsx` (2,634 lines), `FoodPlanner.jsx` (1,508), `HealthWellness.jsx` (1,495), `SettingsProfiles.jsx` (1,190).
- [ ] **Test coverage is effectively just date-math** (1 file, 19 tests, all on pure `dateUtils` functions). Zero coverage of the 88-case `appStore.js` reducer or any of the 26 route files. Add coverage for the reducer and the money/auth-handling routes (billing, requireAuth) first.

---

## Notes for Claude Code
- Read `CLAUDE.md` fully before starting any phase
- Read `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html` fully before starting Phase 2
- Implement one phase at a time. Verify it works before moving to the next.
- When in doubt about a visual detail, the `.dc.html` is the source of truth
- Don't use `console.log` in production code — remove all debug logs before marking phase complete
- The app is pre-seeded with data — no empty states needed for v1
