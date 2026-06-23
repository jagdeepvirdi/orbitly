# Orbitly — Database & Architecture Review

**Conducted:** 2026-06-22  
**Scope:** All 29 active tables, all route files, auth flow, indexes, constraints, data state  
**Auditor:** DBA/Architect review via Claude Code

---

## Schema Overview

**29 active tables** across three logical scopes:

### User-scoped (personal data, keyed by `user_id`)
`appointments`, `books`, `courses`, `habits`, `habit_checkins`, `learning_events`, `learning_plans`, `med_checkins`, `medications`, `tasks`, `finance_bills`, `finance_credit_cards`, `finance_loans`, `finance_paid`, `finance_subscriptions`, `user_plans`, `user_calendars`, `user_sport_subscriptions`

### Household-scoped (shared family data, keyed by `household_id`)
`family_contacts`, `family_events`, `family_groups`, `family_members`, `family_moments`, `school_terms`, `shopping_items`, `household_invites`

### System (auth/membership)
`households`, `household_members`, `user_plans`

**Global/seed pattern:** `user_id = ''` rows queried with `WHERE user_id = $1 OR user_id = ''`. Currently only `festivals` uses this. Correct pattern — continue it for any future seed data.

---

## Authentication State

Clerk is active. Verified user: `user_3FUGeS5BNKv0VrA7RZcZBCLMs5e` maps correctly to household `a226cad1-222b-4232-9c74-50781cd46eb2`.

**All personal data is correctly migrated to the Clerk user ID:**

| Table | Rows | Status |
|-------|------|--------|
| courses | 32 | ✅ Correct user_id |
| learning_plans | 3 | ✅ Correct user_id |
| medications | 6 | ✅ Correct user_id |
| habits | 3 | ✅ Correct user_id |
| appointments | 3 | ✅ Correct user_id |
| finance_subscriptions | 1 | ✅ Correct user_id |

**All household data is in the correct household (`a226cad1-...`):**

| Table | Rows | Status |
|-------|------|--------|
| family_members | 103 | ✅ |
| family_groups | 34 | ✅ |
| family_events | 29 | ✅ |
| school_terms | 4 | ✅ |
| shopping_items | 6 | ✅ |

**Stale household exists:** `jagdeep` user → household `5ed053fa-8250-4429-899a-24f576fc9ed5` — empty, no data. Two orphaned rows in `households` and `household_members`. Safe to delete but not urgent.

**App bootstrap flow is correct:** `ClerkBridge` (sets token getter) → `AppDataLoader` (fires useEffect) are siblings inside `ClerkAuthGuard`. React runs sibling useEffects top-to-bottom, so auth token is available before data fetching begins. Previous race condition is resolved.

---

## Critical Issues (User-Visible Gaps)

### 1. `tasks` table has 0 rows
Tasks were localStorage-only and were never seeded or migrated to the database. The UI currently shows nothing in the Tasks section when the DB is authoritative. This is the most visible user-facing gap.

### 2. `tasks.due` is VARCHAR storing human-readable strings
The column stores values like `"Yesterday"`, `"Tomorrow"`, `"Jun 14"` — not ISO dates. This means no SQL date arithmetic, no accurate overdue detection at the DB layer, and no useful ordering. When tasks are eventually added, this needs to be fixed. Recommend migrating to `DATE` type and computing display strings in the API layer.

### 3. `appointments.appt_date` is VARCHAR
Same problem as `tasks.due` — stores display strings instead of ISO dates. Cannot sort appointments by date at the DB level. When the appointment list grows, ordering becomes unreliable.

### 4. `medications.end_date` column does not exist
Phase 22.1 requires start and end dates on medications. `start_date` exists (as VARCHAR) but `end_date` is missing entirely.

```sql
ALTER TABLE medications ADD COLUMN end_date VARCHAR;
```

This must be done before Phase 22 work begins.

### 5. `family_contacts` has 0 rows
103 family members exist but no contact details have been saved. The contact CRUD route is fully implemented and correct. This is a data gap, not a code bug.

---

## Route-Level Security Issues

