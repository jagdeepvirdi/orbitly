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

- [ ] **Delete stale `jagdeep` dev household.** **Production-only manual step** — do NOT add to migrations. In dev mode `userId='jagdeep'` is the active user and the jagdeep household is live. Run these only against the production DB (Railway Postgres) after deploying with real Clerk IDs:
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

- [x] Sign in with Clerk credentials in a browser *(manual — confirmed by Jagdeep 2026-10-07)*
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
- [x] **Migration strategy was a footgun.** `runMigrations()` ran ~184 raw SQL statements on every server boot, each swallowed on failure with a truncated `console.warn` — no history table, no once-only guarantee (several statements, e.g. an old `courses.id` width ALTER superseded by a later one, were re-attempting and re-failing on *every single boot*). Hardened in place (no new dependency): added a `schema_migrations` table that tracks each statement by a content hash, so it runs exactly once ever; genuine failures now `console.error` + `Sentry.captureException` and retry next boot instead of vanishing into an 80-char-truncated warning. The existing dev database was baselined (marked as already-applied without re-running, since it's already converged) — confirmed via `docker exec` against the live DB (203 statements recorded, existing data untouched) and a clean server restart with zero migration-error spam in the boot log (previously: 7 repeating errors every boot).
- [x] **`server/schema.sql` was a bigger problem than "stale/unused."** Correction to the original finding: it wasn't dead — `docker-compose.yml` fed it to Postgres's own `docker-entrypoint-initdb.d` hook, so it silently bootstrapped local dev's base tables (`tasks`, `medications`, etc.), invisibly to the app itself. But `runMigrations()` only ever `ALTER`s those tables, never `CREATE`s them — so a real cloud deploy (Neon/Render, no Docker init hook) would fail on the very first `ALTER TABLE medications ...` against an empty database. Fixed by folding schema.sql's base-table definitions into `runMigrations()` itself as tracked `CREATE TABLE IF NOT EXISTS` statements, making the app fully self-bootstrapping. Verified end-to-end against a real throwaway empty database (`orbitly_fresh_test`): booted clean, created all 38 tables, seeded festivals, `courses.plan_id` present — confirming a genuinely fresh production database now works with zero manual SQL. `schema.sql` itself is now removed (deleted, and its docker-compose mount dropped) since it's fully superseded and had drifted stale enough to reference a `courses.plan_id` index before that column was even defined in the same file.
- [x] **`server/seed.sql` was dead, not just partially broken.** Postgres ran it via `docker-entrypoint-initdb.d` before the app's `runMigrations()` had created any tables, so on a fresh volume *every* insert failed (not only the 4 targeting dropped `f1_*`/`cricket_*`/`football_*` tables; the festivals/sikh_events inserts were also obsolete). Removed the `docker-compose.yml` mount. The file (gitignored, no history, real family/finance data) was kept as `server/seed.legacy.sql`, also gitignored, rather than deleted.

### 37.3 — Code quality / maintainability
- [x] **`appStore.js` `PERSIST_KEYS` duplication.** The `useEffect` dependency array now derives from `PERSIST_KEYS.map(k => state[k])` instead of hand-duplicating the ~28 keys — single source of truth, still a fixed-length array so the hook stays valid.
- [x] **CLAUDE.md's "Tailwind CSS utility classes only — no custom CSS" rule doesn't match reality.** Confirmed 1,900+ inline `style={{}}` occurrences across all 14 section files and no `tailwind.config.js`. Updated CLAUDE.md (Tech Stack + Do Not sections) to document the actual convention (Tailwind utilities for layout, inline `style={{}}` for dynamic/CSS-var values) instead of refactoring the app to match the old doc.
- [ ] **Largest monolith components** — break up if/when touched next: `LearningPlanner.jsx` (2,634 lines), `FoodPlanner.jsx` (1,508), `HealthWellness.jsx` (1,495), `SettingsProfiles.jsx` (1,190).
- [x] **Test coverage is effectively just date-math** (1 file, 19 tests, all on pure `dateUtils` functions). Zero coverage of the 88-case `appStore.js` reducer or any of the 26 route files. Added `src/store/appStore.test.js` (60 tests covering every reducer action, including edge cases like `CAL_NAV` year rollover, `ADD_SESSION`/`REMOVE_SESSION` clamping, `ADD_SPORT_SUBSCRIPTION` dedup, and `TICK_TIMER` boundary behavior — `reducer`/`createInitialState` exported for this), `server/routes/billing.test.js` (13 tests: `/status`, `/create-checkout`, `/webhook`, including Stripe-not-configured, bad signature, and DB-failure/Sentry paths), and `server/middleware/requireAuth.test.js` (7 tests: dev fallback, prod fail-closed at import time, missing/invalid/valid token, `authorizedParties` prod-only gating). Route/middleware tests mock `db.js`, `stripe`, `@sentry/node`, and `@clerk/backend` — no real network/DB calls. 99/99 tests pass (`npm test`). Still open: `LearningPlanner.jsx`/`FoodPlanner.jsx`/etc. reducers-within-components and the other 24 route files remain uncovered.

### 37.4 — Mobile navigation
- [x] **Mobile "More" sheet.** `BottomTabBar` now shows 4 fixed tabs (Today/Calendar/Tasks/Health) plus a "More" button that opens a bottom sheet with every other section, a theme toggle and sign-out. Previously the bar only reached 5 of 14 sections on mobile. Nav icons/definitions extracted to `src/data/navConfig.js` (shared by `Sidebar` and `BottomTabBar`). Sheet is a modal dialog: closes on backdrop/Escape/navigation, and is `inert` + hidden while closed. `TopBar` compacts on mobile (icon-only search/AI buttons, smaller accent swatches, truncated labels).
- [x] Verified on a real phone: "More" sheet works *(manual, confirmed by Jagdeep 2026-10-07)*

### 37.5 — Festivals: multi-calendar duplicates
- [x] **22 festivals were silently dropped by the seed.** `festivals.json` has 319 rows, but 22 are the same festival listed under two calendars (`indian`/`hindu` x15, `thai-buddhist`/`thai` x3, `sikh`/`indian` x2, `thai`/`indian` x2). The `UNIQUE (name, event_date)` constraint + `ON CONFLICT DO NOTHING` kept only the first, so a user subscribed to e.g. only `hindu` or `thai-buddhist` (without `IN`/`TH`) never saw Diwali, Dussehra, the three Bucha days, etc. Default subscribers (`IN`,`TH`,`hindu`,`sikh`) were unaffected. Fix: unique key is now `(name, event_date, calendar)` (migration swaps the constraint; seed `ON CONFLICT` updated), and `GET /api/festivals` collapses same name/date rows with `DISTINCT ON`, preferring the user's pinned copy so existing pins still match, then the copy with a description. Verified on a throwaway Postgres: fresh boot and upgrade-from-old-constraint both give 319 rows, a second boot is idempotent, and per-user results are correct (both calendars: 104 raw -> 89 deduped; `hindu`-only now sees Diwali; `thai-buddhist`-only gets all 25; pinned copy is the one returned).

---

## PHASE 38 — Deploy to Railway (mosaiclife.jagdeepsinghvirdi.com)

> Target: one Railway service (Express serves the built frontend + API on one origin) + Railway Postgres + custom domain.

### 38.1 — Code (done)
- [x] `server/db.js` accepts `DATABASE_URL` (hosted Postgres); falls back to `DB_*` vars locally. Optional `DB_SSL=true` for public endpoints that need TLS.
- [x] `server/index.js` serves `dist/` when it exists (hashed `/assets` cached 1y, `index.html` `no-cache`) with an SPA fallback for extensionless non-API GETs, placed *before* `requireAuth` because page loads carry no token. Other non-API misses return a plain 404. In dev (no `dist/`) behaviour is unchanged.
- [x] Listens on `SERVER_PORT || PORT || 3003` (Railway injects `PORT`); `trust proxy` enabled in production so the per-IP rate limiters (`extract`, `courses`) don't share one bucket behind Railway's proxy; `APP_URL` added to the CORS allowlist.
- [x] `npm start`, `engines.node >=20`, `railway.json` (build/start/healthcheck on `/api/health`), `.env.example` updated.
- [x] Verified locally: booted with only `DATABASE_URL` set, `PORT`-only fallback works, `/`, deep links and assets serve correctly, `/api/*` still 401 without a token.

### 38.1b — Optional hardening (not started)
- [ ] Normalise `APP_URL` in `server/middleware/requireAuth.js` (trim whitespace, strip trailing `/`, lowercase) before using it as Clerk `authorizedParties`. Today it is used verbatim, so `https://MosaicLife.jagdeepsinghvirdi.com` or a trailing slash makes every request 401 with no obvious cause. Add a test in `requireAuth.test.js`.
- [ ] Clerk DNS record names in 38.3/38.4 are from memory of Clerk's usual setup — treat the Clerk dashboard's values as authoritative and correct this doc if they differ.

### 38.2 — Order of operations (manual unless noted)
Domain: `https://mosaiclife.jagdeepsinghvirdi.com` (always **lowercase**; DNS is case-insensitive but the browser `Origin` header and the `APP_URL` comparison are not).

1. [x] Railway project `mosaic-life` (id `a28d0eb3-4bbb-4186-b8c1-30b127414b69`, workspace "Jagdeep Singh Virdi's Projects", env `production`) created 2026-10-07 with a Postgres service (deployed, empty). Decisions: connect GitHub repo `jagdeepvirdi/orbitly` for auto-deploy; start with a fresh database (no dev-data copy, so **no user-ID remapping is needed**).
2. [ ] **Clerk production instance + DNS** — section 38.3. Gives you `pk_live_…` / `sk_live_…`.
3. [ ] **Create the app service from the GitHub repo** (only now — in production the server refuses to start without `CLERK_SECRET_KEY`, so an earlier deploy just crash-loops) and set its variables (below). *(Claude can do this once the Clerk keys exist.)*
4. [ ] **Railway custom domain + GoDaddy DNS for the app** — section 38.4.
5. [ ] Verify — section 38.5. (The Phase 23.4 `jagdeep` household cleanup only matters if you ever copy dev data in; not needed for a fresh DB.)

**App service variables** (Railway → app service → Variables):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://mosaiclife.jagdeepsinghvirdi.com` — exact origin: lowercase, `https`, **no trailing slash** (it is passed verbatim as Clerk `authorizedParties`; any mismatch makes every API call 401) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (private network, so no `DB_SSL`) |
| `CLERK_SECRET_KEY` | `sk_live_…` — set it yourself in the dashboard; don't paste it into chats or commits |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_live_…` — **build-time**: must exist before the first build, or the frontend ships without Clerk and shows no login |
| `GEMINI_API_KEY` | needed for AI extraction (no Ollama in prod) |
| optional | `SENTRY_DSN`/`VITE_SENTRY_DSN`, `STRIPE_*`, `RESEND_API_KEY`, `CRICAPI_KEY`, `FOOTBALL_DATA_KEY`, `BALLDONTLIE_API_KEY`, `VITE_POSTHOG_*` |

Do **not** set `PORT` (Railway injects it) or `SERVER_PORT`.

### 38.3 — Clerk production instance
Your current keys are a Clerk *development* instance (`pk_test_` / `sk_test_`). Production is a separate instance with its own users and keys; **dev users and sessions do not carry over** (fine — fresh start).
- [ ] Clerk Dashboard → your application → switch the instance selector (top) from *Development* to **Production** → *Create production instance* (choose "Clone settings from development" if offered).
- [ ] When asked for the domain, enter **`mosaiclife.jagdeepsinghvirdi.com`** (the host the app will be served from).
- [ ] Open the **Domains** page under Configure/Developers (the DNS records page). Clerk lists the DNS records for the domain — typically five CNAMEs. **Copy the exact Name/Value pairs from the dashboard; don't type them from memory:**
  - `clerk` → Clerk Frontend API host
  - `accounts` → Clerk Account Portal host
  - `clkmail` → Clerk mail host
  - `clk._domainkey` and `clk2._domainkey` → email DKIM keys

  Add them at GoDaddy (38.4 Part A), then click **Verify configuration** in Clerk. Clerk then issues SSL certificates for its own subdomains; this takes a few minutes up to an hour.
- [ ] Re-check sign-in methods under **User & Authentication** (email/password, passkeys, social, etc.) — a cloned instance may not copy everything.
- [ ] If Google (or any other social) sign-in is enabled: production **requires your own OAuth credentials**; the shared dev credentials don't work. Google Cloud Console → create an OAuth client, add the redirect URI that Clerk shows for that provider, paste the Client ID/Secret into Clerk → *SSO connections*.
- [ ] **API keys** page of the *production* instance: copy the **Publishable key** (`pk_live_…`) and **Secret key** (`sk_live_…`). Store them in a password manager and set them in Railway (variables table above) — never in the repo or `.env.example`.
- [ ] Confirm sign-in/sign-up redirect to `/` (this app is a single-page app at the root).
- [ ] Optional, recommended for a private family app: after your own first sign-up, restrict sign-ups (**User & Authentication → Restrictions** → allowlist or disable sign-ups).

### 38.4 — GoDaddy DNS for `mosaiclife.jagdeepsinghvirdi.com`
GoDaddy → **My Products** → `jagdeepsinghvirdi.com` → **DNS** (*Manage DNS*) → **Add New Record**.

**Rules that trip people up in GoDaddy:**
- The **Name/Host** field is *relative* to `jagdeepsinghvirdi.com` — never type the full domain. For `clerk.mosaiclife.jagdeepsinghvirdi.com` the Name is `clerk.mosaiclife`.
- **Value** is the bare hostname — no `https://`, no path.
- A `CNAME` can't share a Name with any other record. Delete a conflicting `A`/`CNAME`/parking record on the same Name first (e.g. an existing `mosaiclife` record).
- Leave TTL at the default (1 hour) or the minimum; propagation can take up to ~1 hour, usually minutes.
- Don't touch the existing records for the root domain, `www`, or email (MX/TXT) — none of these steps need them changed.

**Part A — Clerk records** (do these during 38.3). Create each CNAME Clerk shows. Assuming Clerk's names are relative to `mosaiclife.jagdeepsinghvirdi.com`, they become:

| Type | Name in GoDaddy | Value |
|---|---|---|
| CNAME | `clerk.mosaiclife` | *(from Clerk dashboard)* |
| CNAME | `accounts.mosaiclife` | *(from Clerk dashboard)* |
| CNAME | `clkmail.mosaiclife` | *(from Clerk dashboard)* |
| CNAME | `clk._domainkey.mosaiclife` | *(from Clerk dashboard)* |
| CNAME | `clk2._domainkey.mosaiclife` | *(from Clerk dashboard)* |

If the dashboard shows names *without* the `.mosaiclife` part, follow it exactly, relative to whatever domain it says.

**Part B — the app itself** (do these at step 4, after the app service exists):
- [ ] Railway → app service → **Settings → Networking → Custom Domain** → add `mosaiclife.jagdeepsinghvirdi.com`; leave the target port on auto (Railway injects `PORT`). Railway shows a **CNAME target** (like `xxxxxxxx.up.railway.app`) and usually a **TXT verification** record.
- [ ] GoDaddy → add:

| Type | Name | Value |
|---|---|---|
| CNAME | `mosaiclife` | the target Railway shows |
| TXT | the name Railway shows, made relative (e.g. `_railway-verify.mosaiclife`) | the value Railway shows — only if Railway asks for it |

- [ ] Wait for the domain status in Railway to turn **Active** (TLS certificate is then provisioned automatically). Check with `nslookup -type=CNAME mosaiclife.jagdeepsinghvirdi.com`.

### 38.5 — Post-deploy verification
- [ ] `https://mosaiclife.jagdeepsinghvirdi.com/api/health` returns `{"ok":true,"db":"up",…}`
- [ ] `https://mosaiclife.jagdeepsinghvirdi.com/` shows the Clerk login (a blank page means `VITE_CLERK_PUBLISHABLE_KEY` was missing at build time — set it and redeploy).
- [ ] Sign up/in; the app loads with empty data and **no 401s** in the browser network tab (401 on every call = `APP_URL` mismatch or wrong Clerk keys).
- [ ] Reload on a deep link (e.g. `/calendar`) works (SPA fallback).
- [ ] Festivals page shows data (seeded on first boot).
- [ ] Incognito shows the login gate; a second Clerk user sees zero data (closes the open items in Phase 24.6).

---

## Notes for Claude Code
- Read `CLAUDE.md` fully before starting any phase
- Read `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html` fully before starting Phase 2
- Implement one phase at a time. Verify it works before moving to the next.
- When in doubt about a visual detail, the `.dc.html` is the source of truth
- Don't use `console.log` in production code — remove all debug logs before marking phase complete
- The app is pre-seeded with data — no empty states needed for v1
