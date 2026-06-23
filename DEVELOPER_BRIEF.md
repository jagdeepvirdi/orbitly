# Orbitly — Developer Brief

## What It Is

Orbitly is a **personal life operating system** — a private, multi-section web application built for one household (Jagdeep Singh Virdi and family, based in Bangkok, Thailand). It replaces a collection of disconnected tools (calendar apps, habit trackers, reminders, spreadsheets) with a single, beautifully designed interface. Every section is live-data-backed and persists to a PostgreSQL database.

It is not a SaaS product. It is a personal productivity tool designed to be self-hosted or deployed on free/low-cost cloud tiers.

---

## Sections (14 Active Screens)

| Section | What It Does |
|---|---|
| **Today Dashboard** | Daily greeting, learning session countdown timer, medication checklist, top tasks, sports ticker, Rakhi countdown, 48h agenda, family feed |
| **Calendar** | Month/Week/Day views, overlay chips (festivals/sports/holidays), auto-reschedule banner, ICS feed import |
| **Learning Planner** | Certification plan tracker, AI course import via URL, phase-based progress, exam milestone, reading lists, learning events |
| **Tasks Board** | Kanban + checklist toggle, Work/Personal swim lanes, priority badges, overdue indicators |
| **Health & Wellness** | Medications with start/end dates, daily habits CRUD, cycle tracker (gender-gated), appointments with full CRUD |
| **Festivals & Recurring** | Indian, Thai, Sikh, Islamic, Christian, Jain holidays; birthdays; Rakhi Mode alert |
| **Sports Tracker** | F1, Cricket, Football (EPL/CL/etc.), NBA, Tennis — subscribable, live data from external APIs |
| **Family Space** | Family wall (moments + shopping list), Family directory (members grouped by family side, birthdays, contacts) |
| **Finance Tracker** | Subscriptions, loans, credit cards, bills — monthly paid/unpaid toggle |
| **Birthdays & Anniversaries** | Countdown to all upcoming birthdays pulled from the family directory |
| **Food Planner** | Meal plan grid, recipe library, TheMealDB integration (300+ recipes, cuisine filter, recipe drawer) |
| **Hobby Tracker** | Projects, sessions, skill log |
| **Home Management** | Household chores and maintenance tasks |
| **Settings** | Profiles (3 users), gender/cycle sharing, calendar pack subscriptions, sports subscriptions, connections hub, ICS feeds, billing (Stripe), export (JSON/ICS), privacy policy |

---

## Tech Stack

### Frontend

| Layer | Technology | Notes |
|---|---|---|
| Framework | **React 19** | Function components and hooks throughout |
| Build Tool | **Vite 8** | HMR, Vite proxy for API in dev |
| Styling | **Tailwind CSS v4** | Utility classes only — no CSS modules, no styled-components |
| State Management | **React `useReducer`** | Single global store (`appStore.js`), no Redux or Zustand |
| Routing | None (section-based) | Active section stored in state, no React Router |
| Icons | Inline SVG only | No icon library (Lucide, Heroicons, etc.) |
| Fonts | Google Fonts | Newsreader (serif headings) + Hanken Grotesk (body) |
| Auth Client | **Clerk React v5** | `ClerkProvider`, `useAuth`, `getToken()` |
| Analytics | **PostHog** | Section-view events, gated by `VITE_POSTHOG_KEY` |
| Error Tracking | **Sentry React** | Gated by `VITE_SENTRY_DSN` |
| Testing | **Vitest v4 + Testing Library** | 19 unit tests for `dateUtils.js` |

### Backend

| Layer | Technology | Notes |
|---|---|---|
| Runtime | **Node.js (ESM)** | `"type": "module"` throughout — no CommonJS |
| Framework | **Express v4** | Single `server/index.js` entry point, 24 route files |
| Database | **PostgreSQL** | via `pg` (node-postgres), connection pool, no ORM |
| Auth | **Clerk Backend v3** | `verifyToken()` middleware; dev fallback sets `userId = 'jagdeep'` |
| AI Extraction | **Google Gemini** (primary) + **Ollama** (local fallback) | PDF prescriptions, blood reports, course AI-import |
| PDF Parsing | **pdf-parse** | Server-side text extraction before sending to AI |
| Email | **Resend** | Household invite emails |
| Payments | **Stripe** | Checkout sessions, webhook, `user_plans` table |
| Rate Limiting | **express-rate-limit** | AI endpoints: 20 req/15 min; body limit 50 KB (25 MB for `/api/extract` only) |
| Error Tracking | **Sentry Node** | Gated by `SENTRY_DSN` |
| Dev Workflow | **nodemon** | `npm run dev` starts server + Vite concurrently via `concurrently` |