### 6. `festivals` route — `requireAuth` not applied in the file itself
`server/routes/festivals.js` accesses `req.userId` but mounts no `requireAuth` middleware within the file. If `server/index.js` applies `requireAuth` globally before mounting all routes, this is fine. If it is applied per-router only, the festivals route is unprotected — user-specific custom festivals would fail silently, only global (`user_id = ''`) rows would return. Verify in `server/index.js`.

### 7. Family DELETE and PUT routes do not check `household_id` ownership

All of the following mutations accept an ID parameter but do not verify the record belongs to `req.householdId`:

| Route | Query | Risk |
|-------|-------|------|
| `DELETE /family/groups/:id` | `DELETE FROM family_groups WHERE id=$1` | Any user knowing the ID can delete another household's group |
| `DELETE /family/members/:id` | `DELETE FROM family_members WHERE id=$1` | Same |
| `DELETE /family/events/:id` | `DELETE FROM family_events WHERE id=$1` | Same |
| `PUT /family/events/:id` | `UPDATE family_events ... WHERE id=$5` | Same |
| `DELETE /family/moments/:id` | `DELETE FROM family_moments WHERE id=$1` | Same |
| `PUT /family/moments/:id` | `UPDATE family_moments ... WHERE id=$5` | Same |
| `DELETE /family/school-terms/:id` | `DELETE FROM school_terms WHERE id=$1` | Same |

**Fix pattern for all of the above:**
```sql
-- Before:
DELETE FROM family_groups WHERE id=$1

-- After:
DELETE FROM family_groups WHERE id=$1 AND household_id=$2
-- Pass req.householdId as $2
```

### 8. `DELETE /family/groups/:id` is not transactional
The route deletes events, then members, then the group across three separate queries with no transaction wrapper. A crash between any two leaves the DB in a partially deleted state.

```js
// Wrap in a transaction:
await db.query('BEGIN');
try {
  await db.query('DELETE FROM family_events WHERE group_id=$1', [id]);
  await db.query('DELETE FROM family_members WHERE group_id=$1', [id]);
  await db.query('DELETE FROM family_groups WHERE id=$1', [id]);
  await db.query('COMMIT');
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
}
```

---

## Schema Consistency Issues

### 9. Mixed ID generation strategies
Three different patterns are used across tables with no clear rule:

| Pattern | Tables |
|---------|--------|
| `gen_random_uuid()` as TEXT | appointments, finance_*, medications, shopping_items, household_invites |
| SERIAL integer | books, family_moments, learning_events, learning_plans, school_terms |
| Application-generated text | courses, family_contacts, family_events, family_groups, family_members, habits |

Not a bug, but makes cross-table reasoning harder. **Recommendation:** standardize all new tables on `gen_random_uuid()`.

### 10. Missing FK constraints on all `household_id` columns
None of the following columns have a foreign key to `households.id`:

- `family_contacts.household_id`
- `family_events.household_id`
- `family_groups.household_id`
- `family_members.household_id`
- `school_terms.household_id`
- `shopping_items.household_id`

A typo or bug in household ID assignment creates silently orphaned rows with no DB-level enforcement.

```sql
ALTER TABLE family_members ADD CONSTRAINT fk_family_members_household
  FOREIGN KEY (household_id) REFERENCES households(id);
-- Repeat for each table above
```

### 11. Inconsistent ON DELETE behavior: `books` vs `courses` FK to `learning_plans`

| Table | FK column | ON DELETE |
|-------|-----------|-----------|
| `books` | `plan_id → learning_plans.id` | CASCADE |
| `courses` | `plan_id → learning_plans.id` | SET NULL |

Deleting a learning plan cascades and deletes books, but keeps courses as orphans with `plan_id = NULL`. Courses are the core content of a plan — both should be `CASCADE`.

```sql
ALTER TABLE courses DROP CONSTRAINT courses_plan_id_fkey;
ALTER TABLE courses ADD CONSTRAINT courses_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE;
```

