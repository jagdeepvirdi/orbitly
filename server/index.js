import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db.js';
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
import familyRouter      from './routes/family.js';
import financeRouter     from './routes/finance.js';
import festivalsRouter   from './routes/festivals.js';
import extractRouter     from './routes/extract.js';

// Add missing columns that older schema installs don't have yet
async function runMigrations() {
  const sqls = [
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
    // Add unique constraint so festival re-seeding is idempotent
    `DO $$ BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'festivals_name_date_unique'
       ) THEN
         ALTER TABLE festivals ADD CONSTRAINT festivals_name_date_unique UNIQUE (name, event_date);
       END IF;
     END $$`,
    // Seed missing Indian/Thai festivals
    `INSERT INTO festivals (name, event_date, cat, emoji, action, reminder) VALUES
      ('Diwali',              '2026-10-20', 'indian',  '🪔',  'Prepare diyas & sweets',        '2 weeks before'),
      ('Dussehra',            '2026-10-24', 'indian',  '🏹',  'Arrange Ramlila viewing',        '1 week before'),
      ('Janmashtami',         '2026-08-16', 'indian',  '🙏',  'Fast & temple visit',            '3 days before'),
      ('Ganesh Chaturthi',    '2026-08-19', 'indian',  '🐘',  'Bring Ganesh idol home',         '1 week before'),
      ('Holi',                '2026-03-14', 'indian',  '🎨',  'Buy colours & plan gathering',   '3 days before'),
      ('Baisakhi',            '2026-04-14', 'indian',  '🌾',  'Celebrate harvest festival',     '3 days before'),
      ('Guru Nanak Jayanti',  '2026-11-05', 'indian',  '✨',  'Visit Gurudwara for Gurpurab',   '1 week before'),
      ('Eid ul-Fitr (approx)','2026-03-30', 'indian',  '☪️', 'Send Eid wishes & sweets',       '3 days before'),
      ('Lohri',               '2026-01-13', 'indian',  '🔥',  'Arrange bonfire & gachak',       '3 days before'),
      ('Songkran',            '2026-04-13', 'thai',    '💦',  'Thai New Year celebrations',     '3 days before'),
      ('Loy Krathong',        '2026-11-02', 'thai',    '🏮',  'Float krathong, watch fireworks','3 days before'),
      ('Diwali',              '2027-11-09', 'indian',  '🪔',  'Prepare diyas & sweets',        '2 weeks before'),
      ('Holi',                '2027-03-03', 'indian',  '🎨',  'Buy colours & plan gathering',   '3 days before'),
      ('Lohri',               '2027-01-13', 'indian',  '🔥',  'Arrange bonfire & gachak',       '3 days before'),
      ('Songkran',            '2027-04-13', 'thai',    '💦',  'Thai New Year celebrations',     '3 days before')
     ON CONFLICT (name, event_date) DO NOTHING`,
  ];
  for (const sql of sqls) {
    try { await db.query(sql); } catch (e) { console.warn('[migrate]', e.message.slice(0, 80)); }
  }
  console.log('[migrate] ✓ schema up to date');
}

const app = express();
app.use(cors({ origin: ['http://localhost:5177', 'http://localhost:4177'] }));
app.use(express.json({ limit: '25mb' }));

// External data (live APIs)
app.use('/api/holidays',     holidaysRouter);
app.use('/api/f1',           f1Router);
app.use('/api/cricket',      cricketRouter);
app.use('/api/football',     footballRouter);

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
app.use('/api/family',       familyRouter);
app.use('/api/finance',      financeRouter);
app.use('/api/festivals',    festivalsRouter);

app.use('/api/extract',      extractRouter);

app.get('/api/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

const PORT = process.env.SERVER_PORT || 3003;

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