### Database

PostgreSQL with ~30 tables. All migrations run inline at server start via `runMigrations()` in `server/index.js` — each statement is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) and wrapped in its own `try/catch`.

**Key tables:**

```
users / user_profiles / households / household_members / household_invites
tasks / medications / med_checkins / habits / habit_checkins / appointments
courses / learning_plans / books / learning_events
family_groups / family_members / family_events / family_contacts / family_moments / school_terms
shopping_items
finance_subscriptions / finance_loans / finance_credit_cards / finance_bills / finance_paid
festivals / user_calendars / user_sport_subscriptions
recipes / meal_plan / hobby_projects / hobby_log
prescriptions / test_results / cycle_logs
user_plans  (Stripe billing)
```

**Data ownership model:**
- Personal data (tasks, meds, health, learning) is scoped to `user_id`
- Shared household data (shopping, family directory, moments, chores) is scoped to `household_id`
- A user gets one household automatically on first login; a second person can join via email invite

### Deployment Target

| Component | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend API | Render | Free (sleeps after 15 min idle) / $7/mo always-on |
| Database | Neon.tech | Free (0.5 GB PostgreSQL) |
| Auth | Clerk | Free up to 10,000 users |

> **Current status:** Running locally. Deployment (Phase 16) has not been completed yet.

---

## External API Integrations

| Service | Used For | API Key Required |
|---|---|---|
| **Google Gemini** | AI extraction for prescriptions, blood reports, course import | `GEMINI_API_KEY` |
| **Ollama** (local) | AI fallback for dev — local LLM, dev only | Local install |
| **TheMealDB** | Recipe discovery (300+ meals, 25+ cuisines) | None (free public API) |
| **Nager.Date** | Public holidays by country code | None (free public API) |
| **Ergast / OpenF1** | F1 race calendar and driver standings | None (free public API) |
| **CricAPI** | Live cricket match data | `CRICAPI_KEY` |
| **football-data.org** | EPL, Champions League, etc. | `FOOTBALL_DATA_KEY` |
| **balldontlie.io** | NBA games | None (free public API) |
| **Resend** | Household invitation emails | `RESEND_API_KEY` |
| **Stripe** | Pro billing, checkout sessions, webhooks | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` |
| **Clerk** | User authentication, session management | `VITE_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` |
| **PostHog** | Product analytics | `VITE_POSTHOG_KEY` |
| **Sentry** | Error tracking (frontend + backend) | `SENTRY_DSN` + `VITE_SENTRY_DSN` |

---

## Codebase Size & Structure

```
orbitly/
├── src/                             # 59 JS/JSX files
│   ├── components/
│   │   ├── sections/                # 14 section screens
│   │   ├── layout/                  # Sidebar, TopBar, BottomTabBar
│   │   └── ui/                      # Shared primitives (ErrorBoundary, Modal, etc.)
│   ├── store/
│   │   └── appStore.js              # Global useReducer store (~500 lines)
│   ├── api/
│   │   └── client.js                # All API calls centralized (~240 lines)
│   ├── data/                        # Seed constants (certPlan, sportsData, festivals, etc.)
│   ├── hooks/                       # useConfetti, useLiveHolidays, useLiveNba, etc.
│   └── utils/                       # dateUtils, calendarUtils, icsParser, recipeUtils
├── server/                          # 29 JS files
│   ├── index.js                     # Express app + migrations (~570 lines)
│   ├── db.js                        # pg Pool + DATE type parser
│   ├── middleware/                  # requireAuth.js, requireHousehold.js
│   └── routes/                      # 24 route files (one per domain)
├── public/
│   └── privacy.html                 # GDPR/PDPA/DPDP privacy policy
├── CLAUDE.md                        # AI assistant instructions and design tokens
├── TASKS.md                         # Full implementation task log (23 phases, ~900 lines)
└── DEVELOPER_BRIEF.md               # This file
```

**File size notes:**
- `LearningPlanner.jsx` — ~2,070 lines (largest single file)
- Most section components — 400–900 lines each
- Backend is modular — one route file per domain, typically 50–200 lines

---

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL (local instance)
- `.env` file in the project root (see below)

### Running Locally

```bash
npm install

# Start both API server (port 3003) and Vite dev server (port 5177)
npm run dev

# Or run them separately
npm run server   # API only (nodemon, auto-restarts on changes)
npm run client   # Vite only

