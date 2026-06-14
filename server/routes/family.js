import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ── Groups ──────────────────────────────────────────────────────────────────

router.get('/groups', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM family_groups ORDER BY side, label');
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
      'INSERT INTO family_groups (id, label, side, emoji) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, label, side, emoji]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/groups/:id', async (req, res) => {
  const { label, emoji } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE family_groups SET label=$1, emoji=$2 WHERE id=$3 RETURNING *',
      [label, emoji, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/groups/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM family_events WHERE group_id=$1', [req.params.id]);
    await db.query('DELETE FROM family_members WHERE group_id=$1', [req.params.id]);
    await db.query('DELETE FROM family_groups WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Members ──────────────────────────────────────────────────────────────────

router.get('/members', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT m.*, g.label AS group_label, g.side, g.emoji AS group_emoji
       FROM family_members m
       JOIN family_groups g ON g.id = m.group_id
       ORDER BY g.label, m.real_name`
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
      `INSERT INTO family_members (id, real_name, pet_name, side, group_id, relation, bday_month, bday_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, realName, petName || realName, side, groupId,
       relation || null, bdayMonth || null, bdayDay || null]
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
       WHERE id=$7 RETURNING *`,
      [realName, petName || realName, relation || null,
       groupId, bdayMonth || null, bdayDay || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/members/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM family_members WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Events ───────────────────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT e.*, g.label AS group_label
       FROM family_events e
       LEFT JOIN family_groups g ON g.id = e.group_id
       ORDER BY e.event_month, e.event_day`
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
      `INSERT INTO family_events (id, label, type, side, group_id, event_month, event_day)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, label, type, side, groupId, parseInt(month), parseInt(day)]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/events/:id', async (req, res) => {
  const { label, type, month, day } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE family_events SET label=$1, type=$2, event_month=$3, event_day=$4 WHERE id=$5 RETURNING *`,
      [label, type, parseInt(month), parseInt(day), req.params.id]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/events/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM family_events WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Contacts ─────────────────────────────────────────────────────────────────

router.get('/contacts/:memberId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM family_contacts WHERE member_id=$1', [req.params.memberId]
    );
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
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
         (member_id, phone, email, address, instagram, linkedin, facebook, workplace)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (member_id) DO UPDATE SET
         phone=EXCLUDED.phone, email=EXCLUDED.email, address=EXCLUDED.address,
         instagram=EXCLUDED.instagram, linkedin=EXCLUDED.linkedin,
         facebook=EXCLUDED.facebook, workplace=EXCLUDED.workplace
       RETURNING *`,
      [memberId, phone, email, address, instagram, linkedin, facebook, workplace]
    );
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── School Terms ─────────────────────────────────────────────────────────────

router.get('/school-terms', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM school_terms ORDER BY sort_order, id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/school-terms', async (req, res) => {
  const { label, date_display, date_start, color = '#6366f1', sort_order = 0 } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO school_terms (label, date_display, date_start, color, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [label, date_display || null, date_start || null, color, Number(sort_order)]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/school-terms/:id', async (req, res) => {
  const { label, date_display, date_start, color, sort_order } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE school_terms SET label=$1, date_display=$2, date_start=$3, color=$4, sort_order=$5 WHERE id=$6 RETURNING *`,
      [label, date_display || null, date_start || null, color || '#6366f1', Number(sort_order ?? 0), Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/school-terms/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM school_terms WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Moments ──────────────────────────────────────────────────────────────────

router.get('/moments', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM family_moments ORDER BY moment_date DESC, created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/moments', async (req, res) => {
  const { caption, emoji = '📸', moment_date, notes } = req.body;
  if (!caption) return res.status(400).json({ error: 'caption required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO family_moments (caption, emoji, moment_date, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [caption, emoji, moment_date || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/moments/:id', async (req, res) => {
  const { caption, emoji, moment_date, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE family_moments SET caption=$1, emoji=$2, moment_date=$3, notes=$4 WHERE id=$5 RETURNING *`,
      [caption, emoji || '📸', moment_date || null, notes || null, Number(req.params.id)]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/moments/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM family_moments WHERE id=$1', [Number(req.params.id)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
