-- Orbitly — PostgreSQL Schema
-- Run order matters: referenced tables first.

-- ─── Tasks ──────────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id          VARCHAR(50)  PRIMARY KEY,
  title       VARCHAR(400) NOT NULL,
  list        VARCHAR(20)  NOT NULL CHECK (list IN ('work','personal')),
  priority    VARCHAR(20)  NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent','High','Normal','Low')),
  due         VARCHAR(60),
  status      VARCHAR(20)  NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','doing','done')),
  overdue     BOOLEAN      NOT NULL DEFAULT FALSE,
  recurring   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Medications ────────────────────────────────────────────────────────────────
CREATE TABLE medications (
  id          VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  dose        VARCHAR(200),
  time        VARCHAR(20)  CHECK (time IN ('Morning','Evening')),
  sort_order  SMALLINT     NOT NULL DEFAULT 0
);

-- Per-day check-off (one row per med per calendar date)
CREATE TABLE med_checkins (
  med_id      VARCHAR(50) NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  checkin_date DATE        NOT NULL,
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (med_id, checkin_date)
);

-- ─── Habits ─────────────────────────────────────────────────────────────────────
CREATE TABLE habits (
  id          VARCHAR(50)  PRIMARY KEY,
  label       VARCHAR(200) NOT NULL,
  icon        VARCHAR(10),
  sort_order  SMALLINT     NOT NULL DEFAULT 0
);

CREATE TABLE habit_checkins (
  habit_id    VARCHAR(50) NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  checkin_date DATE        NOT NULL,
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (habit_id, checkin_date)
);