# Tests
npm test         # run once
npm run test:watch
```

### Environment Variables (`.env`)

```env
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/orbitly
CLERK_SECRET_KEY=sk_...
VITE_CLERK_PUBLISHABLE_KEY=pk_...

# AI features
GEMINI_API_KEY=AIza...
OLLAMA_URL=http://localhost:11434        # local Ollama instance
OLLAMA_VISION_MODEL=gemma3:4b

# Sports live data (optional — app falls back to seed data if missing)
CRICAPI_KEY=...
FOOTBALL_DATA_KEY=...

# Emails (optional — invite flow breaks without this)
RESEND_API_KEY=re_...

# Payments (optional — billing tab breaks without this)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Observability (optional)
VITE_POSTHOG_KEY=phc_...
SENTRY_DSN=https://...
VITE_SENTRY_DSN=https://...

# Production CORS (set to your Vercel domain when deploying)
ALLOWED_ORIGIN=https://orbitly.vercel.app
```

---

## Architecture Rules (Must Respect)

These decisions are set in `CLAUDE.md` and apply to all future work:

1. **Tailwind CSS only** — no CSS modules, no styled-components, no inline `style` objects unless absolutely necessary
2. **Inline SVGs only** — no icon library (Lucide, Heroicons, FontAwesome, etc.)
3. **No Redux / Zustand** — global state lives in `src/store/appStore.js` as a single `useReducer`
4. **All API calls via `src/api/client.js`** — never raw `fetch()` directly inside components; the client handles auth headers and caching
5. **Migrations go in `server/index.js` `sqls[]` array** — always append to the end, always idempotent
6. **No ORM** — raw SQL via `pg` only; write explicit queries
7. **ESM throughout** — `import`/`export` everywhere, no `require()`

---

## Skills Required for a Developer

### Must Have

| Skill | Level | Why |
|---|---|---|
| React 18/19 with hooks | Intermediate–Senior | Every screen is a large React component with local + global state |
| Node.js / Express | Comfortable | 24 route files, middleware chains, async/await throughout |
| PostgreSQL | Comfortable | JOIN queries, migrations, working with `pg` directly (no ORM) |
| Tailwind CSS | Comfortable | Utility-first only — must not reach for custom CSS |
| JavaScript ESM | Comfortable | `import`/`export` everywhere; no CommonJS |
| REST API design | Familiar | Standard CRUD endpoints, some auth-protected |

### Good to Have

| Skill | Why It Helps |
|---|---|
| Clerk auth | Auth is already set up but future multi-user work touches it |
| Vite | Build config, proxy setup, HMR behaviour |
| Vitest / Testing Library | Test suite exists, should grow |
| Stripe | Billing flow is scaffolded, not fully live |
| Google Gemini API | AI extraction features use Gemini as primary model |
| PDF parsing (pdf-parse) | Medical document extraction pipeline |

### Does NOT Need

- ORM knowledge (Prisma, Drizzle, Sequelize — not used)
- Next.js (this is plain Vite + React, not Next)
- GraphQL
- Docker (not containerised)
- TypeScript (the codebase is plain JavaScript)
- Native mobile experience (responsive web only)

---

## What Is Not Built Yet

The following are known gaps / future phases:

| Feature | Status |
|---|---|
| **Deployment** (Vercel + Render + Neon) | Not done — Phase 16 in TASKS.md |
| **Google Calendar two-way sync** | Planned, not started |
| **Apple Health / Strava integration** | Planned, not started |
| **Real-time collaboration** | Household data is shared but not live-synced across sessions |
| **Mobile app** | Responsive PWA only — no React Native or Capacitor |
| **Full Stripe billing flow** | Scaffold exists (`billing.js`, `user_plans` table), not live |
| **Production smoke test** | App has never been deployed to the cloud |

---

## Primary Users

| Name | Role | Accent Colour |
|---|---|---|
| Jagdeep (owner) | Admin | Indigo `#6366f1` |
| Simran | Partner | Rose `#f43f5e` |
| Anaya | Child | Amber `#f59e0b` |

Timezone: **Asia/Bangkok (ICT, UTC+7)**

---

## Design Source of Truth

The visual design comes from a Claude Design handoff file (`Orbitly.dc.html` inside `Orbitly-handoff.zip`). All colours, spacing, typography, shadows, and component structures in that file are the reference. Any UI work must match the handoff — the design tokens (CSS variables for dark/light mode, category colours, priority colours, etc.) are documented in `CLAUDE.md`.