### 12. `family_events.group_id` and `family_members.group_id` FKs are NO ACTION
If a group is deleted outside the API (direct DB access, future admin tool), events and members retain dangling `group_id` references. The API manually cascades in code, but this is fragile. Should be `ON DELETE CASCADE`.

```sql
ALTER TABLE family_events DROP CONSTRAINT family_events_group_id_fkey;
ALTER TABLE family_events ADD CONSTRAINT family_events_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;

ALTER TABLE family_members DROP CONSTRAINT family_members_group_id_fkey;
ALTER TABLE family_members ADD CONSTRAINT family_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;
```

### 13. `medications.who` defaults to hardcoded `'Jagdeep'`
With Clerk auth and potential multi-user support, this hardcoded default is wrong. Should be `NULL` and set explicitly from the request.

```sql
ALTER TABLE medications ALTER COLUMN who SET DEFAULT NULL;
```

### 14. VARCHAR date columns: `courses.next_iso`, `learning_events.event_date`
These store ISO date strings, not `DATE` type. ISO-format text comparisons (`<`, `>`, `BETWEEN`) work correctly in Postgres because the strings sort lexicographically, but it is fragile and prevents use of date functions. Not urgent since values are always valid ISO strings — document and convert in a future migration.

---

## Index Analysis

### Well-indexed
Every `user_id` column has a btree index. Every `household_id` column has a btree index. The `festivals` table has three indexes (`user_id`, `calendar`, `event_date`) — appropriate given multi-filter query patterns.

### Redundant index
`household_members` has both:
- `household_members_user_id_key` — UNIQUE constraint (implicitly an index)
- `idx_household_members_user_id` — explicit btree index

The unique constraint already serves as an index. Drop the redundant one:

```sql
DROP INDEX idx_household_members_user_id;
```

### Missing composite index on `courses(user_id, plan_id)`
Courses are almost always queried as `WHERE user_id = $1` or `WHERE user_id = $1 AND plan_id = $2`. A composite index serves both:

```sql
CREATE INDEX idx_courses_user_plan ON courses(user_id, plan_id);
```

With 32 rows this is trivial now but matters at scale.

### Dead row bloat — run VACUUM ANALYZE

| Table | Live | Dead |
|-------|------|------|
| courses | 32 | 45 |
| family_groups | 34 | 39 |
| medications | 6 | 16 |
| habits | 3 | 6 |

The autovacuum threshold (20% + 50 rows) has not triggered because absolute row counts are low. Run manually:

```sql
VACUUM ANALYZE courses, family_groups, habits, medications;
```

---

## Missing Tables (Phase 22 Prerequisites)

### No `user_profiles` table
Phase 22.4 requires gender-gating the cycle tracker. There is nowhere to store `gender`, `show_cycle_to_partner`, or per-user preferences beyond what Clerk holds.