-- ─── Appointments ───────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id          VARCHAR(50)  PRIMARY KEY,
  who         VARCHAR(100),
  type        VARCHAR(300),
  appt_date   VARCHAR(60),
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Shopping list ──────────────────────────────────────────────────────────────
CREATE TABLE shopping_items (
  id          VARCHAR(50)  PRIMARY KEY,
  item        VARCHAR(300) NOT NULL,
  done        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Learning courses ───────────────────────────────────────────────────────────
CREATE TABLE courses (
  id          VARCHAR(10)  PRIMARY KEY,
  name        VARCHAR(300) NOT NULL,
  phase       SMALLINT     NOT NULL,
  total       SMALLINT     NOT NULL,
  done        SMALLINT     NOT NULL DEFAULT 0,
  next        VARCHAR(60),
  next_iso    VARCHAR(10),
  sort_order  SMALLINT     NOT NULL DEFAULT 0
);

-- ─── Family ─────────────────────────────────────────────────────────────────────
CREATE TABLE family_groups (
  id    VARCHAR(50) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  side  VARCHAR(10)  NOT NULL CHECK (side IN ('sahmbi','virdi')),
  emoji VARCHAR(10)
);

CREATE TABLE family_members (
  id         VARCHAR(60)  PRIMARY KEY,
  real_name  VARCHAR(150) NOT NULL,
  pet_name   VARCHAR(150),
  side       VARCHAR(10)  NOT NULL CHECK (side IN ('sahmbi','virdi')),
  group_id   VARCHAR(50)  REFERENCES family_groups(id),
  relation   VARCHAR(150),
  bday_month SMALLINT     CHECK (bday_month BETWEEN 1 AND 12),
  bday_day   SMALLINT     CHECK (bday_day   BETWEEN 1 AND 31)
);

CREATE TABLE family_events (
  id          VARCHAR(60)  PRIMARY KEY,
  label       VARCHAR(300) NOT NULL,
  type        VARCHAR(20)  NOT NULL CHECK (type IN ('marriage','engagement','court')),
  side        VARCHAR(10)  NOT NULL,
  group_id    VARCHAR(50)  REFERENCES family_groups(id),
  event_month SMALLINT     NOT NULL CHECK (event_month BETWEEN 1 AND 12),
  event_day   SMALLINT     NOT NULL CHECK (event_day   BETWEEN 1 AND 31)
);

CREATE TABLE family_contacts (
  member_id  VARCHAR(60)  PRIMARY KEY REFERENCES family_members(id) ON DELETE CASCADE,
  phone      VARCHAR(40),
  email      VARCHAR(150),
  address    TEXT,
  instagram  VARCHAR(120),
  linkedin   VARCHAR(120),
  facebook   VARCHAR(120),
  workplace  VARCHAR(250)
);

-- ─── Finance ────────────────────────────────────────────────────────────────────
CREATE TABLE finance_subscriptions (
  id          VARCHAR(50)    PRIMARY KEY,
  name        VARCHAR(200)   NOT NULL,
  country     VARCHAR(10),
  cat         VARCHAR(50),
  emoji       VARCHAR(10),
  amount      NUMERIC(10,2),
  currency    VARCHAR(5),
  billing_day SMALLINT       CHECK (billing_day BETWEEN 1 AND 31),
  cycle       VARCHAR(20)    NOT NULL DEFAULT 'monthly'
);

CREATE TABLE finance_loans (
  id       VARCHAR(50)   PRIMARY KEY,
  name     VARCHAR(200)  NOT NULL,
  bank     VARCHAR(200),
  emi      NUMERIC(12,2),
  currency VARCHAR(5),
  due_day  SMALLINT      CHECK (due_day BETWEEN 1 AND 31)
);

CREATE TABLE finance_credit_cards (
  id            VARCHAR(50)  PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  bank          VARCHAR(200),
  statement_day SMALLINT     CHECK (statement_day BETWEEN 1 AND 31),
  due_day       SMALLINT     CHECK (due_day       BETWEEN 1 AND 31),
  currency      VARCHAR(5)
);

CREATE TABLE finance_bills (
  id             VARCHAR(50)  PRIMARY KEY,
  name           VARCHAR(200) NOT NULL,
  country        VARCHAR(10),
  type           VARCHAR(50),
  emoji          VARCHAR(10),
  generation_day SMALLINT     CHECK (generation_day BETWEEN 1 AND 31),
  due_day        SMALLINT     CHECK (due_day        BETWEEN 1 AND 31),
  amount         NUMERIC(10,2),
  currency       VARCHAR(5)
);

-- Tracks whether a finance item was paid in a given calendar month
CREATE TABLE finance_paid (
  item_type  VARCHAR(20)  NOT NULL CHECK (item_type IN ('subscription','loan','credit_card','bill')),
  item_id    VARCHAR(50)  NOT NULL,
  paid_month DATE         NOT NULL,  -- stored as first day of month e.g. 2026-06-01
  paid       BOOLEAN      NOT NULL DEFAULT FALSE,
  PRIMARY KEY (item_type, item_id, paid_month)
);

-- ─── Festivals & Sikh Calendar ──────────────────────────────────────────────────
CREATE TABLE festivals (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  event_date DATE         NOT NULL,
  cat        VARCHAR(30),
  emoji      VARCHAR(10),
  action     TEXT,
  reminder   VARCHAR(120)
);

CREATE TABLE sikh_events (
  id         SERIAL       PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  event_date DATE         NOT NULL,
  cat        VARCHAR(20)  CHECK (cat IN ('gurpurab','shahidi','cultural')),
  emoji      VARCHAR(10),
  description TEXT,
  reminder   VARCHAR(120)
);

-- ─── Sports ─────────────────────────────────────────────────────────────────────
CREATE TABLE f1_calendar (
  id      SERIAL       PRIMARY KEY,
  round   SMALLINT,
  gp      VARCHAR(200),
  circuit VARCHAR(200),
  race_date DATE,
  season  SMALLINT     NOT NULL DEFAULT 2026
);

CREATE TABLE f1_drivers (
  id     SERIAL      PRIMARY KEY,
  pos    SMALLINT,
  name   VARCHAR(120),
  team   VARCHAR(120),
  pts    SMALLINT,
  color  VARCHAR(20),
  season SMALLINT    NOT NULL DEFAULT 2026
);

CREATE TABLE cricket_matches (
  id         VARCHAR(20)  PRIMARY KEY,
  match      VARCHAR(200),
  series     VARCHAR(200),
  venue      VARCHAR(200),
  match_date DATE,
  status     VARCHAR(20)  CHECK (status IN ('live','upcoming','done')),
  score      VARCHAR(200)
);

CREATE TABLE football_fixtures (
  id         VARCHAR(20)  PRIMARY KEY,
  match      VARCHAR(200),
  stage      VARCHAR(200),
  teams      VARCHAR(200),
  match_date DATE,
  status     VARCHAR(20)  CHECK (status IN ('live','upcoming','done'))
);
