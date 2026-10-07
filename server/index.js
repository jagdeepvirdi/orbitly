import 'dotenv/config';
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}
import express from 'express';
import cors from 'cors';
import db from './db.js';
import requireAuth       from './middleware/requireAuth.js';
import holidaysRouter    from './routes/holidays.js';
import f1Router          from './routes/f1.js';
import cricketRouter     from './routes/cricket.js';
import footballRouter    from './routes/football.js';
import tasksRouter       from './routes/tasks.js';
import medsRouter        from './routes/meds.js';
import habitsRouter      from './routes/habits.js';
import appointmentsRouter from './routes/appointments.js';
import shoppingRouter    from './routes/shopping.js';
import coursesRouter     from './routes/courses.js';
import learningPlansRouter  from './routes/learningPlans.js';
import booksRouter          from './routes/books.js';
import learningEventsRouter from './routes/learningEvents.js';
import courseTimeLogsRouter from './routes/courseTimeLogs.js';
import familyRouter      from './routes/family.js';
import financeRouter     from './routes/finance.js';
import festivalsRouter   from './routes/festivals.js';
import extractRouter     from './routes/extract.js';
import recipesRouter     from './routes/recipes.js';
import calendarSubsRouter from './routes/calendarSubscriptions.js';
import sportsCatalogRouter from './routes/sportsCatalog.js';
import nbaRouter           from './routes/nba.js';
import householdRouter     from './routes/household.js';
import billingRouter       from './routes/billing.js';
import profileRouter       from './routes/profile.js';
import fs                  from 'fs';
import path                from 'path';
import { fileURLToPath }   from 'url';
import crypto               from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add missing columns that older schema installs don't have yet
async function runMigrations() {
  const sqls = [
    // ── Phase 0: base tables ────────────────────────────────────────────────
    // Mirrors server/schema.sql's base tables (minus a few schema.sql already
    // marks IF NOT EXISTS and that are also defined further down in this list
    // — user_calendars, user_sport_subscriptions, user_festivals,
    // finance_insurance, course_time_logs). Locally, schema.sql normally
    // bootstraps these via docker-compose.yml's postgres initdb hook before
    // the app ever starts, so this block is a no-op there. On a database
    // that was never initialized from schema.sql (e.g. a fresh managed
    // Postgres in production), this is what actually creates them — without
    // it, the very first `ALTER TABLE medications ...` a few lines down would
    // fail with "relation does not exist" on a truly empty database.
    `CREATE TABLE IF NOT EXISTS tasks (
       id          VARCHAR(50)  PRIMARY KEY,
       title       VARCHAR(400) NOT NULL,
       list        VARCHAR(20)  NOT NULL CHECK (list IN ('work','personal')),
       priority    VARCHAR(20)  NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent','High','Normal','Low')),
       due         VARCHAR(60),
       status      VARCHAR(20)  NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
       overdue     BOOLEAN      NOT NULL DEFAULT FALSE,
       recurring   BOOLEAN      NOT NULL DEFAULT FALSE,
       project     VARCHAR(100),
       user_id     TEXT         NOT NULL DEFAULT '',
       created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_list_status ON tasks(list, status)`,
    `CREATE TABLE IF NOT EXISTS medications (
       id            VARCHAR(50)  PRIMARY KEY,
       name          VARCHAR(200) NOT NULL,
       dose          VARCHAR(200),
       time          VARCHAR(60),
       sort_order    SMALLINT     NOT NULL DEFAULT 0,
       days_of_week  SMALLINT[]   NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
       food_timing   VARCHAR(20)  CHECK (food_timing IS NULL OR food_timing IN ('before_food','after_food','with_food')),
       user_id       TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id)`,
    `CREATE TABLE IF NOT EXISTS med_checkins (
       med_id      VARCHAR(50) NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
       checkin_date DATE        NOT NULL,
       done        BOOLEAN      NOT NULL DEFAULT FALSE,
       user_id     TEXT         NOT NULL DEFAULT '',
       PRIMARY KEY (med_id, checkin_date)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_med_checkins_user_id ON med_checkins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_med_checkins_date ON med_checkins(checkin_date)`,
    `CREATE TABLE IF NOT EXISTS habits (
       id          VARCHAR(50)  PRIMARY KEY,
       label       VARCHAR(200) NOT NULL,
       icon        VARCHAR(10),
       sort_order  SMALLINT     NOT NULL DEFAULT 0,
       user_id     TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)`,
    `CREATE TABLE IF NOT EXISTS habit_checkins (
       habit_id    VARCHAR(50) NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
       checkin_date DATE        NOT NULL,
       done        BOOLEAN      NOT NULL DEFAULT FALSE,
       user_id     TEXT         NOT NULL DEFAULT '',
       PRIMARY KEY (habit_id, checkin_date)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id ON habit_checkins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_habit_checkins_date ON habit_checkins(checkin_date)`,
    `CREATE TABLE IF NOT EXISTS appointments (
       id          VARCHAR(50)  PRIMARY KEY,
       who         VARCHAR(100),
       type        VARCHAR(300),
       appt_date   VARCHAR(60),
       done        BOOLEAN      NOT NULL DEFAULT FALSE,
       user_id     TEXT         NOT NULL DEFAULT '',
       created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)`,
    `CREATE TABLE IF NOT EXISTS shopping_items (
       id          VARCHAR(50)  PRIMARY KEY,
       item        VARCHAR(300) NOT NULL,
       done        BOOLEAN      NOT NULL DEFAULT FALSE,
       created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS courses (
       id          VARCHAR(50)  PRIMARY KEY,
       name        VARCHAR(300) NOT NULL,
       phase       SMALLINT     NOT NULL,
       total       SMALLINT     NOT NULL,
       done        SMALLINT     NOT NULL DEFAULT 0,
       next        VARCHAR(60),
       next_iso    VARCHAR(10),
       sort_order  SMALLINT     NOT NULL DEFAULT 0,
       user_id     TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id)`,
    `CREATE TABLE IF NOT EXISTS family_groups (
       id    VARCHAR(50) PRIMARY KEY,
       label VARCHAR(200) NOT NULL,
       side  VARCHAR(10)  NOT NULL,
       emoji VARCHAR(10)
     )`,
    `CREATE TABLE IF NOT EXISTS family_members (
       id         VARCHAR(60)  PRIMARY KEY,
       real_name  VARCHAR(150) NOT NULL,
       pet_name   VARCHAR(150),
       side       VARCHAR(10)  NOT NULL,
       group_id   VARCHAR(50)  REFERENCES family_groups(id),
       relation   VARCHAR(150),
       bday_month SMALLINT     CHECK (bday_month BETWEEN 1 AND 12),
       bday_day   SMALLINT     CHECK (bday_day   BETWEEN 1 AND 31)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_family_members_group_id ON family_members(group_id)`,
    `CREATE TABLE IF NOT EXISTS family_events (
       id          VARCHAR(60)  PRIMARY KEY,
       label       VARCHAR(300) NOT NULL,
       type        VARCHAR(20)  NOT NULL CHECK (type IN ('marriage','engagement','court')),
       side        VARCHAR(10)  NOT NULL,
       group_id    VARCHAR(50)  REFERENCES family_groups(id),
       event_month SMALLINT     NOT NULL CHECK (event_month BETWEEN 1 AND 12),
       event_day   SMALLINT     NOT NULL CHECK (event_day   BETWEEN 1 AND 31)
     )`,
    `CREATE TABLE IF NOT EXISTS family_contacts (
       member_id  VARCHAR(60)  PRIMARY KEY REFERENCES family_members(id) ON DELETE CASCADE,
       phone      VARCHAR(40),
       email      VARCHAR(150),
       address    TEXT,
       instagram  VARCHAR(120),
       linkedin   VARCHAR(120),
       facebook   VARCHAR(120),
       workplace  VARCHAR(250)
     )`,
    `CREATE TABLE IF NOT EXISTS finance_subscriptions (
       id          VARCHAR(50)    PRIMARY KEY,
       name        VARCHAR(200)   NOT NULL,
       country     VARCHAR(10),
       cat         VARCHAR(50),
       emoji       VARCHAR(10),
       amount      NUMERIC(10,2),
       currency    VARCHAR(5),
       billing_day SMALLINT       CHECK (billing_day BETWEEN 1 AND 31),
       cycle       VARCHAR(20)    NOT NULL DEFAULT 'monthly',
       start_date  DATE,
       user_id     TEXT           NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_subscriptions_user_id ON finance_subscriptions(user_id)`,
    `CREATE TABLE IF NOT EXISTS finance_loans (
       id       VARCHAR(50)   PRIMARY KEY,
       name     VARCHAR(200)  NOT NULL,
       bank     VARCHAR(200),
       emi      NUMERIC(12,2),
       currency VARCHAR(5),
       due_day  SMALLINT      CHECK (due_day BETWEEN 1 AND 31),
       emoji    VARCHAR(10),
       user_id  TEXT          NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_loans_user_id ON finance_loans(user_id)`,
    `CREATE TABLE IF NOT EXISTS finance_credit_cards (
       id            VARCHAR(50)  PRIMARY KEY,
       name          VARCHAR(200) NOT NULL,
       bank          VARCHAR(200),
       statement_day SMALLINT     CHECK (statement_day BETWEEN 1 AND 31),
       due_day       SMALLINT     CHECK (due_day       BETWEEN 1 AND 31),
       currency      VARCHAR(5),
       emoji         VARCHAR(10),
       user_id       TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_credit_cards_user_id ON finance_credit_cards(user_id)`,
    `CREATE TABLE IF NOT EXISTS finance_bills (
       id             VARCHAR(50)  PRIMARY KEY,
       name           VARCHAR(200) NOT NULL,
       country        VARCHAR(10),
       type           VARCHAR(50),
       emoji          VARCHAR(10),
       generation_day SMALLINT     CHECK (generation_day BETWEEN 1 AND 31),
       due_day        SMALLINT     CHECK (due_day        BETWEEN 1 AND 31),
       amount         NUMERIC(10,2),
       currency       VARCHAR(5),
       cycle          VARCHAR(20)  NOT NULL DEFAULT 'monthly',
       start_date     DATE,
       user_id        TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_bills_user_id ON finance_bills(user_id)`,
    `CREATE TABLE IF NOT EXISTS finance_paid (
       item_type  VARCHAR(20)  NOT NULL CHECK (item_type IN ('subscription','loan','credit_card','bill')),
       item_id    VARCHAR(50)  NOT NULL,
       paid_month DATE         NOT NULL,
       paid       BOOLEAN      NOT NULL DEFAULT FALSE,
       user_id    TEXT         NOT NULL DEFAULT '',
       PRIMARY KEY (item_type, item_id, paid_month)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_paid_user_id ON finance_paid(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_paid_month ON finance_paid(paid_month)`,
    `CREATE TABLE IF NOT EXISTS festivals (
       id         SERIAL       PRIMARY KEY,
       name       VARCHAR(200) NOT NULL,
       event_date DATE         NOT NULL,
       cat        VARCHAR(30),
       emoji      VARCHAR(10),
       action     TEXT,
       reminder   VARCHAR(120)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_festivals_date ON festivals(event_date)`,
    `CREATE TABLE IF NOT EXISTS sikh_events (
       id         SERIAL       PRIMARY KEY,
       name       VARCHAR(200) NOT NULL,
       event_date DATE         NOT NULL,
       cat        VARCHAR(20)  CHECK (cat IN ('gurpurab','shahidi','cultural')),
       emoji      VARCHAR(10),
       description TEXT,
       reminder   VARCHAR(120)
     )`,
    // ── Phase 1+: incremental changes (original migration history) ─────────
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS who VARCHAR(50) DEFAULT 'Jagdeep'`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS doctor VARCHAR(200)`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS start_date VARCHAR(20)`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS prescription_id VARCHAR(50)`,
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS url VARCHAR(500)`,
    `ALTER TABLE courses ALTER COLUMN id TYPE VARCHAR(30)`,
    `CREATE TABLE IF NOT EXISTS learning_plans (
       id SERIAL PRIMARY KEY,
       title VARCHAR(200) NOT NULL,
       description TEXT,
       type VARCHAR(50) DEFAULT 'certification',
       color VARCHAR(7) DEFAULT '#6366f1',
       icon VARCHAR(10) DEFAULT '📚',
       exam_date VARCHAR(100),
       est_completion VARCHAR(100),
       cert_name VARCHAR(200),
       cert_issued VARCHAR(50),
       cert_expires VARCHAR(50),
       cert_url VARCHAR(500),
       cert_number VARCHAR(100),
       cert_issuer VARCHAR(200),
       passed BOOLEAN DEFAULT false,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `INSERT INTO learning_plans (id, title, description, type, color, icon, exam_date, est_completion, cert_name)
     VALUES (1, 'Anthropic Certification Plan', 'Official Claude certification pathway by Anthropic',
             'certification', '#6366f1', '🤖', '4 September 2026', '25 August 2026',
             'Claude Certified Associate — Foundational')
     ON CONFLICT (id) DO NOTHING`,
    `SELECT setval('learning_plans_id_seq', GREATEST((SELECT MAX(id) FROM learning_plans), 1))`,
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES learning_plans(id) ON DELETE SET NULL`,
    `UPDATE courses SET plan_id = 1 WHERE plan_id IS NULL`,
    `CREATE TABLE IF NOT EXISTS books (
       id SERIAL PRIMARY KEY,
       plan_id INTEGER REFERENCES learning_plans(id) ON DELETE CASCADE,
       title VARCHAR(300) NOT NULL,
       author VARCHAR(200),
       pages INTEGER,
       genre VARCHAR(100),
       status VARCHAR(20) DEFAULT 'to-read',
       started_date VARCHAR(50),
       finished_date VARCHAR(50),
       rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
       notes TEXT,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS learning_events (
       id SERIAL PRIMARY KEY,
       title VARCHAR(300) NOT NULL,
       event_type VARCHAR(50) DEFAULT 'webinar',
       event_date VARCHAR(20),
       event_time VARCHAR(10),
       url VARCHAR(500),
       notes TEXT,
       plan_id INTEGER REFERENCES learning_plans(id) ON DELETE SET NULL,
       attended BOOLEAN DEFAULT false,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS school_terms (
       id SERIAL PRIMARY KEY,
       label VARCHAR(200) NOT NULL,
       date_display VARCHAR(150),
       date_start VARCHAR(20),
       color VARCHAR(7) DEFAULT '#6366f1',
       sort_order INTEGER DEFAULT 0,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `INSERT INTO school_terms (label, date_display, date_start, color, sort_order)
     SELECT * FROM (VALUES
       ('Term 2 ends',       '24 Jul 2026',          '2026-07-24', '#f59e0b', 1),
       ('Summer break',      '25 Jul – 14 Aug 2026', '2026-07-25', '#10b981', 2),
       ('Term 3 begins',     '17 Aug 2026',           '2026-08-17', '#6366f1', 3),
       ('End-of-year exams', '14–18 Dec 2026',        '2026-12-14', '#ef4444', 4)
     ) AS v(label, date_display, date_start, color, sort_order)
     WHERE NOT EXISTS (SELECT 1 FROM school_terms)`,
    `CREATE TABLE IF NOT EXISTS family_moments (
       id SERIAL PRIMARY KEY,
       caption VARCHAR(500) NOT NULL,
       emoji VARCHAR(20) DEFAULT '📸',
       moment_date VARCHAR(50),
       notes TEXT,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    // Cert columns on learning_events
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS has_cert     BOOLEAN DEFAULT false`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_name    VARCHAR(300)`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_issuer  VARCHAR(200)`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_number  VARCHAR(100)`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_url     VARCHAR(500)`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_issued  VARCHAR(50)`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS cert_expires VARCHAR(50)`,
    // user_id column migrations
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE med_checkins ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE habits ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE habit_checkins ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE courses ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE books ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE learning_events ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE finance_subscriptions ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE finance_loans ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE finance_credit_cards ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE finance_bills ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE finance_paid ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    // user_id indexes
    `CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_med_checkins_user_id ON med_checkins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_habit_checkins_user_id ON habit_checkins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_learning_plans_user_id ON learning_plans(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_learning_events_user_id ON learning_events(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_subscriptions_user_id ON finance_subscriptions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_loans_user_id ON finance_loans(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_credit_cards_user_id ON finance_credit_cards(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_bills_user_id ON finance_bills(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_paid_user_id ON finance_paid(user_id)`,
    // Performance indexes
    `CREATE INDEX IF NOT EXISTS idx_med_checkins_date ON med_checkins(checkin_date)`,
    `CREATE INDEX IF NOT EXISTS idx_habit_checkins_date ON habit_checkins(checkin_date)`,
    `CREATE INDEX IF NOT EXISTS idx_tasks_list_status ON tasks(list, status)`,
    `CREATE INDEX IF NOT EXISTS idx_courses_plan_id ON courses(plan_id)`,
    `CREATE INDEX IF NOT EXISTS idx_festivals_date ON festivals(event_date)`,
    `CREATE INDEX IF NOT EXISTS idx_family_members_group_id ON family_members(group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_finance_paid_month ON finance_paid(paid_month)`,
    // Drop hardcoded family side constraints if they exist to support 'custom' side
    `ALTER TABLE family_groups DROP CONSTRAINT IF EXISTS family_groups_side_check`,
    `ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_side_check`,
    // Drop dead sports tables that are fetched dynamically via live external APIs
    `DROP TABLE IF EXISTS f1_calendar, f1_drivers, cricket_matches, football_fixtures`,
    // Add unique constraint so festival re-seeding is idempotent
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'festivals_name_date_unique'
       ) THEN
         ALTER TABLE festivals ADD CONSTRAINT festivals_name_date_unique UNIQUE (name, event_date);
       END IF;
     END $$`,
    // Seed missing Indian/Thai festivals (superseded by consolidated seeds/festivals.json)
    `SELECT 1`,
    // Phase 19: user calendar subscriptions table
    `CREATE TABLE IF NOT EXISTS user_calendars (
       user_id    VARCHAR(50) NOT NULL,
       calendar_id VARCHAR(50) NOT NULL,
       enabled    BOOLEAN NOT NULL DEFAULT true,
       updated_at TIMESTAMP DEFAULT NOW(),
       PRIMARY KEY (user_id, calendar_id)
     )`,
    // Phase 20: user sports subscriptions table
    `CREATE TABLE IF NOT EXISTS user_sport_subscriptions (
       user_id    VARCHAR(50) NOT NULL,
       sport_id   VARCHAR(50) NOT NULL,
       leagues    JSONB NOT NULL DEFAULT '[]'::jsonb,
       added_at   TIMESTAMP DEFAULT NOW(),
       PRIMARY KEY (user_id, sport_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_user_sport_subscriptions_user_id ON user_sport_subscriptions(user_id)`,
    // Phase 14: backfill existing rows — set user_id = 'jagdeep' where still empty
    `UPDATE tasks SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE medications SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE med_checkins SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE habits SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE habit_checkins SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE appointments SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE courses SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE learning_plans SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE books SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE learning_events SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE finance_subscriptions SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE finance_loans SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE finance_credit_cards SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE finance_bills SET user_id = 'jagdeep' WHERE user_id = ''`,
    `UPDATE finance_paid SET user_id = 'jagdeep' WHERE user_id = ''`,
    // Phase 15: household tables
    `CREATE TABLE IF NOT EXISTS households (
       id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
       name TEXT NOT NULL,
       created_by TEXT NOT NULL UNIQUE,
       created_at TIMESTAMP DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS household_members (
       id SERIAL PRIMARY KEY,
       household_id TEXT NOT NULL,
       user_id TEXT NOT NULL UNIQUE,
       role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
       added_at TIMESTAMP DEFAULT NOW()
     )`,
    `CREATE TABLE IF NOT EXISTS household_invites (
       id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
       household_id TEXT NOT NULL,
       inviter_user_id TEXT NOT NULL,
       invitee_email TEXT NOT NULL,
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
       created_at TIMESTAMP DEFAULT NOW(),
       accepted_at TIMESTAMP
     )`,
    // Phase 15: household_id column on shared tables
    `ALTER TABLE shopping_items  ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `ALTER TABLE family_groups   ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `ALTER TABLE family_members  ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `ALTER TABLE family_events   ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `ALTER TABLE school_terms    ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `ALTER TABLE family_moments  ADD COLUMN IF NOT EXISTS household_id TEXT`,
    // Phase 15: indexes
    `CREATE INDEX IF NOT EXISTS idx_household_members_user_id ON household_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_household_invites_household_id ON household_invites(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_shopping_items_household_id ON shopping_items(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_family_groups_household_id ON family_groups(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_family_members_household_id ON family_members(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_family_events_household_id ON family_events(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_school_terms_household_id ON school_terms(household_id)`,
    `CREATE INDEX IF NOT EXISTS idx_family_moments_household_id ON family_moments(household_id)`,
    // Phase 17: Stripe plans table
    `CREATE TABLE IF NOT EXISTS user_plans (
       user_id            TEXT PRIMARY KEY,
       plan               TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro')),
       pro_until          TIMESTAMPTZ,
       stripe_customer_id TEXT,
       updated_at         TIMESTAMPTZ DEFAULT NOW()
     )`,
    // Phase 17: UUID defaults — new rows get gen_random_uuid() PKs instead of Date.now() strings
    `ALTER TABLE tasks               ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE medications         ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE appointments        ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE shopping_items      ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE finance_subscriptions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE finance_loans       ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE finance_credit_cards ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    `ALTER TABLE finance_bills       ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`,
    // Phase 15: backfill — create Jagdeep's household and populate existing rows
    `DO $$
     DECLARE hid TEXT;
     BEGIN
       INSERT INTO households (name, created_by)
       VALUES ('Virdi Household', 'jagdeep')
       ON CONFLICT (created_by) DO NOTHING;

       SELECT id INTO hid FROM households WHERE created_by = 'jagdeep';

       IF hid IS NOT NULL THEN
         INSERT INTO household_members (household_id, user_id, role)
         VALUES (hid, 'jagdeep', 'owner')
         ON CONFLICT (user_id) DO NOTHING;

         UPDATE shopping_items SET household_id = hid WHERE household_id IS NULL;
         UPDATE family_groups   SET household_id = hid WHERE household_id IS NULL;
         UPDATE family_members  SET household_id = hid WHERE household_id IS NULL;
         UPDATE family_events   SET household_id = hid WHERE household_id IS NULL;
         UPDATE school_terms    SET household_id = hid WHERE household_id IS NULL;
         UPDATE family_moments  SET household_id = hid WHERE household_id IS NULL;
       END IF;
     END $$`,
    // Phase 22: unify festivals — add calendar, description, user_id; drop sikh_events
    `ALTER TABLE festivals ADD COLUMN IF NOT EXISTS calendar TEXT NOT NULL DEFAULT 'indian'`,
    `ALTER TABLE festivals ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE festivals ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT ''`,
    `UPDATE festivals SET calendar = 'thai' WHERE cat = 'thai' AND calendar = 'indian'`,
    `CREATE INDEX IF NOT EXISTS idx_festivals_user_id  ON festivals(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_festivals_calendar ON festivals(calendar)`,
    // The same festival can legitimately appear under several calendars (e.g. Diwali under
    // both 'indian' and 'hindu'). (name, event_date) alone silently dropped the later copy,
    // so users subscribed to only that calendar never saw it. Include calendar in the key;
    // GET /api/festivals collapses same-name/date rows for users subscribed to several.
    `ALTER TABLE festivals DROP CONSTRAINT IF EXISTS festivals_name_date_unique`,
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'festivals_name_date_calendar_unique'
       ) THEN
         ALTER TABLE festivals ADD CONSTRAINT festivals_name_date_calendar_unique UNIQUE (name, event_date, calendar);
       END IF;
     END $$`,
    // Phase 22: add household_id to family_contacts
    `ALTER TABLE family_contacts ADD COLUMN IF NOT EXISTS household_id TEXT`,
    `UPDATE family_contacts fc SET household_id = (SELECT household_id FROM family_members fm WHERE fm.id = fc.member_id) WHERE fc.household_id IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_family_contacts_household_id ON family_contacts(household_id)`,
    // Phase 23.1: medications end_date
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS end_date VARCHAR`,
    // Phase 23.1: user_profiles (gender, cycle sharing)
    `CREATE TABLE IF NOT EXISTS user_profiles (
       user_id              TEXT PRIMARY KEY,
       gender               TEXT NOT NULL DEFAULT 'prefer-not-to-say'
                            CHECK (gender IN ('male','female','other','prefer-not-to-say')),
       share_cycle_tracker  BOOLEAN NOT NULL DEFAULT false,
       prefs                JSONB NOT NULL DEFAULT '{}',
       created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    // Phase 23.1: cycle_logs (period tracker persistence)
    `CREATE TABLE IF NOT EXISTS cycle_logs (
       id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
       user_id      TEXT NOT NULL DEFAULT '',
       period_start DATE NOT NULL,
       period_end   DATE,
       cycle_length SMALLINT,
       notes        TEXT,
       created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
    `CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_id ON cycle_logs(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_cycle_logs_start   ON cycle_logs(period_start)`,

    // ── Phase 23.3: indexes ────────────────────────────────────────────────────
    // The UNIQUE constraint on household_members.user_id is already a btree index;
    // the explicit idx below is redundant.
    `DROP INDEX IF EXISTS idx_household_members_user_id`,
    // Composite index — courses are almost always queried by both user_id + plan_id.
    `CREATE INDEX IF NOT EXISTS idx_courses_user_plan ON courses(user_id, plan_id)`,

    // ── Phase 23.3: FK constraints on household_id columns ────────────────────
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fm_household') THEN
         ALTER TABLE family_members  ADD CONSTRAINT fk_fm_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fg_household') THEN
         ALTER TABLE family_groups   ADD CONSTRAINT fk_fg_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fe_household') THEN
         ALTER TABLE family_events   ADD CONSTRAINT fk_fe_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_fc_household') THEN
         ALTER TABLE family_contacts ADD CONSTRAINT fk_fc_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_st_household') THEN
         ALTER TABLE school_terms    ADD CONSTRAINT fk_st_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_si_household') THEN
         ALTER TABLE shopping_items  ADD CONSTRAINT fk_si_household FOREIGN KEY (household_id) REFERENCES households(id);
       END IF;
     END $$`,

    // ── Phase 23.3: fix FK cascade behaviour ──────────────────────────────────
    // courses.plan_id: was SET NULL — change to CASCADE so deleting a plan also
    // deletes its courses (consistent with books.plan_id which already uses CASCADE).
    `ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_plan_id_fkey`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courses_plan_id_fkey') THEN
         ALTER TABLE courses ADD CONSTRAINT courses_plan_id_fkey
           FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    // family_events.group_id and family_members.group_id: was NO ACTION → CASCADE
    // so deleting a group outside the API doesn't leave orphans.
    `ALTER TABLE family_events  DROP CONSTRAINT IF EXISTS family_events_group_id_fkey`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_events_group_id_fkey') THEN
         ALTER TABLE family_events ADD CONSTRAINT family_events_group_id_fkey
           FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;
       END IF;
     END $$`,
    `ALTER TABLE family_members DROP CONSTRAINT IF EXISTS family_members_group_id_fkey`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'family_members_group_id_fkey') THEN
         ALTER TABLE family_members ADD CONSTRAINT family_members_group_id_fkey
           FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;
       END IF;
     END $$`,

    // ── Phase 23.4: data hygiene ───────────────────────────────────────────────
    // Remove the hardcoded 'Jagdeep' default — in multi-user mode this is wrong.
    `ALTER TABLE medications ALTER COLUMN who SET DEFAULT NULL`,

    // ── Phase 23.5: VARCHAR → DATE for date-semantic columns ─────────────────
    // USING clause: valid ISO strings cast to DATE; everything else becomes NULL.
    // tasks.due was VARCHAR storing display strings ("Today", "14 Jun") but the
    // table has 0 rows so this conversion is trivially safe.
    `ALTER TABLE tasks ALTER COLUMN due TYPE DATE USING
       CASE WHEN due ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN due::DATE ELSE NULL END`,
    `ALTER TABLE medications ALTER COLUMN start_date TYPE DATE USING
       CASE WHEN start_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN start_date::DATE ELSE NULL END`,
    `ALTER TABLE medications ALTER COLUMN end_date TYPE DATE USING
       CASE WHEN end_date IS NOT NULL AND end_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN end_date::DATE ELSE NULL END`,
    `ALTER TABLE appointments ALTER COLUMN appt_date TYPE DATE USING
       CASE WHEN appt_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN appt_date::DATE ELSE NULL END`,
    `ALTER TABLE courses ALTER COLUMN next_iso TYPE DATE USING
       CASE WHEN next_iso ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN next_iso::DATE ELSE NULL END`,
    `ALTER TABLE learning_events ALTER COLUMN event_date TYPE DATE USING
       CASE WHEN event_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN event_date::DATE ELSE NULL END`,

    // ── Phase 23.4: seed tasks table (run after DATE migration) ───────────────
    // Idempotent: only inserts when no tasks exist for the dev user.
    `INSERT INTO tasks (title, list, priority, due, status, overdue, recurring, user_id)
     SELECT v.title, v.list, v.priority, (CURRENT_DATE + v.offset_days), v.status, v.overdue, v.recurring, 'jagdeep'
     FROM (VALUES
       ('Review Q2 billing dashboard',       'work',     'High',   0,   'doing', false, false),
       ('Reply to client onboarding thread', 'work',     'Urgent', 0,   'todo',  false, false),
       ('Prep weekly status report',         'work',     'Normal', 3,   'done',  false, true),
       ('Approve design mockups',            'work',     'High',  -2,   'doing', true,  false),
       ('Update API documentation',          'work',     'Low',    7,   'todo',  false, false),
       ('Monthly billing review',            'work',     'Normal', 7,   'todo',  false, true),
       ('Book dentist appointment',          'personal', 'High',   0,   'todo',  false, false),
       ('Renew gym membership',              'personal', 'Low',   -11,  'todo',  false, false),
       ('Order groceries for the weekend',   'personal', 'Normal', 4,   'todo',  false, false),
       ('Call the electrician',              'personal', 'Normal',-3,   'done',  false, false),
       ('Plan weekend family trip',          'personal', 'Low',    7,   'todo',  false, false)
     ) AS v(title, list, priority, offset_days, status, overdue, recurring)
     WHERE NOT EXISTS (SELECT 1 FROM tasks)`,

    // ── Phase 22: habits CRUD columns ─────────────────────────────────────────
    `ALTER TABLE habits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`,
    `ALTER TABLE habits ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false`,

    // ── Phase 22: appointment detail columns ──────────────────────────────────
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor    VARCHAR(150)`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location  VARCHAR(250)`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appt_time VARCHAR(10)`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes     TEXT`,

    // ── Phase 22: seed 3 default habits for dev user ──────────────────────────
    `INSERT INTO habits (id, label, icon, sort_order, user_id, is_default)
     SELECT v.id, v.label, v.icon, v.sort_order, 'jagdeep', true
     FROM (VALUES
       ('h_water_jagdeep',    'Drink 8 glasses of water', '💧', 0),
       ('h_exercise_jagdeep', 'Exercise 30 minutes',      '🏃', 1),
       ('h_sleep_jagdeep',    'Sleep 8 hours',            '😴', 2)
     ) AS v(id, label, icon, sort_order)
     WHERE NOT EXISTS (SELECT 1 FROM habits)`,

    // Mark existing habits as defaults if they match the seeded IDs
    `UPDATE habits SET is_default = true
     WHERE id IN ('h_water_jagdeep', 'h_exercise_jagdeep', 'h_sleep_jagdeep')`,

    // ── Fix: seed Anthropic Cert Plan courses for dev user ────────────────────
    // The learning_plans seed (id=1) already exists but the courses table has
    // no rows for user_id='jagdeep', so the plan detail shows empty. Seed the
    // 13 CERT_COURSES from certPlan.js into the DB (idempotent).
    `INSERT INTO courses (id, name, phase, total, done, next, next_iso, sort_order, url, plan_id, user_id)
     SELECT v.id, v.name, v.phase::INTEGER, v.total::INTEGER, v.done::INTEGER,
            v.nxt, v.niso::DATE, v.sord::INTEGER, '', 1, 'jagdeep'
     FROM (VALUES
       ('c1',  'Introduction to Claude',               '0','3','3','Completed',       NULL,          '0'),
       ('c2',  'Claude 101',                           '0','5','1','24 Jun',          '2026-06-24',  '1'),
       ('c3',  'Prompt Engineering with Claude',       '0','5','0','1 Jul',           '2026-07-01',  '2'),
       ('c4',  'Claude & the API',                     '1','4','0','8 Jul',           '2026-07-08',  '3'),
       ('c5',  'Tool Use & Function Calling',          '1','4','0','15 Jul',          '2026-07-15',  '4'),
       ('c6',  'Model Context Protocol (MCP) 101',    '1','3','0','22 Jul',          '2026-07-22',  '5'),
       ('c7',  'Claude Code 101',                      '1','5','0','29 Jul',          '2026-07-29',  '6'),
       ('c8',  'Building Agents with Claude',          '2','6','0','5 Aug',           '2026-08-05',  '7'),
       ('c9',  'Retrieval-Augmented Generation',       '2','4','0','12 Aug',          '2026-08-12',  '8'),
       ('c10', 'Claude for Data & Analysis',           '2','4','0','19 Aug',          '2026-08-19',  '9'),
       ('c11', 'Evals, Safety & Guardrails',           '2','4','0','21 Aug',          '2026-08-21', '10'),
       ('c12', 'Claude in Production',                 '3','5','0','26 Aug',          '2026-08-26', '11'),
       ('c13', 'Capstone Project',                     '3','6','0','2 Sep',           '2026-09-02', '12')
     ) AS v(id, name, phase, total, done, nxt, niso, sord)
     WHERE NOT EXISTS (SELECT 1 FROM courses)`,

    // ── Fix: seed family groups for dev user so Directory tab is not blank ────
    // Two root groups (Sahmbi side + Virdi side). Idempotent via ON CONFLICT.
    `INSERT INTO family_groups (id, label, side, emoji, household_id)
     SELECT v.id, v.label, v.side, v.emoji,
            (SELECT h.id FROM households h
             JOIN household_members hm ON hm.household_id = h.id
             WHERE hm.user_id = 'jagdeep' LIMIT 1)
     FROM (VALUES
       ('sahmbi-main', 'Sahmbi Family', 'sahmbi', '👨‍👩‍👧'),
       ('virdi-main',  'Virdi Family',  'virdi',  '👨‍👩‍👧‍👦')
     ) AS v(id, label, side, emoji)
     WHERE EXISTS (SELECT 1 FROM household_members WHERE user_id = 'jagdeep')
       AND NOT EXISTS (SELECT 1 FROM family_groups
                       WHERE household_id = (
                         SELECT h.id FROM households h
                         JOIN household_members hm ON hm.household_id = h.id
                         WHERE hm.user_id = 'jagdeep' LIMIT 1))`,
    // Phase 26: user pinned festivals mapping table
    `CREATE TABLE IF NOT EXISTS user_pinned_festivals (
       user_id     VARCHAR(50) NOT NULL,
       festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (user_id, festival_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_user_pinned_festivals_user ON user_pinned_festivals(user_id)`,
    // Phase 26.2: user festivals mapping table
    `CREATE TABLE IF NOT EXISTS user_festivals (
       user_id     VARCHAR(50) NOT NULL,
       festival_id INTEGER NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
       PRIMARY KEY (user_id, festival_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_user_festivals_user ON user_festivals(user_id)`,
    // Phase 26.3: Drop redundant user_id column from festivals table
    `ALTER TABLE festivals DROP COLUMN IF EXISTS user_id CASCADE`,
    // Phase 27: subscription start_date
    `ALTER TABLE finance_subscriptions ADD COLUMN IF NOT EXISTS start_date DATE`,
    // Phase 27.1: insurance table
    `CREATE TABLE IF NOT EXISTS finance_insurance (
       id            VARCHAR(50)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
       name          VARCHAR(200) NOT NULL,
       provider      VARCHAR(200),
       type          VARCHAR(50)  NOT NULL DEFAULT 'other',
       emoji         VARCHAR(10),
       amount        NUMERIC(10,2),
       currency      VARCHAR(5)   NOT NULL DEFAULT 'INR',
       billing_day   SMALLINT     CHECK (billing_day BETWEEN 1 AND 31),
       country       VARCHAR(10)  NOT NULL DEFAULT 'IN',
       policy_number VARCHAR(100),
       user_id       TEXT         NOT NULL DEFAULT ''
     )`,
    `CREATE INDEX IF NOT EXISTS idx_finance_insurance_user_id ON finance_insurance(user_id)`,
    `ALTER TABLE finance_insurance ADD COLUMN IF NOT EXISTS cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'`,
    // Phase 28: plan start_date and completed_date
    `ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS start_date DATE`,
    `ALTER TABLE learning_plans ADD COLUMN IF NOT EXISTS completed_date DATE`,
    // Phase 29: medication scheduling — days of week + food timing; `time` becomes free-form multi-slot text
    `ALTER TABLE medications DROP CONSTRAINT IF EXISTS medications_time_check`,
    `ALTER TABLE medications ALTER COLUMN time TYPE VARCHAR(60)`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS days_of_week SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}'`,
    `ALTER TABLE medications ADD COLUMN IF NOT EXISTS food_timing VARCHAR(20)`,
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medications_food_timing_check') THEN
         ALTER TABLE medications ADD CONSTRAINT medications_food_timing_check
           CHECK (food_timing IS NULL OR food_timing IN ('before_food','after_food','with_food'));
       END IF;
     END $$`,
    // Phase 30: emoji picker — loans & credit cards previously had no editable icon
    `ALTER TABLE finance_loans ADD COLUMN IF NOT EXISTS emoji VARCHAR(10)`,
    `ALTER TABLE finance_credit_cards ADD COLUMN IF NOT EXISTS emoji VARCHAR(10)`,
    // Phase 31: courses.id was widened 10->30 previously but never far enough for the
    // `c-${randomUUID()}` id pattern (38 chars) used by routes/courses.js and the plan
    // import route — every course insert has been failing with "value too long" since
    // that id scheme was introduced.
    `ALTER TABLE courses ALTER COLUMN id TYPE VARCHAR(50)`,
    // Phase 32: bills need yearly/quarterly cycles too (e.g. a prepaid mobile validity
    // that renews once a year on a specific date), not just a recurring day-of-month.
    `ALTER TABLE finance_bills ADD COLUMN IF NOT EXISTS cycle VARCHAR(20) NOT NULL DEFAULT 'monthly'`,
    `ALTER TABLE finance_bills ADD COLUMN IF NOT EXISTS start_date DATE`,
    // Phase 33: per-course timer/stopwatch — daily study-time log so hours spent
    // per course (and per day) can be tracked, separate from the session counter.
    `CREATE TABLE IF NOT EXISTS course_time_logs (
       id         VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
       course_id  VARCHAR(50) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
       log_date   DATE        NOT NULL,
       seconds    INTEGER     NOT NULL DEFAULT 0,
       user_id    TEXT        NOT NULL DEFAULT '',
       UNIQUE (course_id, user_id, log_date)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_course_time_logs_user_id ON course_time_logs(user_id)`,
    // Phase 34: insurance gets the same start_date anchor Bills got, so yearly/quarterly
    // premiums get a real next-due-date instead of just a recurring day-of-month.
    `ALTER TABLE finance_insurance ADD COLUMN IF NOT EXISTS start_date DATE`,
    // Phase 35: tasks can be grouped by project (free-text label) within Work/Personal
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project VARCHAR(100)`,
    // Phase 36: user pinned courses mapping table — mirrors user_pinned_festivals so
    // the Today dashboard can show user-chosen courses instead of guessing one.
    `CREATE TABLE IF NOT EXISTS user_pinned_courses (
       user_id    TEXT NOT NULL,
       course_id  VARCHAR(50) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       PRIMARY KEY (user_id, course_id)
     )`,
    `CREATE INDEX IF NOT EXISTS idx_user_pinned_courses_user ON user_pinned_courses(user_id)`
  ];

  // Track which of the statements above have already run, so each one
  // executes exactly once ever instead of being re-attempted (and, for
  // several of them, re-failing) on every single server boot.
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const { rows: appliedRows } = await db.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map(r => r.name));

  // A pre-existing database (this app's local/prod Postgres, already carrying
  // months of history from the old untracked runner) gets baselined: every
  // statement below is marked applied WITHOUT re-running it, since running
  // them again would immediately hit the exact "already converted"/"already
  // exists" failures that motivated adding this tracking table in the first
  // place. A genuinely fresh database (schema_migrations is empty AND the
  // `tasks` table doesn't exist yet) gets no such treatment — every statement
  // actually runs, in order, which is what bootstraps it from nothing.
  const { rows: taskTableRows } = await db.query(`SELECT to_regclass('public.tasks') AS reg`);
  const isFreshDatabase = taskTableRows[0].reg === null;
  const isBaselining = applied.size === 0 && !isFreshDatabase;
  if (isBaselining) {
    console.log(`[migrate] Baselining ${sqls.length} pre-existing migration statements as already applied (retrofitting tracking onto an existing database) — see the runMigrations() comment in server/index.js.`);
  }

  for (const sql of sqls) {
    const name = 'm_' + crypto.createHash('sha1').update(sql).digest('hex').slice(0, 16);
    if (applied.has(name)) continue;

    if (isBaselining) {
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
      continue;
    }

    try {
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    } catch (e) {
      // Deliberately not fatal — a single bad statement shouldn't take the
      // whole app down — but now loud instead of a truncated console.warn,
      // and not marked applied, so it retries (and keeps being visible) on
      // the next boot instead of silently vanishing either way.
      console.error('[migrate] FAILED, will retry next boot:', sql.trim().slice(0, 100).replace(/\s+/g, ' '), '\n ', e.message);
      Sentry.captureException(e);
    }
  }

  // Seed the consolidated festivals from JSON
  try {
    const seedPath = path.join(__dirname, 'seeds/festivals.json');
    if (fs.existsSync(seedPath)) {
      const rawData = fs.readFileSync(seedPath, 'utf8');
      const festivals = JSON.parse(rawData);
      console.log(`[migrate] Seeding ${festivals.length} consolidated festivals...`);
      
      const valuePlaceholders = [];
      const values = [];
      let pIdx = 1;
      for (const f of festivals) {
        valuePlaceholders.push(`($${pIdx}, $${pIdx+1}, $${pIdx+2}, $${pIdx+3}, $${pIdx+4}, $${pIdx+5}, $${pIdx+6}, $${pIdx+7})`);
        values.push(f.name, f.event_date, f.cat, f.emoji, f.action, f.reminder, f.calendar, f.description);
        pIdx += 8;
      }
      
      if (values.length > 0) {
        await db.query(
          `INSERT INTO festivals (name, event_date, cat, emoji, action, reminder, calendar, description)
           VALUES ${valuePlaceholders.join(',')}
           ON CONFLICT (name, event_date, calendar) DO NOTHING`,
          values
        );
      }
      console.log(`[migrate] ✓ consolidated festivals seeded`);
    } else {
      console.warn(`[migrate] Seed file not found at: ${seedPath}`);
    }
  } catch (e) {
    console.warn('[migrate] Failed to seed consolidated festivals:', e.message);
  }

  // VACUUM cannot run inside a transaction — call it separately after all migrations.
  try {
    await db.query('VACUUM ANALYZE courses, family_groups, habits, medications');
  } catch (e) {
    console.warn('[migrate] VACUUM ANALYZE skipped:', e.message.slice(0, 80));
  }
  console.log('[migrate] ✓ schema up to date');
}

const app = express();
// Behind Railway's edge proxy: without this every request appears to come from the
// proxy's IP, so the per-IP rate limiters (extract/courses) would share one bucket.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
const allowedOrigins = ['http://localhost:5177', 'http://localhost:4177'];
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(process.env.ALLOWED_ORIGIN);
}
if (process.env.APP_URL) {
  allowedOrigins.push(process.env.APP_URL.replace(/\/+$/, ''));
}
app.use(cors({ origin: allowedOrigins }));
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (obj) {
    if (res.statusCode === 500 && obj && obj.error) {
      console.error(`[500 Error] Path: ${req.path}, Message:`, obj.error);
      return originalJson.call(this, { error: 'Something went wrong' });
    }
    return originalJson.call(this, obj);
  };
  next();
});
app.use((req, res, next) => {
  if (req.path === '/api/extract' || req.path.startsWith('/api/extract/')) {
    express.json({ limit: '25mb' })(req, res, next);
  } else {
    express.json({ limit: '50kb' })(req, res, next);
  }
});

// External data (live APIs) — no auth required
app.use('/api/holidays',     holidaysRouter);
app.use('/api/f1',           f1Router);
app.use('/api/cricket',      cricketRouter);
app.use('/api/football',     footballRouter);
app.use('/api/nba',          nbaRouter);

// Serve the built frontend (vite build -> dist/) from the same origin as the API, so
// production needs one service and no CORS. Skipped when dist/ doesn't exist (dev mode
// runs Vite separately), in which case GET / keeps returning the JSON stub below.
const distDir = path.join(__dirname, '..', 'dist');
const serveFrontend = fs.existsSync(path.join(distDir, 'index.html'));
if (serveFrontend) {
  // Hashed asset filenames are safe to cache forever; index.html must always revalidate.
  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(distDir, { index: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));
}

app.get('/', (req, res, next) => {
  if (serveFrontend) return next();
  res.json({ ok: true, message: 'Orbitly API Server' });
});
app.get('/api/health', async (_, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ ok: true, db: 'up', ts: Date.now() });
  } catch (e) {
    console.error('[health] DB check failed:', e);
    Sentry.captureException(e);
    res.status(503).json({ ok: false, db: 'down', ts: Date.now() });
  }
});

// SPA fallback (must sit before requireAuth: page loads carry no token). Extensionless
// non-API GETs get index.html so client-side routes survive a refresh; any other
// non-API request (a missing asset, favicon, ...) is a plain 404, not a 401.
if (serveFrontend) {
  app.get(/^\/(?!api\/)[^.]*$/, (_, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
  app.use((req, res, next) => (req.path.startsWith('/api/') ? next() : res.status(404).type('text').send('Not found')));
}

// All routes below require authentication
app.use(requireAuth);

// DB-backed domain routes
app.use('/api/tasks',        tasksRouter);
app.use('/api/meds',         medsRouter);
app.use('/api/habits',       habitsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/shopping',     shoppingRouter);
app.use('/api/courses',      coursesRouter);
app.use('/api/plans',           learningPlansRouter);
app.use('/api/books',           booksRouter);
app.use('/api/learning-events', learningEventsRouter);
app.use('/api/course-time-logs', courseTimeLogsRouter);
app.use('/api/family',       familyRouter);
app.use('/api/finance',      financeRouter);
app.use('/api/festivals',    festivalsRouter);

app.use('/api/extract',      extractRouter);
app.use('/api/recipes',      recipesRouter);
app.use('/api/calendars',    calendarSubsRouter);
app.use('/api/sports',       sportsCatalogRouter);
app.use('/api/household',    householdRouter);
app.use('/api/billing',     billingRouter);
app.use('/api/profile',     profileRouter);

// Railway injects PORT; SERVER_PORT is the local-dev override from .env.
const PORT = process.env.SERVER_PORT || process.env.PORT || 3003;

function startServer() {
  app.listen(PORT, () => {
    console.log(`\n🌍 Orbitly API server → http://localhost:${PORT}`);
    console.log(`   F1 + Holidays: live (no key needed)`);
    console.log(`   Cricket:  ${process.env.CRICAPI_KEY ? '✓ key set' : '✗ add CRICAPI_KEY to .env'}`);
    console.log(`   Football: ${process.env.FOOTBALL_DATA_KEY ? '✓ key set' : '✗ add FOOTBALL_DATA_KEY to .env'}`);
    console.log(`   AI Extract: Ollama ${process.env.OLLAMA_VISION_MODEL || 'gemma3:4b'} → Gemini ${process.env.GEMINI_API_KEY ? '✓' : '(no key — Ollama only)'}\n`);
  });
}

runMigrations().then(startServer).catch(e => {
  console.error('[migrate] failed:', e.message);
  startServer();
});
