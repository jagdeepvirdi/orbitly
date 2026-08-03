import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM learning_plans WHERE user_id = $1 ORDER BY id',
      [req.userId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  const { title, description, type = 'certification', color = '#6366f1', icon = '📚',
          exam_date, est_completion, start_date, completed_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    const { rows } = await db.query(
      `INSERT INTO learning_plans (title, description, type, color, icon, exam_date, est_completion, start_date, completed_date, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [title, description || null, type, color, icon,
       exam_date || null, est_completion || null,
       start_date || null, completed_date || null, req.userId]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  const allowed = ['title', 'description', 'type', 'color', 'icon', 'exam_date', 'est_completion',
                   'start_date', 'completed_date',
                   'cert_name', 'cert_issued', 'cert_expires', 'cert_url', 'cert_number', 'cert_issuer', 'passed'];
  const updates = allowed.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  const set  = updates.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const vals = updates.map(f => req.body[f]);
  try {
    const { rows } = await db.query(
      `UPDATE learning_plans SET ${set} WHERE id = $1 AND user_id = $2 RETURNING *`,
      [Number(req.params.id), req.userId, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Import preset ────────────────────────────────────────────────────────────
// Accepts { plan: { title, ... }, courses: [{ key, name, phase, ... }] }
// Always creates a new plan (no duplicate check — user can import the same
// template multiple times and rename them independently).
router.post('/import', async (req, res) => {
  const { plan } = req.body;
  const courseList = req.body.courses || plan?.courses || [];
  if (!plan?.title) return res.status(400).json({ error: 'plan.title required' });

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const { rows: [newPlan] } = await client.query(
      `INSERT INTO learning_plans
         (title, description, type, color, icon, exam_date, est_completion, cert_name, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [plan.title, plan.description || null, plan.type || 'certification',
       plan.color || '#6366f1', plan.icon || '📚',
       plan.exam_date || null, plan.est_completion || null,
       plan.cert_name || null, req.userId]
    );

    for (const c of courseList) {
      await client.query(
        `INSERT INTO courses
           (id, name, phase, total, done, next, next_iso, sort_order, url, plan_id, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [`c-${randomUUID()}`, c.name, c.phase ?? 0, c.total ?? 1, c.done ?? 0,
         c.next || null, c.next_iso || null, c.sort_order ?? 0,
         c.url || '', newPlan.id, req.userId]
      );
    }

    await client.query('COMMIT');
    res.json({ ok: true, plan: newPlan, courses: courseList.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.query('UPDATE courses SET plan_id = NULL WHERE plan_id = $1', [id]);
    await db.query('DELETE FROM learning_plans WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
