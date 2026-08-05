# Mosaic Life

*Everything. Together. Balanced.*

A personal life operating system for managing everything that matters — learning, health, family, finances, sports, and daily tasks — in one unified dashboard.

---

## Features

| Section | What it does |
|---|---|
| **Today Dashboard** | Daily glance: learning timer, medications, tasks, sports ticker, upcoming events, pinned festivals |
| **Calendar** | Month / Week / Day views with festival, sports, and holiday overlays |
| **Learning Planner** | Multi-phase course tracker with AI import, session scheduling, and exam milestones |
| **Tasks** | Kanban and checklist views for work and personal tasks with priority badges |
| **Health & Wellness** | Medication tracking, daily habits, cycle tracker, appointments, prescription AI extraction |
| **Festivals & Recurring** | DB-driven festival calendar across Indian, Sikh, Thai, Christian, Jain, and Islamic calendars — with pinning |
| **Sports Tracker** | Live F1, Cricket, Football, NBA, and Tennis data with per-sport subscriptions |
| **Family Space** | Family directory, school terms, shopping list, and moments wall |
| **Finance Tracker** | Subscriptions, loans, credit cards, and bill payment tracking |
| **Settings** | Profiles, calendar subscriptions, sport subscriptions, connections, and export |

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS (utility-only, no component libraries)
- React Router v6
- Clerk (`@clerk/clerk-react`) for authentication
- Inline SVG icons — no icon library

**Backend**
- Node.js + Express
- PostgreSQL (via `pg` pool)
- Clerk (`@clerk/backend`) for JWT verification
- Gemini AI + Ollama for document extraction

**Key integrations**
- Clerk — auth, multi-user households, invite flow
- Google Gemini — prescription and blood report AI extraction
- Ergast / OpenF1 — F1 race calendar and standings
- CricAPI — live cricket matches
- football-data.org — football fixtures and standings
- balldontlie.io — NBA games (no key required)
- TheMealDB — recipe discovery (no key required)
- Nager.Date — public holidays by country

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- A [Clerk](https://clerk.com) application (free tier)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in your keys
cp .env.example .env

# Start dev server (Vite on :5177 + Express API on :3003)
npm run dev
```

### Environment variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/orbitly

# Clerk auth
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI (optional — app works without these)
GEMINI_API_KEY=...

# Sports APIs (optional)
CRICAPI_KEY=...
FOOTBALL_DATA_KEY=...

# App URL (used for CORS in production)
APP_URL=https://your-domain.com
```

The database schema and seed data (including 3,200+ festival/holiday entries) are applied automatically on first server start.

---

## Project Structure

```
orbitly/
├── public/seeds/          # Static JSON seed files (learning plans)
├── server/
│   ├── middleware/        # requireAuth, requireHousehold
│   ├── routes/            # Express route handlers (one file per domain)
│   ├── seeds/             # festivals.json — 3,232 holiday entries
│   ├── db.js
│   ├── index.js           # Server entry point + migrations
│   └── schema.sql
└── src/
    ├── api/client.js      # All API calls with Clerk token attachment
    ├── components/
    │   ├── layout/        # Sidebar, TopBar, BottomTabBar
    │   ├── sections/      # One component per app section
    │   └── ui/            # Shared primitives (CheckRow, ProgressRing, etc.)
    ├── data/              # Static seed constants (tasks, sports, cert plan)
    ├── hooks/             # useTimer, useTheme, useConfetti
    ├── store/appStore.js  # useReducer global store
    └── utils/             # dateUtils, calendarUtils, recipeUtils
```

---

## Design

Dark-first UI with a light mode toggle. Design tokens (CSS custom properties) match a Figma handoff prototype. Fonts: [Newsreader](https://fonts.google.com/specimen/Newsreader) (headings) + [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk) (body).

Accent colors per user: Jagdeep `#6366f1` · Simran `#f43f5e` · Anaya `#f59e0b`

---

## Timezone

All dates and scheduling logic run in **Asia/Bangkok (ICT, UTC+7)**.
