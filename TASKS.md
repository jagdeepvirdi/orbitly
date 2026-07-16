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

## Notes for Claude Code
- Read `CLAUDE.md` fully before starting any phase
- Read `Orbitly-handoff.zip/orbitly/project/Orbitly.dc.html` fully before starting Phase 2
- Implement one phase at a time. Verify it works before moving to the next.
- When in doubt about a visual detail, the `.dc.html` is the source of truth
- Don't use `console.log` in production code — remove all debug logs before marking phase complete
- The app is pre-seeded with data — no empty states needed for v1