```sql
CREATE TABLE user_profiles (
  user_id       TEXT PRIMARY KEY,
  gender        TEXT,
  prefs         JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

### No `cycle_tracker` / `period_logs` table
Phase 22.4 period tracking requires storing cycle start dates, predicted fertile windows, and period length history. The health section currently has no DB backing for cycle data.

```sql
CREATE TABLE cycle_logs (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL DEFAULT '',
  period_start  DATE NOT NULL,
  period_end    DATE,
  cycle_length  SMALLINT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cycle_logs_user_id ON cycle_logs(user_id);
CREATE INDEX idx_cycle_logs_start ON cycle_logs(period_start);
```

---

## Data Gaps Summary

| Table | Live Rows | Reason |
|-------|-----------|--------|
| tasks | 0 | Never populated from localStorage |
| books | 0 | No data entered |
| family_contacts | 0 | Members exist but no contact info saved |
| finance_bills | 0 | Finance section not yet used |
| finance_credit_cards | 0 | Finance section not yet used |
| finance_loans | 0 | Finance section not yet used |
| finance_paid | 0 | Finance section not yet used |
| learning_events | 0 | Webinars/certs not entered |
| user_plans | 0 | Billing not enabled |
| user_calendars | 0 | No calendar subscriptions active |
| user_sport_subscriptions | 0 | Sport preferences not saved |

---

## Recommended Action Priority

### Before Phase 22 begins — schema prep (DB changes required)

```sql
-- 1. Add end_date to medications (unblocks 22.1)
ALTER TABLE medications ADD COLUMN end_date VARCHAR;

-- 2. Create user_profiles (unblocks 22.4 gender-gating)
CREATE TABLE user_profiles (
  user_id    TEXT PRIMARY KEY,
  gender     TEXT,
  prefs      JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create cycle_logs (unblocks 22.4 period tracker)
CREATE TABLE cycle_logs (
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

### Route hardening — security (no schema change needed)

1. Verify `requireAuth` is applied to the festivals router in `server/index.js`
2. Add `AND household_id = $N` check to all family DELETE/PUT mutations (7 routes affected — see section above)
3. Wrap `DELETE /family/groups/:id` in a `BEGIN / COMMIT` transaction block

### Tech debt — schedule for a cleanup sprint

```sql
-- Drop redundant index
DROP INDEX idx_household_members_user_id;

-- Add composite index on courses
CREATE INDEX idx_courses_user_plan ON courses(user_id, plan_id);

-- Clear dead rows
VACUUM ANALYZE courses, family_groups, habits, medications;

-- Fix courses ON DELETE to match books
ALTER TABLE courses DROP CONSTRAINT courses_plan_id_fkey;
ALTER TABLE courses ADD CONSTRAINT courses_plan_id_fkey
  FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE;

-- Add cascade to family group children
ALTER TABLE family_events DROP CONSTRAINT family_events_group_id_fkey;
ALTER TABLE family_events ADD CONSTRAINT family_events_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;

ALTER TABLE family_members DROP CONSTRAINT family_members_group_id_fkey;
ALTER TABLE family_members ADD CONSTRAINT family_members_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES family_groups(id) ON DELETE CASCADE;

-- Fix medications.who default
ALTER TABLE medications ALTER COLUMN who SET DEFAULT NULL;

-- Add FK constraints on household_id columns
ALTER TABLE family_members  ADD CONSTRAINT fk_fm_household  FOREIGN KEY (household_id) REFERENCES households(id);
ALTER TABLE family_groups   ADD CONSTRAINT fk_fg_household  FOREIGN KEY (household_id) REFERENCES households(id);
ALTER TABLE family_events   ADD CONSTRAINT fk_fe_household  FOREIGN KEY (household_id) REFERENCES households(id);
ALTER TABLE family_contacts ADD CONSTRAINT fk_fc_household  FOREIGN KEY (household_id) REFERENCES households(id);
ALTER TABLE school_terms    ADD CONSTRAINT fk_st_household  FOREIGN KEY (household_id) REFERENCES households(id);
ALTER TABLE shopping_items  ADD CONSTRAINT fk_si_household  FOREIGN KEY (household_id) REFERENCES households(id);

-- Clean up stale dev household
DELETE FROM household_members WHERE user_id = 'jagdeep';
DELETE FROM households WHERE created_by = 'jagdeep';
```

### Longer-term — schema migrations (higher risk, require data migration)

```sql
-- tasks.due: VARCHAR → DATE
-- Requires reading all existing rows, parsing display strings to dates, rewriting column
-- appointments.appt_date: VARCHAR → DATE — same approach
-- medications.start_date: VARCHAR → DATE
-- courses.next_iso: VARCHAR → DATE
-- learning_events.event_date: VARCHAR → DATE
```

Do these as a coordinated migration with matching API/frontend changes. Do not do them piecemeal.

---

## Overall Assessment

The schema is structurally sound for a single-household personal life app. The unified `festivals` table, correct Clerk user ID migration, and `AppDataLoader` auth fix are all working correctly. Data is intact and correctly scoped to the Clerk user.

**Biggest risks:**
1. **Route-level missing `household_id` ownership checks** on mutations — a real multi-tenant security gap, even at household scale. Fix before inviting any second user into the household.
2. **Empty `tasks` table** — the most visible user-facing data gap. Tasks need to be seeded or re-entered.

Everything else is tech debt that can be scheduled without blocking current feature work.
