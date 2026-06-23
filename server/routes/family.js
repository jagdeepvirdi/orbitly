import { Router } from 'express';
import db from '../db.js';
import requireHousehold from '../middleware/requireHousehold.js';

const router = Router();
router.use(requireHousehold);

// ── Groups ──────────────────────────────────────────────────────────────────

router.get('/groups', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM family_groups WHERE household_id = $1 ORDER BY side, label',
      [req.householdId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/groups', async (req, res) => {
  const { label, side = 'custom', emoji = '👥' } = req.body;
  const id = (side + '-' + label).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now();
  try {
    const { rows } = await db.query(
      'INSERT INTO family_groups (id, label, side, emoji, household_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, label, side, emoji, req.householdId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/groups/:id', async (req, res) => {
  const { label, emoji } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE family_groups SET label=$1, emoji=$2 WHERE id=$3 AND household_id=$4 RETURNING *',
      [label, emoji, req.params.id, req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/groups/:id', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM family_events WHERE group_id=$1 AND household_id=$2',
      [req.params.id, req.householdId]
    );
    await client.query(
      'DELETE FROM family_members WHERE group_id=$1 AND household_id=$2',
      [req.params.id, req.householdId]
    );
    await client.query(
      'DELETE FROM family_groups WHERE id=$1 AND household_id=$2',
      [req.params.id, req.householdId]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
});

// ── Members ──────────────────────────────────────────────────────────────────

router.get('/members', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, g.label AS group_label, g.side, g.emoji AS group_emoji
       FROM family_members m
       JOIN family_groups g ON g.id = m.group_id
       WHERE m.household_id = $1
       ORDER BY g.label, m.real_name`,
      [req.householdId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/members', async (req, res) => {
  const { realName, petName, relation, groupId, bdayMonth, bdayDay } = req.body;
  const grpRes = await db.query('SELECT side FROM family_groups WHERE id=$1', [groupId]);
  const side = grpRes.rows[0]?.side || 'custom';
  const id = (groupId + '-' + (petName || realName)).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now();
  try {
    const { rows } = await db.query(
      `INSERT INTO family_members (id, real_name, pet_name, side, group_id, relation, bday_month, bday_day, household_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, realName, petName || realName, side, groupId,
       relation || null, bdayMonth || null, bdayDay || null, req.householdId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/members/:id', async (req, res) => {
  const { realName, petName, relation, groupId, bdayMonth, bdayDay } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE family_members
       SET real_name=$1, pet_name=$2, relation=$3, group_id=$4, bday_month=$5, bday_day=$6
       WHERE id=$7 AND household_id=$8 RETURNING *`,
      [realName, petName || realName, relation || null,
       groupId, bdayMonth || null, bdayDay || null, req.params.id, req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/members/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM family_members WHERE id=$1 AND household_id=$2',
      [req.params.id, req.householdId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// ── Events ───────────────────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, g.label AS group_label
       FROM family_events e
       LEFT JOIN family_groups g ON g.id = e.group_id
       WHERE e.household_id = $1
       ORDER BY e.event_month, e.event_day`,
      [req.householdId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/events', async (req, res) => {
  const { label, type = 'marriage', groupId, month, day } = req.body;
  const grpRes = await db.query('SELECT side FROM family_groups WHERE id=$1', [groupId]);
  const side = grpRes.rows[0]?.side || 'custom';
  const id = (groupId + '-ev').toLowerCase() + '-' + Date.now();
  try {
    const { rows } = await db.query(
      `INSERT INTO family_events (id, label, type, side, group_id, event_month, event_day, household_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, label, type, side, groupId, parseInt(month), parseInt(day), req.householdId]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/events/:id', async (req, res) => {
  const { label, type, month, day } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE family_events SET label=$1, type=$2, event_month=$3, event_day=$4
       WHERE id=$5 AND household_id=$6 RETURNING *`,
      [label, type, parseInt(month), parseInt(day), req.params.id, req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM family_events WHERE id=$1 AND household_id=$2',
      [req.params.id, req.householdId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// ── Contacts ─────────────────────────────────────────────────────────────────

router.get('/contacts/:memberId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT fc.* FROM family_contacts fc WHERE fc.member_id=$1 AND fc.household_id=$2',
      [req.params.memberId, req.householdId]
    );
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.put('/contacts/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const {
    phone = null, email = null, address = null,
    instagram = null, linkedin = null, facebook = null, workplace = null
  } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO family_contacts
         (member_id, household_id, phone, email, address, instagram, linkedin, facebook, workplace)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (member_id) DO UPDATE SET
         household_id=EXCLUDED.household_id,
         phone=EXCLUDED.phone, email=EXCLUDED.email, address=EXCLUDED.address,
         instagram=EXCLUDED.instagram, linkedin=EXCLUDED.linkedin,
         facebook=EXCLUDED.facebook, workplace=EXCLUDED.workplace
       RETURNING *`,
      [memberId, req.householdId, phone, email, address, instagram, linkedin, facebook, workplace]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── School Terms ─────────────────────────────────────────────────────────────

router.get('/school-terms', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM school_terms WHERE household_id = $1 ORDER BY sort_order, id',
      [req.householdId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/school-terms', async (req, res) => {
  const { label, date_display, date_start, color = '#6366f1', sort_order = 0 } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO school_terms (label, date_display, date_start, color, sort_order, household_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [label, date_display || null, date_start || null, color, Number(sort_order), req.householdId]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/school-terms/:id', async (req, res) => {
  const { label, date_display, date_start, color, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE school_terms SET label=$1, date_display=$2, date_start=$3, color=$4, sort_order=$5
       WHERE id=$6 AND household_id=$7 RETURNING *`,
      [label, date_display || null, date_start || null, color || '#6366f1',
       Number(sort_order ?? 0), Number(req.params.id), req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/school-terms/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM school_terms WHERE id=$1 AND household_id=$2',
      [Number(req.params.id), req.householdId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// ── Moments ──────────────────────────────────────────────────────────────────

router.get('/moments', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM family_moments WHERE household_id = $1 ORDER BY moment_date DESC, created_at DESC',
      [req.householdId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/moments', async (req, res) => {
  const { caption, emoji = '📸', moment_date, notes } = req.body;
  if (!caption) return res.status(400).json({ error: 'caption required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO family_moments (caption, emoji, moment_date, notes, household_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [caption, emoji, moment_date || null, notes || null, req.householdId]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/moments/:id', async (req, res) => {
  const { caption, emoji, moment_date, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE family_moments SET caption=$1, emoji=$2, moment_date=$3, notes=$4
       WHERE id=$5 AND household_id=$6 RETURNING *`,
      [caption, emoji || '📸', moment_date || null, notes || null,
       Number(req.params.id), req.householdId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

router.delete('/moments/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM family_moments WHERE id=$1 AND household_id=$2',
      [Number(req.params.id), req.householdId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Something went wrong' }); }
});

// ── Import preset ────────────────────────────────────────────────────────────
// Accepts { groups: [{ key, label, side, emoji, members: [...], events: [...] }] }
// IDs are prefixed with the first 8 chars of household_id to keep them
// unique per household while staying idempotent on re-import.
router.post('/import', async (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups) || groups.length === 0)
    return res.status(400).json({ error: 'groups array required' });

  const prefix = req.householdId.slice(0, 8);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let gc = 0, mc = 0, ec = 0;

    for (const g of groups) {
      const gid = `${prefix}-${g.key}`.slice(0, 50);
      await client.query(
        `INSERT INTO family_groups (id, label, side, emoji, household_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET label=$2, emoji=$4`,
        [gid, g.label, g.side || 'custom', g.emoji || '👥', req.householdId]
      );
      gc++;

      for (const m of (g.members || [])) {
        const mid = `${prefix}-${m.key}`.slice(0, 60);
        await client.query(
          `INSERT INTO family_members
             (id, real_name, pet_name, relation, side, bday_month, bday_day, group_id, household_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE
             SET real_name=$2, pet_name=$3, relation=$4, bday_month=$6, bday_day=$7`,
          [mid, m.real_name, m.pet_name || null, m.relation || null,
           g.side || 'custom', m.bday_month || null, m.bday_day || null,
           gid, req.householdId]
        );
        mc++;
      }

      for (const e of (g.events || [])) {
        const eid = `${prefix}-${e.key}`.slice(0, 60);
        await client.query(
          `INSERT INTO family_events
             (id, label, type, side, event_month, event_day, group_id, household_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE
             SET label=$2, type=$3, event_month=$5, event_day=$6`,
          [eid, e.label, e.type, e.side || g.side || 'custom',
           e.event_month, e.event_day, gid, req.householdId]
        );
        ec++;
      }
    }

    await client.query('COMMIT');
    res.json({ ok: true, groups: gc, members: mc, events: ec });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
